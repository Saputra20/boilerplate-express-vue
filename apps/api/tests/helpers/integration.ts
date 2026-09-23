import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { loadDatabaseConfig, type DatabaseConfig } from '../../src/database/config.js';
import { loadRedisConfig, type RedisConfig } from '../../src/redis/config.js';

export const API_INTEGRATION_ENABLED = process.env.API_INTEGRATION === 'true';

export const testDatabaseConfig: DatabaseConfig = loadDatabaseConfig({
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '5433',
  DATABASE_NAME: 'api_test',
  DATABASE_USERNAME: 'api_test',
  DATABASE_PASSWORD: 'api_test',
  DATABASE_SSL: 'false',
});

export const testRedisConfig: RedisConfig = loadRedisConfig({
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '6380',
  REDIS_USERNAME: 'api_test',
  REDIS_PASSWORD: 'api_test',
  REDIS_DATABASE: '0',
  REDIS_TLS: 'false',
});

export function createTestNamespace(prefix: string): string {
  return `test:${prefix}:${randomUUID()}`;
}

export function createTestQueueName(): string {
  return `test-${randomUUID()}`;
}

export function createTestRedis(): Redis {
  const redis = new Redis({
    host: testRedisConfig.host,
    port: testRedisConfig.port,
    username: testRedisConfig.username,
    password: testRedisConfig.password,
    db: testRedisConfig.db,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: null,
  });
  redis.on('error', () => undefined);
  return redis;
}

export async function deleteRedisNamespace(redis: Redis, namespace: string): Promise<void> {
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${namespace}:*`, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) await redis.unlink(...keys);
  } while (cursor !== '0');
}
