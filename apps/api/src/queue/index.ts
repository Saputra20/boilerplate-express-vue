import { Queue, type Processor, type RedisOptions, Worker } from 'bullmq';
import type { Logger } from 'pino';
import type { RedisConfig } from '../redis/config.js';

export const DEFAULT_QUEUE_NAME = 'default';
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
): QueueInfrastructure {
  const queue = new Queue(DEFAULT_QUEUE_NAME, {
    connection: createConnection(config),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
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
        DEFAULT_QUEUE_NAME,
        async (job) => {
          const processor = processors[job.name];
          if (!processor) throw new Error('Unsupported BullMQ job');

          return processor(job);
        },
        {
          connection: createConnection(config),
        },
      );
      worker.on('error', () => {
        logger.error({ queueName: DEFAULT_QUEUE_NAME }, 'BullMQ worker error');
      });
      worker.on('failed', (job) => {
        logger.error(
          {
            queueName: DEFAULT_QUEUE_NAME,
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
