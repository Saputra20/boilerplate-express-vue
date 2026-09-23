import { defineConfig } from 'drizzle-kit';
import { loadDatabaseConfig } from './src/database/config.js';

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: loadDatabaseConfig(),
});
