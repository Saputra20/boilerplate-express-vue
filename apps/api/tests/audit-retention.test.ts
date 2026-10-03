import {
  AUDIT_RETENTION_BATCH_SIZE,
  AUDIT_RETENTION_RUN_LIMIT_MS,
  createAuditRetentionService,
  subtractOneCalendarYear,
  type AuditRetentionExecutor,
  type AuditRetentionLogger,
  type AuditRetentionRepository,
} from '../src/modules/audit/services/audit-retention.service.js';
import {
  AUDIT_RETENTION_JOB_OPTIONS,
  AUDIT_RETENTION_JOB_NAME,
  AUDIT_RETENTION_REPEAT_OPTIONS,
  AUDIT_RETENTION_SCHEDULER_ID,
  createAuditRetentionScheduler,
} from '../src/modules/audit/services/audit-retention.scheduler.js';

type FakeClock = {
  now(): Date;
  advance(milliseconds: number): void;
};

function createFakeClock(start: string): FakeClock {
  let current = new Date(start).getTime();
  return {
    now: () => new Date(current),
    advance: (milliseconds) => {
      current += milliseconds;
    },
  };
}

class MemoryRetentionRepository implements AuditRetentionRepository {
  executor: AuditRetentionExecutor = {
    deleteAuditEvents: async (cutoff, limit, timeoutMs) =>
      this.delete('audit', cutoff, limit, timeoutMs),
    deleteAuthAuditEvents: async (cutoff, limit, timeoutMs) =>
      this.delete('auth', cutoff, limit, timeoutMs),
  };
  calls: Array<{ table: 'audit' | 'auth'; cutoff: Date; limit: number; timeoutMs: number }> = [];
  batches: Record<'audit' | 'auth', number[]> = { audit: [], auth: [] };
  lockHeld = false;
  failTable: 'audit' | 'auth' | undefined;
  private readonly remaining: Record<'audit' | 'auth', number> = { audit: 0, auth: 0 };

  setRows(table: 'audit' | 'auth', count: number): void {
    this.remaining[table] = count;
  }

  async withLock<T>(
    work: (executor: AuditRetentionExecutor) => Promise<T>,
  ): Promise<T | undefined> {
    if (this.lockHeld) return undefined;
    this.lockHeld = true;
    try {
      return await work(this.executor);
    } finally {
      this.lockHeld = false;
    }
  }

  private async delete(
    table: 'audit' | 'auth',
    cutoff: Date,
    limit: number,
    timeoutMs: number,
  ): Promise<number> {
    if (this.failTable === table) throw new Error('synthetic database failure');
    const count = Math.min(this.remaining[table], limit);
    this.remaining[table] -= count;
    this.calls.push({ table, cutoff, limit, timeoutMs });
    if (count > 0) this.batches[table].push(count);
    return count;
  }
}

class MemoryRetentionLogger implements AuditRetentionLogger {
  errors: Array<{ fields: Record<string, unknown>; message: string }> = [];

  error(fields: Record<string, unknown>, message: string): void {
    this.errors.push({ fields, message });
  }
}

