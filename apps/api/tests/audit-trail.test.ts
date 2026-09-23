import { randomUUID } from 'node:crypto';
import {
  createAuditService,
  parseAuditEvent,
  type AuditEvent,
  type AuditLogger,
  type AuditRepository,
} from '../src/audit/audit-service.js';

type MemoryTransaction = {
  committed: boolean;
  primaryStateChanged: boolean;
};

type StoredAuditEvent = AuditEvent & { createdAt: Date };

class MemoryAuditRepository implements AuditRepository<MemoryTransaction> {
  events: StoredAuditEvent[] = [];
  failAppend = false;

  async append(event: AuditEvent): Promise<void> {
    if (this.failAppend) throw new Error('Database write failed');
    this.events.push({ ...event, createdAt: new Date() });
  }

  async cleanupBefore(before: Date): Promise<number> {
    const initialCount = this.events.length;
    this.events = this.events.filter((event) => event.createdAt >= before);
    return initialCount - this.events.length;
  }
}

class MemoryAuditLogger implements AuditLogger {
  entries: Array<{ eventType: string; requestId: string | null; message: string }> = [];

  error(context: { eventType: string; requestId: string | null }, message: string): void {
    this.entries.push({ ...context, message });
  }
}

function validEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    eventType: 'rbac.permission.denied',
    actorType: 'user',
    actorUserId: randomUUID(),
    resourceType: 'permission',
    resourceId: randomUUID(),
    outcome: 'failure',
    reasonCode: 'FORBIDDEN',
    requestId: randomUUID(),
    sessionId: randomUUID(),
    metadata: { requiredPermission: 'system.access' },
    ...overrides,
  };
}

describe('audit trail', () => {
  it('accepts a future valid machine event and preserves safe request context', async () => {
    const repository = new MemoryAuditRepository();
    const logger = new MemoryAuditLogger();
    const service = createAuditService(repository, logger);
    const event = validEvent({ eventType: 'user.updated', outcome: 'success' });

    await service.recordInformational(event);

    expect(repository.events).toHaveLength(1);
    expect(repository.events[0]).toMatchObject({
      eventType: 'user.updated',
      requestId: event.requestId,
      sessionId: event.sessionId,
      metadata: { requiredPermission: 'system.access' },
    });
    expect(logger.entries).toHaveLength(0);
  });

  it.each([
    ['vague event', validEvent({ eventType: 'changed' })],
    ['password metadata', validEvent({ metadata: { password: 'never-store' } })],
    [
      'authorization metadata',
      validEvent({ metadata: { headers: { authorization: 'Bearer secret' } } }),
    ],
    ['raw exception metadata', validEvent({ metadata: { error: new Error('do-not-store') } })],
    ['oversized metadata', validEvent({ metadata: { note: 'x'.repeat(8 * 1024) } })],
  ])('rejects %s before persistence', async (_name, event) => {
    const repository = new MemoryAuditRepository();
    const service = createAuditService(repository, new MemoryAuditLogger());

    await expect(service.recordInformational(event)).rejects.toThrow();
    expect(repository.events).toHaveLength(0);
  });

  it('requires a user ID for user actors and allows system events without one', async () => {
    const repository = new MemoryAuditRepository();
    const service = createAuditService(repository, new MemoryAuditLogger());

    await expect(service.recordInformational(validEvent({ actorUserId: null }))).rejects.toThrow();
    await expect(
      service.recordInformational(validEvent({ actorUserId: undefined })),
    ).rejects.toThrow();
    await service.recordInformational(
      validEvent({
        actorType: 'system',
        actorUserId: null,
        eventType: 'system.cleanup.completed',
      }),
    );

    expect(repository.events).toHaveLength(1);
    expect(repository.events[0].actorType).toBe('system');
    expect(repository.events[0].actorUserId).toBeNull();
  });

  it('does not hide required audit write failures from an owner transaction', async () => {
    const repository = new MemoryAuditRepository();
    repository.failAppend = true;
    const service = createAuditService(repository, new MemoryAuditLogger());
    const transaction: MemoryTransaction = { committed: false, primaryStateChanged: false };

    await expect(
      runTransaction(transaction, async () => {
        transaction.primaryStateChanged = true;
        await service.recordRequired(validEvent(), transaction);
      }),
    ).rejects.toThrow('Database write failed');

    expect(transaction).toEqual({ committed: false, primaryStateChanged: false });
  });

  it('logs a sanitized best-effort failure once without persisting metadata', async () => {
    const repository = new MemoryAuditRepository();
    repository.failAppend = true;
    const logger = new MemoryAuditLogger();
    const service = createAuditService(repository, logger);
    const event = validEvent({ metadata: { requiredPermission: 'system.access' } });

    await expect(service.recordInformational(event)).resolves.toBeUndefined();

    expect(logger.entries).toEqual([
      {
        eventType: 'rbac.permission.denied',
        requestId: event.requestId,
        message: 'Audit event write failed',
      },
    ]);
    expect(JSON.stringify(logger.entries)).not.toContain('requiredPermission');
  });

  it('cleans only records older than the 90-day retention boundary', async () => {
    const repository = new MemoryAuditRepository();
    const service = createAuditService(repository, new MemoryAuditLogger());
    const now = new Date('2026-09-23T00:00:00.000Z');
    const exactlyNinetyDaysOld = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const event = parseAuditEvent(validEvent());
    repository.events = [
      { ...event, createdAt: new Date(exactlyNinetyDaysOld.getTime() - 1) },
      { ...event, createdAt: exactlyNinetyDaysOld },
    ];

    await expect(service.cleanupExpired(now)).resolves.toBe(1);
    expect(repository.events).toHaveLength(1);
    expect(repository.events[0].createdAt).toEqual(exactlyNinetyDaysOld);
  });
});

async function runTransaction(
  transaction: MemoryTransaction,
  work: () => Promise<void>,
): Promise<void> {
  const initialState = transaction.primaryStateChanged;
  try {
    await work();
    transaction.committed = true;
  } catch (error) {
    transaction.primaryStateChanged = initialState;
    throw error;
  }
}
