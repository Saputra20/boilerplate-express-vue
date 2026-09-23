import { loadEnv } from '../src/config/env.js';

const validEnv = () => ({
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'app',
  DATABASE_USERNAME: 'app',
  DATABASE_PASSWORD: 'test-database-password',
  DATABASE_SSL: 'false',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_USERNAME: 'app',
  REDIS_PASSWORD: 'test-redis-password',
  REDIS_DATABASE: '0',
  REDIS_TLS: 'false',
  JWT_PRIVATE_KEY_PATH: './secrets/jwt-private.pem',
  JWT_PUBLIC_KEY_PATH: './secrets/jwt-public.pem',
  JWT_ISSUER: 'app-api',
  JWT_AUDIENCE: 'app-cms',
  JWT_ACCESS_TOKEN_EXPIRES_IN: '15m',
  JWT_REFRESH_TOKEN_EXPIRES_IN: '7d',
  QUEUE_MONITOR_USERNAME: 'queue-monitor',
  QUEUE_MONITOR_PASSWORD: 'test-queue-password',
  CORS_ORIGINS: 'http://localhost:5173',
});

describe('loadEnv', () => {
  it('parses documented environment values', () => {
    const env = loadEnv(validEnv());

    expect(env).toMatchObject({
      PORT: 3000,
      DATABASE_PORT: 5432,
      DATABASE_SSL: false,
      REDIS_PORT: 6379,
      REDIS_DATABASE: 0,
      REDIS_TLS: false,
      CORS_ORIGINS: ['http://localhost:5173'],
    });
  });

  it.each([
    ['missing required value', { DATABASE_HOST: undefined }, 'DATABASE_HOST'],
    ['empty required value', { DATABASE_HOST: '' }, 'DATABASE_HOST'],
    ['malformed integer', { PORT: '3000.5' }, 'PORT'],
    ['unsupported boolean', { DATABASE_SSL: 'yes' }, 'DATABASE_SSL'],
    ['malformed origin', { CORS_ORIGINS: 'not a URL' }, 'CORS_ORIGINS'],
    [
      'duplicate origin',
      { CORS_ORIGINS: 'http://localhost:5173,http://localhost:5173' },
      'CORS_ORIGINS',
    ],
    ['empty secret', { DATABASE_PASSWORD: '' }, 'DATABASE_PASSWORD'],
  ])('rejects %s without exposing values', (_scenario, overrides, invalidKey) => {
    const secret = 'do-not-expose-this-secret';
    const input = { ...validEnv(), DATABASE_PASSWORD: secret, ...overrides };

    expect(() => loadEnv(input)).toThrow(`Invalid environment: ${invalidKey}`);

    try {
      loadEnv(input);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error instanceof Error ? error.message : '').not.toContain(secret);
    }
  });
});
