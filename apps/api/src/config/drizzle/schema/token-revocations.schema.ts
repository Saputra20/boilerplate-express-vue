import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authSessions } from './auth-sessions.schema.js';
import { users } from './users.schema.js';

export const tokenRevocations = pgTable(
  'token_revocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jti: uuid('jti').notNull().unique(),
    tokenType: text('token_type').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => authSessions.id, { onDelete: 'cascade' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    reason: text('reason').notNull(),
  },
  (table) => [
    index('token_revocations_expires_at_index').on(table.expiresAt),
    index('token_revocations_session_id_index').on(table.sessionId),
    check('token_revocations_token_type_check', sql`${table.tokenType} = 'access'`),
    check(
      'token_revocations_reason_check',
      sql`${table.reason} IN ('LOGOUT', 'LOGOUT_ALL', 'REFRESH_REUSE', 'SESSION_REVOKED')`,
    ),
  ],
);
