import { createDatabase } from '../src/database/client.js';
import { loadDatabaseConfig } from '../src/database/config.js';

const validDatabaseEnv = () => ({
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'app',
  DATABASE_USERNAME: 'app',
  DATABASE_PASSWORD: 'test-database-password',
  DATABASE_SSL: 'false',
});

describe('database foundation', () => {
  it('creates a typed Drizzle client from separated database configuration', async () => {
    const config = loadDatabaseConfig(validDatabaseEnv());
    const database = createDatabase(config);

    expect(config).toEqual({
      host: 'localhost',
      port: 5432,
      database: 'app',
      user: 'app',
      password: 'test-database-password',
      ssl: false,
    });
    expect(database.db).toBeDefined();

    await database.close();
  });

  it('rejects invalid configuration without exposing password values', () => {
    const password = 'do-not-expose-this-password';

    expect(() =>
      loadDatabaseConfig({
        ...validDatabaseEnv(),
        DATABASE_PASSWORD: password,
        DATABASE_PORT: '0',
      }),
    ).toThrow('Invalid database configuration: DATABASE_PORT');

    try {
      loadDatabaseConfig({
        ...validDatabaseEnv(),
        DATABASE_PASSWORD: password,
        DATABASE_PORT: '0',
      });
    } catch (error) {
      expect(error instanceof Error ? error.message : '').not.toContain(password);
    }
  });

  it('sanitizes database initialization failures', async () => {
    const password = 'do-not-expose-this-password';
    const database = createDatabase(
      loadDatabaseConfig({
        ...validDatabaseEnv(),
        DATABASE_HOST: '127.0.0.1',
        DATABASE_PORT: '1',
        DATABASE_PASSWORD: password,
      }),
    );

    await expect(database.initialize()).rejects.toThrow('Database initialization failed');
  });
});
