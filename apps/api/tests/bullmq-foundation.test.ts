import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import pino from 'pino';
import type { RedisConfig } from '../src/redis/config.js';
import {
  DEFAULT_JOB_ATTEMPTS,
  DEFAULT_JOB_BACKOFF_DELAY_MS,
  DEFAULT_JOB_OPTIONS,
  DEFAULT_QUEUE_NAME,
  FAILED_JOB_RETENTION_SECONDS,
  createQueueInfrastructure,
} from '../src/queue/index.js';
import { shutdown } from '../src/shutdown.js';

const redisIntegrationEnabled = process.env.REDIS_INTEGRATION === 'true';
const integrationDescribe = redisIntegrationEnabled ? describe : describe.skip;

const redisConfig: RedisConfig = {
  host: '127.0.0.1',
  port: 6379,
  username: '',
  password: '',
  db: 15,
  tls: false,
};

function waitFor(check: () => boolean | Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 5_000;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (await check()) {
        resolve();
        return;
      }

      if (Date.now() >= deadline) {
        reject(new Error('Timed out waiting for BullMQ job state'));
        return;
      }

      setTimeout(() => void poll(), 20);
    };

    void poll();
  });
}

describe('BullMQ foundation defaults', () => {
  it('uses documented bounded defaults', () => {
    expect(DEFAULT_QUEUE_NAME).toBe('default');
    expect(DEFAULT_JOB_ATTEMPTS).toBe(3);
    expect(DEFAULT_JOB_BACKOFF_DELAY_MS).toBe(1000);
    expect(FAILED_JOB_RETENTION_SECONDS).toBe(604800);
    expect(DEFAULT_JOB_OPTIONS).toEqual({
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: { age: 604800 },
    });
  });

  it('sanitizes required queue initialization failure', async () => {
    const password = 'do-not-log-this-redis-password';
    const logger = pino({ enabled: false });
    const queues = createQueueInfrastructure({ ...redisConfig, port: 1, password }, logger);

    await expect(queues.initialize()).rejects.toThrow('BullMQ initialization failed');
  });

  it('closes queue resources before database and Redis shutdown', async () => {
    const calls: string[] = [];

    await shutdown(
      {
        close(callback) {
          calls.push('server');
          callback();
        },
      },
      {
        queues: {
          async close() {
            calls.push('queues');
          },
        },
        database: {
          async close() {
            calls.push('database');
          },
        },
        redis: { close: () => calls.push('redis') },
        logging: { close: () => calls.push('logging') },
      },
    );

    expect(calls).toEqual(['server', 'queues', 'database', 'redis', 'logging']);
  });
});

integrationDescribe('BullMQ foundation Redis integration', () => {
  let cleanupRedis: Redis;
  let queues: ReturnType<typeof createQueueInfrastructure>;

  beforeEach(async () => {
    cleanupRedis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      db: redisConfig.db,
      maxRetriesPerRequest: 1,
      retryStrategy: null,
    });
    await cleanupRedis.flushdb();
    queues = createQueueInfrastructure(redisConfig, pino({ enabled: false }));
    await queues.initialize();
  });

  afterEach(async () => {
    await queues.close();
    await cleanupRedis.flushdb();
    cleanupRedis.disconnect();
  });

  it('retries a synthetic job and removes it after success', async () => {
    expect(queues.queue.name).toBe(DEFAULT_QUEUE_NAME);
    let attempts = 0;
    await queues.createWorker({
      'test.retry': async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('synthetic retry failure');
        return 'done';
      },
    });

    const job = await queues.queue.add(
      'test.retry',
      { traceId: randomUUID() },
      { attempts: DEFAULT_JOB_ATTEMPTS, backoff: { type: 'exponential', delay: 1 } },
    );
    const jobId = job.id;
    if (!jobId) throw new Error('BullMQ job ID is missing');

    await waitFor(async () => attempts === 2 && (await queues.queue.getJob(jobId)) === undefined);

    expect(attempts).toBe(2);
  });

  it('retains final failure by age and omits sensitive job data from logs', async () => {
    const logLines: string[] = [];
    const logger = pino(
      {},
      {
        write(chunk: string) {
          logLines.push(chunk);
        },
      },
    );
    const isolatedQueues = createQueueInfrastructure(redisConfig, logger);
    await queues.close();
    queues = isolatedQueues;
    await queues.initialize();
    await queues.createWorker({
      'test.permanent-failure': async () => {
        throw new Error('synthetic permanent failure');
      },
    });

    const secret = 'do-not-log-this-job-payload';
    await queues.queue.add(
      'test.permanent-failure',
      { secret },
      { attempts: DEFAULT_JOB_ATTEMPTS, backoff: { type: 'exponential', delay: 1 } },
    );

    await waitFor(async () => (await queues.queue.getFailedCount()) === 1);

    const [failedJob] = await queues.queue.getFailed();
    expect(failedJob?.opts.removeOnFail).toEqual({ age: FAILED_JOB_RETENTION_SECONDS });
    const logs = logLines.join('');
    expect(logs).not.toContain(secret);
    expect(logs).not.toContain('password');
  });

  it('closes workers and queue safely more than once', async () => {
    await queues.createWorker({ 'test.close': async () => 'done' });

    await expect(queues.close()).resolves.toBeUndefined();
    await expect(queues.close()).resolves.toBeUndefined();
  });

  it('fails an unsupported job name instead of completing it', async () => {
    await queues.createWorker({ 'test.supported': async () => 'done' });
    await queues.queue.add('test.unsupported', { traceId: randomUUID() }, { attempts: 1 });

    await waitFor(async () => (await queues.queue.getFailedCount()) === 1);

    const [failedJob] = await queues.queue.getFailed();
    expect(failedJob?.failedReason).toBe('Unsupported BullMQ job');
  });
});
