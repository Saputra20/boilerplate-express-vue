import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { permissions, rolePermissions, userRoles } from '../database/schema.js';
import type { PermissionRepository } from './permission-service.js';

type Database = NodePgDatabase<typeof import('../database/schema.js')>;

export function createPermissionRepository(database: Database): PermissionRepository {
  return {
    async resolvePermission({ userId, permission }) {
      const rows = await database
        .select({ assignedRoleId: userRoles.roleId })
        .from(permissions)
        .leftJoin(rolePermissions, eq(rolePermissions.permissionId, permissions.id))
        .leftJoin(
          userRoles,
          and(eq(userRoles.roleId, rolePermissions.roleId), eq(userRoles.userId, userId)),
        )
        .where(eq(permissions.code, permission));

      if (rows.length === 0) return 'unknown';
      return rows.some((row) => row.assignedRoleId !== null) ? 'granted' : 'denied';
    },
  };
}
