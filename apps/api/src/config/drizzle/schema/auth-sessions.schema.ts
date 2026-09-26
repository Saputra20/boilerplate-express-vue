import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema.js';

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [
    index('auth_sessions_user_id_index').on(table.userId),
    index('auth_sessions_expires_at_index').on(table.expiresAt),
  ],
);
