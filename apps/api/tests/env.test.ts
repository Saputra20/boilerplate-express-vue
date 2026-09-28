import { loadEmailConfig } from '../src/config/email/config.js';
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
  DEFAULT_USER_PASSWORD: 'correct horse battery staple',
  CORS_ORIGINS: 'http://localhost:5173',
  PUBLIC_APP_URL: 'http://localhost:5173',
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
      PUBLIC_APP_URL: new URL('http://localhost:5173/'),
    });
  });

  it('treats empty Redis credentials as unset', () => {
    const env = loadEnv({ ...validEnv(), REDIS_USERNAME: '', REDIS_PASSWORD: '' });

    expect(env.REDIS_USERNAME).toBeUndefined();
    expect(env.REDIS_PASSWORD).toBeUndefined();
  });

  it('keeps email optional in development and test when the feature flag is omitted', () => {
    const developmentEnv = loadEnv({ ...validEnv(), NODE_ENV: 'development' });
    const testEnv = loadEnv(validEnv());

    expect(loadEmailConfig(developmentEnv)).toEqual({ enabled: false });
    expect(loadEmailConfig(testEnv)).toEqual({ enabled: false });
  });

  it('loads a complete enabled production SMTP configuration', () => {
    const env = loadEnv({
      ...validEnv(),
      NODE_ENV: 'production',
      EMAIL_ENABLED: 'true',
      EMAIL_DELIVERY_ENCRYPTION_KEY: 'a'.repeat(64),
      PUBLIC_APP_URL: 'https://cms.example.test/',
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USERNAME: 'mailer',
      SMTP_PASSWORD: ' smtp-test-secret ',
      SMTP_FROM_EMAIL: 'no-reply@example.test',
      SMTP_FROM_NAME: 'Example CMS',
    });

    expect(loadEmailConfig(env)).toEqual({
      enabled: true,
      host: 'smtp.example.test',
      port: 587,
      secure: false,
      username: 'mailer',
      password: ' smtp-test-secret ',
      fromEmail: 'no-reply@example.test',
      fromName: 'Example CMS',
    });
  });

  it('rejects enabled production email without complete SMTP settings', () => {
    expect(() => loadEnv({ ...validEnv(), NODE_ENV: 'production', EMAIL_ENABLED: 'true' })).toThrow(
      'Invalid environment: PUBLIC_APP_URL, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_FROM_EMAIL, SMTP_FROM_NAME, EMAIL_DELIVERY_ENCRYPTION_KEY',
    );
  });

  it('requires PUBLIC_APP_URL when transactional email is enabled', () => {
    expect(() =>
      loadEnv({
        ...validEnv(),
        NODE_ENV: 'production',
        EMAIL_ENABLED: 'true',
        EMAIL_DELIVERY_ENCRYPTION_KEY: 'a'.repeat(64),
        SMTP_HOST: 'smtp.example.test',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_FROM_EMAIL: 'no-reply@example.test',
        SMTP_FROM_NAME: 'Example CMS',
        PUBLIC_APP_URL: undefined,
      }),
    ).toThrow('Invalid environment: PUBLIC_APP_URL');
  });

  it.each([
    ['production HTTP', 'http://cms.example.test', 'production'],
    ['URL credentials', 'https://user:pass@cms.example.test', 'production'],
    ['URL query', 'https://cms.example.test/?token=secret', 'production'],
    ['URL fragment', 'https://cms.example.test/#fragment', 'production'],
    ['malformed URL', 'not a url', 'production'],
    ['non-loopback development HTTP', 'http://cms.example.test', 'development'],
  ])('rejects %s for enabled email', (_scenario, appUrl, nodeEnv) => {
    expect(() =>
      loadEnv({
        ...validEnv(),
        NODE_ENV: nodeEnv,
        EMAIL_ENABLED: 'true',
        EMAIL_DELIVERY_ENCRYPTION_KEY: 'a'.repeat(64),
        SMTP_HOST: 'smtp.example.test',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_FROM_EMAIL: 'no-reply@example.test',
        SMTP_FROM_NAME: 'Example CMS',
        PUBLIC_APP_URL: appUrl,
      }),
    ).toThrow('Invalid environment: PUBLIC_APP_URL');
  });

  it.each(['development', 'test'])('allows localhost HTTP for enabled email in %s', (nodeEnv) => {
    const env = loadEnv({
      ...validEnv(),
      NODE_ENV: nodeEnv,
      EMAIL_ENABLED: 'true',
      EMAIL_DELIVERY_ENCRYPTION_KEY: 'a'.repeat(64),
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_FROM_EMAIL: 'no-reply@example.test',
      SMTP_FROM_NAME: 'Example CMS',
      PUBLIC_APP_URL: 'http://localhost:5173/',
    });

    expect(env.PUBLIC_APP_URL).toEqual(new URL('http://localhost:5173/'));
  });

  it('normalizes trailing slashes and leaves CORS origins independent', () => {
    const env = loadEnv({
      ...validEnv(),
      PUBLIC_APP_URL: 'https://cms.example.test/admin///',
      CORS_ORIGINS: 'https://api-tool.example.test',
    });

    expect(env.PUBLIC_APP_URL?.toString()).toBe('https://cms.example.test/admin');
    expect(env.CORS_ORIGINS).toEqual(['https://api-tool.example.test']);
  });

  it('rejects malformed delivery encryption keys without echoing key contents', () => {
    const malformedKey = 'not-a-real-encryption-secret';
    expect(() =>
      loadEnv({
        ...validEnv(),
        EMAIL_DELIVERY_ENCRYPTION_KEY: malformedKey,
      }),
    ).toThrow('Invalid environment: EMAIL_DELIVERY_ENCRYPTION_KEY');
  });

  it.each([
    ['invalid port', { SMTP_PORT: '70000' }, 'SMTP_PORT'],
    ['invalid TLS mode', { SMTP_SECURE: 'yes' }, 'SMTP_SECURE'],
  ])('rejects %s in enabled SMTP configuration', (_scenario, override, invalidKey) => {
    expect(() =>
      loadEnv({
        ...validEnv(),
        NODE_ENV: 'production',
        EMAIL_ENABLED: 'true',
        EMAIL_DELIVERY_ENCRYPTION_KEY: 'a'.repeat(64),
        SMTP_HOST: 'smtp.example.test',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_FROM_EMAIL: 'no-reply@example.test',
        SMTP_FROM_NAME: 'Example CMS',
        ...override,
      }),
    ).toThrow(`Invalid environment: ${invalidKey}`);
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
    ['empty monitor username', { QUEUE_MONITOR_USERNAME: '' }, 'QUEUE_MONITOR_USERNAME'],
    ['empty monitor password', { QUEUE_MONITOR_PASSWORD: '' }, 'QUEUE_MONITOR_PASSWORD'],
    ['short monitor password', { QUEUE_MONITOR_PASSWORD: 'too-short' }, 'QUEUE_MONITOR_PASSWORD'],
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