describe('audit retention service', () => {
  it('calculates one calendar year and keeps strict cutoff equality', () => {
    const now = new Date('2024-02-29T12:34:56.789Z');
    expect(subtractOneCalendarYear(now)).toEqual(new Date('2023-02-28T12:34:56.789Z'));
  });

  it('purges both tables in oldest-first batches', async () => {
    const clock = createFakeClock('2026-10-03T00:00:00.000Z');
    const repository = new MemoryRetentionRepository();
    repository.setRows('audit', AUDIT_RETENTION_BATCH_SIZE + 1);
    repository.setRows('auth', 2);
    const service = createAuditRetentionService(repository, new MemoryRetentionLogger(), {
      now: clock.now,
    });

    await expect(service.run()).resolves.toMatchObject({
      status: 'completed',
      auditEventsDeleted: AUDIT_RETENTION_BATCH_SIZE + 1,
      authAuditEventsDeleted: 2,
      cutoff: new Date('2025-10-03T00:00:00.000Z'),
    });
    expect(repository.batches).toEqual({ audit: [1000, 1], auth: [2] });
    expect(repository.calls.every((call) => call.limit === AUDIT_RETENTION_BATCH_SIZE)).toBe(true);
  });

  it('skips duplicate runs while first run is active', async () => {
    let releaseFirstBatch: (() => void) | undefined;
    const firstBatch = new Promise<void>((resolve) => {
      releaseFirstBatch = resolve;
    });
    const repository: AuditRetentionRepository = {
      async withLock(work) {
        return work({
          deleteAuditEvents: async () => {
            await firstBatch;
            return 0;
          },
          deleteAuthAuditEvents: async () => 0,
        });
      },
    };
    const service = createAuditRetentionService(repository, new MemoryRetentionLogger());
    const first = service.run();
    await expect(service.run()).resolves.toMatchObject({ status: 'skipped' });
    releaseFirstBatch?.();
    await expect(first).resolves.toMatchObject({ status: 'completed' });
  });

  it('commits prior batches and logs sanitized failure', async () => {
    const repository = new MemoryRetentionRepository();
    repository.setRows('audit', AUDIT_RETENTION_BATCH_SIZE);
    repository.setRows('auth', 2);
    repository.failTable = 'auth';
    const logger = new MemoryRetentionLogger();
    const service = createAuditRetentionService(repository, logger);

    await expect(service.run()).resolves.toMatchObject({
      status: 'failed',
      auditEventsDeleted: 1000,
      authAuditEventsDeleted: 0,
    });
    expect(logger.errors).toHaveLength(1);
    expect(logger.errors[0]?.fields).toEqual({
      operation: 'audit_retention',
      reason: 'database_error',
      table: 'auth_audit_events',
      auditEventsDeleted: 1000,
      authAuditEventsDeleted: 0,
    });

    repository.failTable = undefined;
    await expect(service.run()).resolves.toMatchObject({
      status: 'completed',
      auditEventsDeleted: 0,
      authAuditEventsDeleted: 2,
    });
    expect(repository.batches).toEqual({ audit: [1000], auth: [2] });
    expect(logger.errors).toHaveLength(1);
  });

  it('stops when whole-run deadline is reached', async () => {
    const clock = createFakeClock('2026-10-03T00:00:00.000Z');
    const repository = new MemoryRetentionRepository();
    repository.setRows('audit', AUDIT_RETENTION_BATCH_SIZE * 2);
    repository.setRows('auth', AUDIT_RETENTION_BATCH_SIZE);
    let clockReads = 0;
    const service = createAuditRetentionService(repository, new MemoryRetentionLogger(), {
      now: () => {
        const value = clock.now();
        clockReads += 1;
        if (clockReads === 3) clock.advance(AUDIT_RETENTION_RUN_LIMIT_MS);
        return value;
      },
    });

    await expect(service.run()).resolves.toMatchObject({ status: 'time_limit' });
    expect(repository.batches.audit).toEqual([AUDIT_RETENTION_BATCH_SIZE]);
    expect(repository.batches.auth).toEqual([]);
  });
});

describe('audit retention scheduler', () => {
  it('upserts one idempotent daily scheduler and registers worker', async () => {
    const calls: string[] = [];
    const queue = {
      async upsertJobScheduler(id: string, repeat: unknown, template: unknown) {
        calls.push(JSON.stringify({ id, repeat, template }));
        return {};
      },
    };
    const service = {
      async run() {
        return {
          status: 'completed' as const,
          cutoff: new Date(0),
          auditEventsDeleted: 0,
          authAuditEventsDeleted: 0,
        };
      },
    };
    const queues = {
      queue,
      async createWorker(processors: Record<string, unknown>) {
        expect(Object.keys(processors)).toEqual([AUDIT_RETENTION_JOB_NAME]);
        return {};
      },
    };
    const scheduler = createAuditRetentionScheduler({ queues, service });

    await scheduler.start();
    await scheduler.start();

    expect(calls).toEqual([
      JSON.stringify({
        id: AUDIT_RETENTION_SCHEDULER_ID,
        repeat: AUDIT_RETENTION_REPEAT_OPTIONS,
        template: {
          name: AUDIT_RETENTION_JOB_NAME,
          data: {},
          opts: AUDIT_RETENTION_JOB_OPTIONS,
        },
      }),
    ]);
  });
});
