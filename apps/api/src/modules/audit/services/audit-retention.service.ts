export const AUDIT_RETENTION_BATCH_SIZE = 1_000;
export const AUDIT_RETENTION_RUN_LIMIT_MS = 30_000;
export const AUDIT_RETENTION_SCHEDULER_ID = 'audit-retention-daily';
export const AUDIT_RETENTION_JOB_NAME = 'audit.retention.purge';
export const AUDIT_RETENTION_CRON = '0 2 * * *';
export const AUDIT_RETENTION_TIME_ZONE = 'Asia/Jakarta';

export type AuditRetentionTable = 'audit_events' | 'auth_audit_events';

export type AuditRetentionExecutor = {
  deleteAuditEvents(cutoff: Date, limit: number, timeoutMs: number): Promise<number>;
  deleteAuthAuditEvents(cutoff: Date, limit: number, timeoutMs: number): Promise<number>;
};

export type AuditRetentionRepository = {
  withLock<T>(work: (executor: AuditRetentionExecutor) => Promise<T>): Promise<T | undefined>;
};

export type AuditRetentionResult = {
  status: 'completed' | 'failed' | 'skipped' | 'time_limit';
  cutoff: Date;
  auditEventsDeleted: number;
  authAuditEventsDeleted: number;
};

export type AuditRetentionLogger = {
  error(fields: Record<string, unknown>, message: string): void;
};

export type AuditRetentionService = {
  run(): Promise<AuditRetentionResult>;
};

export type AuditRetentionClock = () => Date;

type AuditRetentionOptions = {
  now?: AuditRetentionClock;
};

type FailureReason = 'database_error' | 'time_limit';

export const AUDIT_RETENTION_JOB_DATA = Object.freeze({});
export const AUDIT_RETENTION_REPEAT_OPTIONS = Object.freeze({
  pattern: AUDIT_RETENTION_CRON,
  tz: AUDIT_RETENTION_TIME_ZONE,
});
export const AUDIT_RETENTION_JOB_OPTIONS = Object.freeze({
  attempts: 1,
  removeOnComplete: true,
  removeOnFail: true,
});

function skippedResult(): AuditRetentionResult {
  return {
    status: 'skipped',
    cutoff: new Date(0),
    auditEventsDeleted: 0,
    authAuditEventsDeleted: 0,
  };
}

export function createAuditRetentionService(
  repository: AuditRetentionRepository,
  logger: AuditRetentionLogger,
  options: AuditRetentionOptions = {},
) {
  const now = options.now ?? (() => new Date());
  let running = false;

  const service: AuditRetentionService = {
    async run(): Promise<AuditRetentionResult> {
      if (running) return skippedResult();

      running = true;
      const startedAt = now();
      const cutoff = subtractOneCalendarYear(startedAt);
      const deadline = startedAt.getTime() + AUDIT_RETENTION_RUN_LIMIT_MS;
      let auditEventsDeleted = 0;
      let authAuditEventsDeleted = 0;
      let activeTable: AuditRetentionTable | null = null;

      try {
        const status = await repository.withLock(async (executor) => {
          const purgeTable = async (
            table: AuditRetentionTable,
            deleteBatch: (cutoff: Date, limit: number, timeoutMs: number) => Promise<number>,
            addDeleted: (count: number) => void,
          ): Promise<'completed' | 'time_limit'> => {
            activeTable = table;

            while (true) {
              const remainingMs = deadline - now().getTime();
              if (remainingMs <= 0) return 'time_limit';

              const deleted = await deleteBatch(cutoff, AUDIT_RETENTION_BATCH_SIZE, remainingMs);
              addDeleted(deleted);

              if (now().getTime() >= deadline) return 'time_limit';
              if (deleted < AUDIT_RETENTION_BATCH_SIZE) return 'completed';
            }
          };

          if (
            (await purgeTable('audit_events', executor.deleteAuditEvents, (count) => {
              auditEventsDeleted += count;
            })) === 'time_limit'
          ) {
            return 'time_limit';
          }

          return purgeTable('auth_audit_events', executor.deleteAuthAuditEvents, (count) => {
            authAuditEventsDeleted += count;
          });
        });

        if (status === undefined) {
          return {
            status: 'skipped',
            cutoff,
            auditEventsDeleted,
            authAuditEventsDeleted,
          };
        }

        if (status === 'time_limit') {
          logFailure(logger, 'time_limit', activeTable, auditEventsDeleted, authAuditEventsDeleted);
        }

        return {
          status,
          cutoff,
          auditEventsDeleted,
          authAuditEventsDeleted,
        };
      } catch {
        logFailure(
          logger,
          'database_error',
          activeTable,
          auditEventsDeleted,
          authAuditEventsDeleted,
        );
        return {
          status: 'failed',
          cutoff,
          auditEventsDeleted,
          authAuditEventsDeleted,
        };
      } finally {
        running = false;
      }
    },
  };

  return service;
}

export function subtractOneCalendarYear(value: Date): Date {
  const year = value.getUTCFullYear() - 1;
  const month = value.getUTCMonth();
  const day = Math.min(value.getUTCDate(), daysInMonth(year, month));

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
      value.getUTCMilliseconds(),
    ),
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function logFailure(
  logger: AuditRetentionLogger,
  reason: FailureReason,
  table: AuditRetentionTable | null,
  auditEventsDeleted: number,
  authAuditEventsDeleted: number,
): void {
  logger.error(
    {
      operation: 'audit_retention',
      reason,
      table,
      auditEventsDeleted,
      authAuditEventsDeleted,
    },
    'Audit retention purge stopped',
  );
}
