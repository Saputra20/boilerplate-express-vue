import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { permissions, rolePermissions, userRoles } from '../../../config/drizzle/schema.js';
import type { PermissionRepository } from '../services/permission.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema.js')>;

export function createPermissionRepository(database: Database): PermissionRepository {
  return {
    async listCatalog() {
      return database
        .select({
          id: permissions.id,
          code: permissions.code,
          description: permissions.description,
        })
        .from(permissions)
        .orderBy(permissions.code);
    },
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
    async listEffectivePermissions({ userId }) {
      const rows = await database
        .select({ code: permissions.code })
        .from(permissions)
        .innerJoin(rolePermissions, eq(rolePermissions.permissionId, permissions.id))
        .innerJoin(
          userRoles,
          and(eq(userRoles.roleId, rolePermissions.roleId), eq(userRoles.userId, userId)),
        );

      return [...new Set(rows.map((row) => row.code))].sort();
    },
  };
}
