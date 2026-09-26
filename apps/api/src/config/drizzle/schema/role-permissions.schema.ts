import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { permissions } from './permissions.schema.js';
import { roles } from './roles.schema.js';

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index('role_permissions_permission_id_index').on(table.permissionId),
  ],
);
