import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDatabaseConfig } from '../src/config/database/config.js';
import { rollbackMigrations } from '../src/config/drizzle/rollback.js';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Database rollback requires NODE_ENV=test');
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));

try {
  await rollbackMigrations(loadDatabaseConfig(), resolve(currentDirectory, '../drizzle'));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Database rollback failed');
  process.exitCode = 1;
}
