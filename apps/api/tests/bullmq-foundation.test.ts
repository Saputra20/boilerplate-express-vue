import { randomUUID } from 'node:crypto';
import pino from 'pino';
import {
  DEFAULT_JOB_ATTEMPTS,
  DEFAULT_JOB_BACKOFF_DELAY_MS,
  DEFAULT_JOB_OPTIONS,
  DEFAULT_QUEUE_NAME,
  FAILED_JOB_RETENTION_SECONDS,
  createQueueInfrastructure,
} from '../src/config/queue/queue.js';
import { shutdown } from '../src/shutdown.js';
import {
  API_INTEGRATION_ENABLED,
  createTestQueueName,
  createTestRedis,
  deleteRedisNamespace,
  testRedisConfig,
} from './helpers/integration.js';

const integrationDescribe = API_INTEGRATION_ENABLED ? describe : describe.skip;

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

  it('allows an isolated queue name without changing production default', async () => {
    const queueName = createTestQueueName();
    const queues = createQueueInfrastructure(testRedisConfig, pino({ enabled: false }), queueName);

    try {
      expect(queues.queue.name).toBe(queueName);
      expect(DEFAULT_QUEUE_NAME).toBe('default');
    } finally {
      await queues.close();
    }
  });

  it('sanitizes required queue initialization failure', async () => {
    const password = 'do-not-log-this-redis-password';
    const logger = pino({ enabled: false });
    const queues = createQueueInfrastructure({ ...testRedisConfig, port: 1, password }, logger);

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
  let cleanupRedis: ReturnType<typeof createTestRedis>;
  let queues: ReturnType<typeof createQueueInfrastructure>;
  let queueName: string;
  let queueInitialized = false;

  beforeEach(async () => {
    cleanupRedis = createTestRedis();
    await cleanupRedis.connect();
    await cleanupRedis.ping();
    queueName = createTestQueueName();
    queues = createQueueInfrastructure(testRedisConfig, pino({ enabled: false }), queueName);
    await queues.initialize();
    queueInitialized = true;
  });

  afterEach(async () => {
    if (queueInitialized) await queues.close();
    if (cleanupRedis.status === 'ready') {
      await deleteRedisNamespace(cleanupRedis, `bull:${queueName}`);
      expect(await cleanupRedis.scan('0', 'MATCH', `bull:${queueName}:*`, 'COUNT', 100)).toEqual([
        '0',
        [],
      ]);
    }
    if (cleanupRedis.status !== 'end') cleanupRedis.disconnect();
  });

  it('retries a synthetic job and removes it after success', async () => {
    expect(queues.queue.name).toBe(queueName);
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
    const isolatedQueues = createQueueInfrastructure(testRedisConfig, logger, queueName);
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
