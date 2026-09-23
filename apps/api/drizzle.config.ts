import { defineConfig } from 'drizzle-kit';
import { loadDatabaseConfig } from './src/config/database/config.js';

export default defineConfig({
  schema: './src/config/drizzle/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: loadDatabaseConfig(),
});
