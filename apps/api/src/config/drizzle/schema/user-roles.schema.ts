import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { roles } from './roles.schema.js';
import { users } from './users.schema.js';

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index('user_roles_role_id_index').on(table.roleId),
  ],
);
