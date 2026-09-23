import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import {
  checkReadiness,
  READINESS_TIMEOUT_MS,
  type HealthRouteOptions,
} from '../src/modules/health/health.router.js';
import { OPENAPI_DOCUMENT_PATH } from '../src/config/openapi/openapi.js';
import { createTestApp as createApiTestApp, TEST_CORS_ORIGIN } from './helpers/test-app.js';

const origin = TEST_CORS_ORIGIN;
const secretDatabaseError = 'postgres://user:secret-password@db.internal:5432/app';
const secretRedisError = 'redis://:secret-password@cache.internal:6379';

function createTestApp(
  healthRoutes: HealthRouteOptions,
  rateLimit?: { limit: number; windowMs: number },
) {
  return createApiTestApp({
    securityOptions: { corsOrigins: [origin], rateLimit },
    healthRoutes,
  });
}

function successfulProbes(): HealthRouteOptions {
  return {
    databaseProbe: async () => undefined,
    redisProbe: async () => undefined,
  };
}

describe('health and readiness routes', () => {
  it('returns public process liveness without dependency probes', async () => {
    let databaseCalls = 0;
    let redisCalls = 0;
    const databaseProbe = async () => {
      databaseCalls += 1;
      throw new Error(secretDatabaseError);
    };
    const redisProbe = async () => {
      redisCalls += 1;
      throw new Error(secretRedisError);
    };
    const { app, directory, logging } = createTestApp({ databaseProbe, redisProbe });

    try {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
      expect(databaseCalls).toBe(0);
      expect(redisCalls).toBe(0);
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('returns ready when PostgreSQL and Redis probes succeed', async () => {
    const { app, directory, logging } = createTestApp(successfulProbes());

    try {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ready' });
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('runs PostgreSQL and Redis probes concurrently', async () => {
    let releaseDatabase: (() => void) | undefined;
    let databaseCalls = 0;
    let redisCalls = 0;
    const databaseProbe = () => {
      databaseCalls += 1;
      return new Promise<void>((resolve) => {
        releaseDatabase = resolve;
      });
    };
    const redisProbe = async () => {
      redisCalls += 1;
    };
    const readiness = checkReadiness({ databaseProbe, redisProbe });
    await Promise.resolve();

    expect(databaseCalls).toBe(1);
    expect(redisCalls).toBe(1);
    releaseDatabase?.();

    await expect(readiness).resolves.toEqual([
      { name: 'database', ok: true },
      { name: 'redis', ok: true },
    ]);
  });

  it.each([
    [
      'database',
      () => ({
        databaseProbe: async () => {
          throw new Error(secretDatabaseError);
        },
        redisProbe: async () => undefined,
      }),
    ],
    [
      'redis',
      () => ({
        databaseProbe: async () => undefined,
        redisProbe: async () => {
          throw new Error(secretRedisError);
        },
      }),
    ],
    [
      'both',
      () => ({
        databaseProbe: async () => {
          throw new Error(secretDatabaseError);
        },
        redisProbe: async () => {
          throw new Error(secretRedisError);
        },
      }),
    ],
  ])('returns a sanitized 503 when %s probe fails', async (_dependency, createProbes) => {
    const { app, directory, logging } = createTestApp(createProbes());

    try {
      const response = await request(app).get('/ready');
      const applicationLog = readFileSync(join(directory, 'application.log'), 'utf8');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({ status: 'not_ready' });
      expect(JSON.stringify(response.body)).not.toContain('postgres');
      expect(JSON.stringify(response.body)).not.toContain('redis');
      expect(applicationLog).not.toContain(secretDatabaseError);
      expect(applicationLog).not.toContain(secretRedisError);
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it.each(['database', 'redis'] as const)(
    'returns 503 when %s probe exceeds two seconds',
    async (dependency) => {
      const stalledProbe = () => new Promise<void>(() => undefined);
      const probes: HealthRouteOptions =
        dependency === 'database'
          ? { databaseProbe: stalledProbe, redisProbe: async () => undefined }
          : { databaseProbe: async () => undefined, redisProbe: stalledProbe };
      const originalSetTimeout = global.setTimeout;
      const originalClearTimeout = global.clearTimeout;
      const delays: number[] = [];
      global.setTimeout = ((callback: () => void, delay?: number) => {
        delays.push(delay ?? 0);
        queueMicrotask(callback);
        return {} as NodeJS.Timeout;
      }) as typeof setTimeout;
      global.clearTimeout = (() => undefined) as typeof clearTimeout;

      try {
        await expect(checkReadiness(probes)).resolves.toEqual(
          expect.arrayContaining([{ name: dependency, ok: false, failure: 'timeout' }]),
        );
        expect(delays).toEqual([READINESS_TIMEOUT_MS, READINESS_TIMEOUT_MS]);
      } finally {
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
      }
    },
  );

  it('exempts health and readiness from client API rate limiting', async () => {
    const { app, directory, logging } = createTestApp(successfulProbes(), {
      limit: 1,
      windowMs: 60_000,
    });

    try {
      const health = await Promise.all([request(app).get('/health'), request(app).get('/health')]);
      const ready = await Promise.all([request(app).get('/ready'), request(app).get('/ready')]);
      const firstUnknown = await request(app).get('/unknown');
      const secondUnknown = await request(app).get('/unknown');

      expect(health.map(({ status }) => status)).toEqual([200, 200]);
      expect(ready.map(({ status }) => status)).toEqual([200, 200]);
      expect(firstUnknown.status).toBe(404);
      expect(secondUnknown.status).toBe(429);
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('documents public health and readiness routes without bearer security', async () => {
    const { app, directory, logging } = createTestApp(successfulProbes());

    try {
      const response = await request(app).get(OPENAPI_DOCUMENT_PATH);
      const document = response.body as {
        paths: Record<string, { get: { security?: unknown; responses: Record<string, unknown> } }>;
      };

      expect(response.status).toBe(200);
      expect(document.paths['/health']?.get.security).toBeUndefined();
      expect(document.paths['/health']?.get.responses).toHaveProperty('200');
      expect(document.paths['/ready']?.get.security).toBeUndefined();
      expect(document.paths['/ready']?.get.responses).toHaveProperty('200');
      expect(document.paths['/ready']?.get.responses).toHaveProperty('503');
      expect(document.paths).not.toHaveProperty('/ops/queues');
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
