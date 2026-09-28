import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema.js';

export const authChallenges = pgTable(
  'auth_challenges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('auth_challenges_user_purpose_created_index').on(
      table.userId,
      table.purpose,
      table.createdAt,
    ),
    index('auth_challenges_purpose_expires_index').on(table.purpose, table.expiresAt),
    check(
      'auth_challenges_purpose_check',
      sql`${table.purpose} IN ('email_verification', 'password_reset')`,
    ),
  ],
);
