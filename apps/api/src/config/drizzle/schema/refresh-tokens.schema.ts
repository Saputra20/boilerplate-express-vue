import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authSessions } from './auth-sessions.schema.js';

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => authSessions.id, { onDelete: 'cascade' }),
    jti: uuid('jti').notNull().unique(),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedByTokenId: uuid('replaced_by_token_id').references(
      (): AnyPgColumn => refreshTokens.id,
      {
        onDelete: 'set null',
      },
    ),
  },
  (table) => [
    index('refresh_tokens_session_id_index').on(table.sessionId),
    index('refresh_tokens_expires_at_index').on(table.expiresAt),
  ],
);
