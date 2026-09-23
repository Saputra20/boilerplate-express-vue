import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { z } from 'zod';
import type { DatabaseConfig } from './config.js';

const journalSchema = z.object({
  entries: z.array(
    z.object({
      tag: z.string().min(1),
      when: z.number().int(),
    }),
  ),
});

type RollbackMigration = {
  tag: string;
  when: number;
  statements: string[];
};

export async function readRollbackMigrations(
  migrationsDirectory: string,
): Promise<RollbackMigration[]> {
  const journalContent = await readFile(`${migrationsDirectory}/meta/_journal.json`, 'utf8');
  const journal = journalSchema.parse(JSON.parse(journalContent));

  return Promise.all(
    [...journal.entries].reverse().map(async (entry) => {
      const downContent = await readFile(`${migrationsDirectory}/${entry.tag}.down.sql`, 'utf8');
      const statements = downContent
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter(Boolean);

      if (statements.length === 0) {
        throw new Error(`Rollback migration has no statements: ${entry.tag}`);
      }

      return { ...entry, statements };
    }),
  );
}

export async function rollbackMigrations(
  config: DatabaseConfig,
  migrationsDirectory: string,
): Promise<void> {
  const pool = new Pool(config);

  try {
    const migrations = await readRollbackMigrations(migrationsDirectory);

    for (const migration of migrations) {
      const connection = await pool.connect();

      try {
        await connection.query('BEGIN');
        for (const statement of migration.statements) {
          await connection.query(statement);
        }
        await connection.query('DELETE FROM drizzle.__drizzle_migrations WHERE created_at = $1', [
          migration.when,
        ]);
        await connection.query('COMMIT');
      } catch {
        await connection.query('ROLLBACK');
        throw new Error(`Database rollback failed: ${migration.tag}`);
      } finally {
        connection.release();
      }
    }
  } finally {
    await pool.end();
  }
}
