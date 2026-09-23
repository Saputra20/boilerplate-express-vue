import { lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { auditEvents } from '../database/schema.js';
import type { AuditRepository } from './audit-service.js';

type Database = NodePgDatabase<typeof import('../database/schema.js')>;

export type AuditExecutor = Pick<Database, 'delete' | 'insert'>;

export function createAuditRepository(database: Database): AuditRepository<AuditExecutor> {
  return {
    async append(event, executor = database) {
      await executor.insert(auditEvents).values(event);
    },

    async cleanupBefore(before, executor = database) {
      const deleted = await executor
        .delete(auditEvents)
        .where(lt(auditEvents.createdAt, before))
        .returning({ id: auditEvents.id });
      return deleted.length;
    },
  };
}
