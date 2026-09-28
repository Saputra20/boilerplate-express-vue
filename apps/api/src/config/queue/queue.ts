import {
  Queue,
  UnrecoverableError,
  type Job,
  type Processor,
  type RedisOptions,
  Worker,
} from 'bullmq';
import type { Logger } from 'pino';
import {
  EmailDeliveryError,
  isEmailDeliveryFailureCategory,
  type EmailDeliveryFailureCategory,
} from '../email/transport.js';
import type { RedisConfig } from '../redis/config.js';

export const DEFAULT_QUEUE_NAME = 'default';
export const EMAIL_QUEUE_NAME = 'email';
export const EMAIL_WORKER_CONCURRENCY = 5;
export const DEFAULT_JOB_ATTEMPTS = 3;
export const DEFAULT_JOB_BACKOFF_DELAY_MS = 1000;
export const FAILED_JOB_RETENTION_SECONDS = 7 * 24 * 60 * 60;

export const DEFAULT_JOB_OPTIONS = {
  attempts: DEFAULT_JOB_ATTEMPTS,
  backoff: {
    type: 'exponential' as const,
    delay: DEFAULT_JOB_BACKOFF_DELAY_MS,
  },
  removeOnComplete: true,
  removeOnFail: {
    age: FAILED_JOB_RETENTION_SECONDS,
  },
};

export const EMAIL_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { age: FAILED_JOB_RETENTION_SECONDS },
};

type QueueLogger = Pick<Logger, 'error'>;
type QueueJobProcessor = Processor<unknown, unknown, string>;
type QueueJobProcessors = Readonly<Record<string, QueueJobProcessor>>;

type QueueInfrastructure = {
  queue: Queue;
  initialize(): Promise<void>;
  createWorker(processors: QueueJobProcessors): Promise<Worker>;
  close(): Promise<void>;
};

function createConnection(config: RedisConfig): RedisOptions {
  return {
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    db: config.db,
    tls: config.tls ? {} : undefined,
    maxRetriesPerRequest: null,
    retryStrategy: null,
  };
}

export function createQueueInfrastructure(
  config: RedisConfig,
  logger: QueueLogger,
  queueName = DEFAULT_QUEUE_NAME,
): QueueInfrastructure {
  const emailQueue = queueName === EMAIL_QUEUE_NAME;
  const queue = new Queue(queueName, {
    connection: createConnection(config),
    defaultJobOptions: emailQueue ? EMAIL_JOB_OPTIONS : DEFAULT_JOB_OPTIONS,
  });
  const workers = new Set<{ close(): Promise<void> }>();
  let closed = false;

  return {
    queue,
    async initialize(): Promise<void> {
      try {
        await queue.waitUntilReady();
      } catch {
        await this.close().catch(() => undefined);
        throw new Error('BullMQ initialization failed');
      }
    },
    async createWorker(processors: QueueJobProcessors): Promise<Worker> {
      if (closed) throw new Error('BullMQ infrastructure is closed');

      const worker = new Worker(
        queueName,
        async (job) => {
          const processor = processors[job.name];
          if (!processor) throw new Error('Unsupported BullMQ job');

          try {
            return await processor(job);
          } catch (error) {
            if (!emailQueue) throw error;
            throw normalizeEmailQueueFailure(error);
          }
        },
        {
          connection: createConnection(config),
          ...(emailQueue ? { concurrency: EMAIL_WORKER_CONCURRENCY } : {}),
        },
      );
      worker.on('error', () => {
        logger.error({ queueName }, 'BullMQ worker error');
      });
      worker.on('failed', (job, error) => {
        if (emailQueue) {
          logger.error(
            buildEmailQueueFailureLogFields(queueName, job, error),
            'Email queue job failed',
          );
          return;
        }

        logger.error(
          {
            queueName,
            jobName: job?.name,
            jobId: job?.id,
            attemptsMade: job?.attemptsMade,
          },
          'BullMQ job failed',
        );
      });

      try {
        await worker.waitUntilReady();
      } catch {
        await worker.close().catch(() => undefined);
        throw new Error('BullMQ worker initialization failed');
      }

      workers.add(worker);
      return worker;
    },
    async close(): Promise<void> {
      if (closed) return;

      closed = true;
      const results = await Promise.allSettled([...workers].map(async (worker) => worker.close()));
      const queueResult = await queue.close().then(
        () => null,
        (error: unknown) => error,
      );

      if (results.some((result) => result.status === 'rejected') || queueResult) {
        throw new Error('BullMQ shutdown failed');
      }
    },
  };
}

export function normalizeEmailQueueFailure(error: unknown): Error {
  const failureCategory = failureCategoryFrom(error);
  const isTerminal =
    error instanceof UnrecoverableError ||
    (error instanceof EmailDeliveryError && error.kind !== 'retryable');
  const normalized = isTerminal
    ? new UnrecoverableError(failureCategory)
    : new Error(failureCategory);
  Object.assign(normalized, { failureCategory });
  return normalized;
}

function failureCategoryFrom(error: unknown): EmailDeliveryFailureCategory {
  if (typeof error === 'object' && error !== null && 'failureCategory' in error) {
    const candidate: unknown = error.failureCategory;
    if (isEmailDeliveryFailureCategory(candidate)) return candidate;
  }
  return 'UNCLASSIFIED_FAILURE';
}

export function buildEmailQueueFailureLogFields(
  queueName: string,
  job: Pick<Job, 'id' | 'attemptsMade'> | undefined,
  error: unknown,
): { queueName: string; jobId?: string; attemptsMade: number; failureCategory: string } {
  const attemptsMade = job?.attemptsMade;
  return {
    queueName,
    ...(job?.id ? { jobId: job.id } : {}),
    attemptsMade:
      attemptsMade !== undefined && Number.isInteger(attemptsMade)
        ? Math.max(0, Math.min(attemptsMade, EMAIL_JOB_OPTIONS.attempts))
        : 0,
    failureCategory: failureCategoryFrom(error),
  };
}
