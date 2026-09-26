import { runSeed } from '../scripts/db-seed.js';

describe('database seed command guards', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSeedPassword = process.env.SEED_ADMIN_PASSWORD;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalSeedPassword === undefined) delete process.env.SEED_ADMIN_PASSWORD;
    else process.env.SEED_ADMIN_PASSWORD = originalSeedPassword;
  });

  it('rejects unsupported environments before loading credentials or connecting', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SEED_ADMIN_PASSWORD;

    await expect(runSeed()).rejects.toThrow(
      'Development admin seeding is restricted to development and test environments',
    );
  });

  it('requires the runtime seed password before connecting', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.SEED_ADMIN_PASSWORD;

    await expect(runSeed()).rejects.toThrow(
      'SEED_ADMIN_PASSWORD is required; pass it at runtime and never commit it',
    );
  });
});
