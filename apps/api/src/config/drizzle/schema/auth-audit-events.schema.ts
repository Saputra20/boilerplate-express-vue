import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authSessions } from './auth-sessions.schema.js';
import { users } from './users.schema.js';

export const authAuditEvents = pgTable(
  'auth_audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventType: text('event_type').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: uuid('session_id').references(() => authSessions.id, { onDelete: 'set null' }),
    requestId: uuid('request_id').notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('auth_audit_events_user_id_index').on(table.userId),
    index('auth_audit_events_session_id_index').on(table.sessionId),
    index('auth_audit_events_created_at_index').on(table.createdAt),
    check(
      'auth_audit_events_event_type_check',
      sql`${table.eventType} IN ('auth.login.succeeded', 'auth.login.failed', 'auth.refresh.succeeded', 'auth.refresh.failed', 'auth.refresh.reuse_detected', 'auth.session.revoked_due_to_refresh_reuse', 'auth.logout.succeeded', 'auth.logout_all.succeeded', 'auth.logout.failed', 'auth.logout_all.failed')`,
    ),
    check(
      'auth_audit_events_reason_check',
      sql`${table.reason} IS NULL OR ${table.reason} IN ('INVALID_CREDENTIALS', 'ACCOUNT_DISABLED', 'ACCOUNT_DELETED', 'RATE_LIMITED', 'INTERNAL_ERROR', 'INVALID_REFRESH_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_REVOKED', 'TOKEN_REUSED', 'SESSION_EXPIRED', 'SESSION_REVOKED', 'LOGOUT', 'LOGOUT_ALL')`,
    ),
  ],
);
