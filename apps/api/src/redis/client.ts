import { Redis } from 'ioredis';
import type { RedisConfig } from './config.js';

export function createRedis(config: RedisConfig) {
  const client = new Redis({
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    db: config.db,
    tls: config.tls ? {} : undefined,
    lazyConnect: true,
    retryStrategy: null,
  });

  return {
    client,
    async initialize(): Promise<void> {
      try {
        await client.connect();
        await client.ping();
      } catch {
        client.disconnect();
        throw new Error('Redis initialization failed');
      }
    },
    close(): void {
      client.disconnect();
    },
  };
}
