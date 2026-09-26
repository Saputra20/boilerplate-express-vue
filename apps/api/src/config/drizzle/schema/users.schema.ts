import { sql } from 'drizzle-orm';
import { boolean, check, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { lowercaseText } from './custom-types.js';

export const userStatus = pgEnum('user_status', ['active', 'disabled']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: lowercaseText('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    mustChangePassword: boolean('must_change_password').default(false).notNull(),
    status: userStatus('status').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [check('users_email_lowercase_check', sql`${table.email} = lower(${table.email})`)],
);
