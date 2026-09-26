import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { lowercaseText } from './custom-types.js';

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: lowercaseText('code').notNull().unique(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      'permissions_code_format_check',
      sql`${table.code} ~ '^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$'`,
    ),
  ],
);
