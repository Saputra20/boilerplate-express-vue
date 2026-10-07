import { and, count, desc, eq, gte, ilike, inArray, lte, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { auditEvents, users } from '../../../config/drizzle/schema/index.js';
import {
  AUDIT_EVENT_CATALOG,
  type AuditReadRepository,
  type AuditReadFilters,
} from '../services/audit-read.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema/index.js')>;

const visibleEventTypes = Object.keys(AUDIT_EVENT_CATALOG) as Array<
  keyof typeof AUDIT_EVENT_CATALOG
>;

export function createAuditReadRepository(database: Database): AuditReadRepository {
  return {
    async list(filters) {
      const rows = await database
        .select(auditEventSelection)
        .from(auditEvents)
        .where(auditConditions(filters))
        .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
        .limit(filters.limit + 1);

      return {
        rows: rows.slice(0, filters.limit),
        hasMore: rows.length > filters.limit,
      };
    },

    async listPage(filters) {
      const where = auditConditions(filters);
      const [countRow] = await database.select({ total: count() }).from(auditEvents).where(where);
      const total = Number(countRow?.total ?? 0);
      const page = filters.page ?? 1;
      const offset = (page - 1) * filters.limit;
      if (offset >= total) return { rows: [], total };
      const rows = await database
        .select(auditEventSelection)
        .from(auditEvents)
        .where(where)
        .orderBy(desc(auditEvents.createdAt), desc(auditEvents.id))
        .limit(filters.limit)
        .offset(offset);
      return { rows, total };
    },

    async findVisible(id) {
      const [row] = await database
        .select(auditEventSelection)
        .from(auditEvents)
        .where(and(eq(auditEvents.id, id), inArray(auditEvents.eventType, visibleEventTypes)))
        .limit(1);
      return row ?? null;
    },

    async findActor(id) {
      const [actor] = await database
        .select({ id: users.id, displayName: users.displayName, email: users.email })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return actor ?? null;
    },
  };
}

const auditEventSelection = {
  id: auditEvents.id,
  eventType: auditEvents.eventType,
  actorSnapshotId: auditEvents.actorSnapshotId,
  actorSnapshotDisplayName: auditEvents.actorSnapshotDisplayName,
  actorSnapshotEmail: auditEvents.actorSnapshotEmail,
  actorType: auditEvents.actorType,
  resourceType: auditEvents.resourceType,
  resourceId: auditEvents.resourceId,
  outcome: auditEvents.outcome,
  requestId: auditEvents.requestId,
  metadata: auditEvents.metadata,
  createdAt: auditEvents.createdAt,
};

function auditConditions(filters: AuditReadFilters) {
  const conditions = [
    inArray(auditEvents.eventType, visibleEventTypes),
    gte(auditEvents.createdAt, filters.from),
    lte(auditEvents.createdAt, filters.to),
  ];
  if (filters.actorId) conditions.push(eq(auditEvents.actorSnapshotId, filters.actorId));
  if (filters.eventType) conditions.push(eq(auditEvents.eventType, filters.eventType));
  if (filters.resourceType) conditions.push(eq(auditEvents.resourceType, filters.resourceType));
  if (filters.resourceId) conditions.push(eq(auditEvents.resourceId, filters.resourceId));
  if (filters.outcome) conditions.push(eq(auditEvents.outcome, filters.outcome));
  if (filters.search) {
    const pattern = `%${escapeLike(filters.search)}%`;
    conditions.push(
      or(
        ilike(auditEvents.actorSnapshotDisplayName, pattern),
        ilike(auditEvents.resourceType, pattern),
        ilike(auditEvents.resourceId, pattern),
      )!,
    );
  }
  return and(...conditions);
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}
