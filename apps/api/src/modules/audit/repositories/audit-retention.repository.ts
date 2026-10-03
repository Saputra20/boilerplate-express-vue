import type { Pool, PoolClient } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AuditRetentionExecutor,
  AuditRetentionRepository,
} from '../services/audit-retention.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema/index.js')> & {
  $client: Pool;
};

const ADVISORY_LOCK_KEY_SQL = "hashtext('safial.audit.retention')";

export function createAuditRetentionRepository(database: Database): AuditRetentionRepository {
  return {
    async withLock<T>(work: (executor: AuditRetentionExecutor) => Promise<T>) {
      const client = await database.$client.connect();
      let locked = false;

      try {
        const result = await client.query<{ locked: boolean }>(
          `SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY_SQL}) AS locked`,
        );
        locked = result.rows[0]?.locked === true;
        if (!locked) return undefined;

        return await work(createExecutor(client));
      } finally {
        if (locked) {
          await client
            .query(`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY_SQL})`)
            .catch(() => undefined);
        }
        client.release();
      }
    },
  };
}

function createExecutor(client: PoolClient): AuditRetentionExecutor {
  return {
    deleteAuditEvents: (cutoff, limit, timeoutMs) =>
      deleteBatch(client, 'audit_events', cutoff, limit, timeoutMs),
    deleteAuthAuditEvents: (cutoff, limit, timeoutMs) =>
      deleteBatch(client, 'auth_audit_events', cutoff, limit, timeoutMs),
  };
}

async function deleteBatch(
  client: PoolClient,
  table: 'audit_events' | 'auth_audit_events',
  cutoff: Date,
  limit: number,
  timeoutMs: number,
): Promise<number> {
  await client.query('BEGIN');

  try {
    await client.query("SELECT set_config('statement_timeout', $1, true)", [
      `${Math.max(1, Math.floor(timeoutMs))}ms`,
    ]);
    const result = await client.query(
      `WITH eligible AS (
         SELECT "id"
         FROM "${table}"
         WHERE "created_at" < $1
         ORDER BY "created_at" ASC, "id" ASC
         LIMIT $2
       )
       DELETE FROM "${table}" AS target
       USING eligible
       WHERE target."id" = eligible."id"
       RETURNING target."id"`,
      [cutoff, limit],
    );
    await client.query('COMMIT');
    return result.rowCount ?? result.rows.length;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}
