import {
  API_INTEGRATION_ENABLED,
  createTestNamespace,
  createTestRedis,
  deleteRedisNamespace,
} from './helpers/integration.js';

const integrationDescribe = API_INTEGRATION_ENABLED ? describe : describe.skip;

integrationDescribe('Redis test isolation', () => {
  it('writes, reads, and removes only its namespaced synthetic keys', async () => {
    const redis = createTestRedis();
    const namespace = createTestNamespace('redis');
    const key = `${namespace}:value`;
    let connected = false;

    try {
      await redis.connect();
      await redis.ping();
      connected = true;
      await redis.set(key, 'test-value');
      expect(await redis.get(key)).toBe('test-value');
    } finally {
      if (connected) {
        await deleteRedisNamespace(redis, namespace);
        expect(await redis.scan('0', 'MATCH', `${namespace}:*`, 'COUNT', 100)).toEqual(['0', []]);
      }
      if (redis.status !== 'end') redis.disconnect();
    }
  });
});
