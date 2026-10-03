import type { Processor } from 'bullmq';
import {
  AUDIT_RETENTION_JOB_DATA,
  AUDIT_RETENTION_JOB_NAME,
  AUDIT_RETENTION_JOB_OPTIONS,
  AUDIT_RETENTION_REPEAT_OPTIONS,
  AUDIT_RETENTION_SCHEDULER_ID,
  type AuditRetentionService,
} from './audit-retention.service.js';

export {
  AUDIT_RETENTION_JOB_NAME,
  AUDIT_RETENTION_JOB_OPTIONS,
  AUDIT_RETENTION_REPEAT_OPTIONS,
  AUDIT_RETENTION_SCHEDULER_ID,
};

type AuditRetentionQueueInfrastructure = {
  queue: {
    upsertJobScheduler(
      schedulerId: string,
      repeatOptions: typeof AUDIT_RETENTION_REPEAT_OPTIONS,
      jobTemplate: {
        name: string;
        data: typeof AUDIT_RETENTION_JOB_DATA;
        opts: typeof AUDIT_RETENTION_JOB_OPTIONS;
      },
    ): Promise<unknown>;
  };
  createWorker(
    processors: Readonly<Record<string, Processor<unknown, unknown, string>>>,
  ): Promise<unknown>;
};

export type AuditRetentionScheduler = {
  start(): Promise<void>;
};

export function createAuditRetentionScheduler({
  queues,
  service,
}: {
  queues: AuditRetentionQueueInfrastructure;
  service: AuditRetentionService;
}): AuditRetentionScheduler {
  let startPromise: Promise<void> | undefined;

  return {
    start(): Promise<void> {
      startPromise ??= startScheduler(queues, service);
      return startPromise;
    },
  };
}

async function startScheduler(
  queues: AuditRetentionQueueInfrastructure,
  service: AuditRetentionService,
): Promise<void> {
  await queues.createWorker({
    [AUDIT_RETENTION_JOB_NAME]: async () => {
      await service.run();
    },
  });

  await queues.queue.upsertJobScheduler(
    AUDIT_RETENTION_SCHEDULER_ID,
    AUDIT_RETENTION_REPEAT_OPTIONS,
    {
      name: AUDIT_RETENTION_JOB_NAME,
      data: AUDIT_RETENTION_JOB_DATA,
      opts: AUDIT_RETENTION_JOB_OPTIONS,
    },
  );
}
