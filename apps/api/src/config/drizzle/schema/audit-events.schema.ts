import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authSessions } from './auth-sessions.schema.js';
import { users } from './users.schema.js';

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventType: text('event_type').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorSnapshotId: uuid('actor_snapshot_id'),
    actorSnapshotDisplayName: text('actor_snapshot_display_name'),
    actorSnapshotEmail: text('actor_snapshot_email'),
    actorType: text('actor_type').notNull(),
    resourceType: text('resource_type'),
    resourceId: text('resource_id'),
    outcome: text('outcome').notNull(),
    reasonCode: text('reason_code'),
    requestId: uuid('request_id'),
    sessionId: uuid('session_id').references(() => authSessions.id, { onDelete: 'set null' }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_events_created_at_index').on(table.createdAt),
    index('audit_events_created_at_id_index').on(table.createdAt, table.id),
    index('audit_events_event_type_index').on(table.eventType),
    index('audit_events_actor_user_id_index').on(table.actorUserId),
    index('audit_events_actor_snapshot_id_index').on(table.actorSnapshotId),
    index('audit_events_resource_type_resource_id_index').on(table.resourceType, table.resourceId),
    check('audit_events_actor_type_check', sql`${table.actorType} IN ('user', 'system')`),
    check('audit_events_outcome_check', sql`${table.outcome} IN ('success', 'failure')`),
  ],
);
