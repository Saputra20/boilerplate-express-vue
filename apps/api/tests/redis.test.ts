import { createRedis } from '../src/config/redis/client.js';
import { loadRedisConfig } from '../src/config/redis/config.js';

const validRedisEnv = () => ({
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_USERNAME: 'app',
  REDIS_PASSWORD: 'test-redis-password',
  REDIS_DATABASE: '0',
  REDIS_TLS: 'false',
});

describe('redis foundation', () => {
  it('creates a lazy Redis client from separated configuration', () => {
    const config = loadRedisConfig(validRedisEnv());
    const redis = createRedis(config);

    expect(config).toEqual({
      host: 'localhost',
      port: 6379,
      username: 'app',
      password: 'test-redis-password',
      db: 0,
      tls: false,
    });
    expect(redis.client.status).toBe('wait');

    redis.close();
  });

  it('rejects invalid configuration without exposing password values', () => {
    const password = 'do-not-expose-this-password';

    expect(() =>
      loadRedisConfig({ ...validRedisEnv(), REDIS_PASSWORD: password, REDIS_PORT: '0' }),
    ).toThrow('Invalid Redis configuration: REDIS_PORT');

    try {
      loadRedisConfig({ ...validRedisEnv(), REDIS_PASSWORD: password, REDIS_PORT: '0' });
    } catch (error) {
      expect(error instanceof Error ? error.message : '').not.toContain(password);
    }
  });

  it('sanitizes Redis initialization failures', async () => {
    const redis = createRedis(
      loadRedisConfig({ ...validRedisEnv(), REDIS_HOST: '127.0.0.1', REDIS_PORT: '1' }),
    );

    await expect(redis.initialize()).rejects.toThrow('Redis initialization failed');
  });
});
