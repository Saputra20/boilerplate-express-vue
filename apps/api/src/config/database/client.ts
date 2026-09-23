import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { DatabaseConfig } from './config.js';
import * as schema from '../drizzle/schema.js';

export function createDatabase(config: DatabaseConfig) {
  const pool = new Pool(config);

  return {
    db: drizzle({ client: pool, schema }),
    async initialize(): Promise<void> {
      try {
        const connection = await pool.connect();
        connection.release();
      } catch {
        await pool.end().catch(() => undefined);
        throw new Error('Database initialization failed');
      }
    },
    close(): Promise<void> {
      return pool.end();
    },
  };
}
