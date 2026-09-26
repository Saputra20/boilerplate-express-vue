import { and, asc, count, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { permissions, rolePermissions, roles, userRoles } from '../../../config/drizzle/schema.js';
import type { AuditService } from '../../audit/services/audit.service.js';
import type { RoleList, RoleRepository } from '../services/role.service.js';
import { InvalidRolePermissionsError } from '../services/role.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema.js')>;
type AuditExecutor = Pick<Database, 'insert'>;

export function createRoleRepository(
  database: Database,
  auditService: AuditService<AuditExecutor>,
): RoleRepository {
  return {
    async create(input, audit) {
      return database.transaction(async (transaction) => {
        const [role] = await transaction
          .insert(roles)
          .values({
            code: input.code,
            name: input.name,
            description: input.description ?? null,
          })
          .returning();
        if (!role) throw new Error('Role insert returned no row');
        if (input.permissionCodes.length > 0) {
          const available = await transaction
            .select({ id: permissions.id, code: permissions.code })
            .from(permissions);
          const selected = available.filter((permission) =>
            input.permissionCodes.includes(permission.code),
          );
          if (selected.length !== new Set(input.permissionCodes).size)
            throw new InvalidRolePermissionsError();
          await transaction
            .insert(rolePermissions)
            .values(
              selected.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
            );
        }
        await auditService.recordRequired({ ...audit, resourceId: role.id }, transaction);
        return { ...role, permissionCodes: [...input.permissionCodes].sort() };
      });
    },
    async list(input): Promise<RoleList> {
      const filters = input.search ? [ilike(roles.name, `%${input.search}%`)] : [sql`true`];
      const orderBy =
        input.sort === 'name.asc'
          ? asc(roles.name)
          : input.sort === 'name.desc'
            ? desc(roles.name)
            : input.sort === 'createdAt.asc'
              ? asc(roles.createdAt)
              : desc(roles.createdAt);
      const offset = (input.page - 1) * input.limit;
      const [rows, totalRows] = await Promise.all([
        database
          .select()
          .from(roles)
          .where(and(...filters))
          .orderBy(orderBy, asc(roles.id))
          .limit(input.limit)
          .offset(offset),
        database
          .select({ total: count() })
          .from(roles)
          .where(and(...filters)),
      ]);
      const total = Number(totalRows[0]?.total ?? 0);
      const permissionRows = rows.length
        ? await database
            .select({ roleId: rolePermissions.roleId, code: permissions.code })
            .from(rolePermissions)
            .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
            .where(
              inArray(
                rolePermissions.roleId,
                rows.map(({ id }) => id),
              ),
            )
        : [];
      const codesByRole = new Map<string, string[]>();
      for (const { roleId, code } of permissionRows) {
        const codes = codesByRole.get(roleId) ?? [];
        codes.push(code);
        codesByRole.set(roleId, codes);
      }
      return {
        items: rows.map((role) => ({
          ...role,
          permissionCodes: (codesByRole.get(role.id) ?? []).sort(),
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    },
    async findById(id) {
      const [role] = await database.select().from(roles).where(eq(roles.id, id)).limit(1);
      return role
        ? { ...role, permissionCodes: await listRolePermissionCodes(database, role.id) }
        : null;
    },
    async update(id, input, audit) {
      return database.transaction(async (transaction) => {
        const [role] = await transaction
          .update(roles)
          .set({ name: input.name, description: input.description })
          .where(eq(roles.id, id))
          .returning();
        if (!role) return null;
        const assigned = await transaction
          .select({ id: permissions.id, code: permissions.code })
          .from(permissions);
        const permissionCodes = input.permissionCodes;
        let selected = assigned.filter((permission) => permissionCodes?.includes(permission.code));
        if (permissionCodes !== undefined) {
          if (selected.length !== new Set(permissionCodes).size)
            throw new InvalidRolePermissionsError();
          await transaction.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
          if (selected.length > 0) {
            await transaction
              .insert(rolePermissions)
              .values(selected.map((permission) => ({ roleId: id, permissionId: permission.id })));
          }
        } else {
          selected = await transaction
            .select({ id: permissions.id, code: permissions.code })
            .from(permissions)
            .innerJoin(rolePermissions, eq(rolePermissions.permissionId, permissions.id))
            .where(eq(rolePermissions.roleId, id));
        }
        await auditService.recordRequired({ ...audit, resourceId: role.id }, transaction);
        return { ...role, permissionCodes: selected.map((permission) => permission.code).sort() };
      });
    },
    async delete(id, audit) {
      return database.transaction(async (transaction) => {
        const [assignment] = await transaction
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(eq(userRoles.roleId, id))
          .limit(1);
        if (assignment) return 'assigned';
        const deleted = await transaction
          .delete(roles)
          .where(eq(roles.id, id))
          .returning({ id: roles.id });
        if (deleted.length === 0) return 'missing';
        await auditService.recordRequired({ ...audit, resourceId: id }, transaction);
        return 'deleted';
      });
    },
  };
}

async function listRolePermissionCodes(database: Database, roleId: string): Promise<string[]> {
  const rows = await database
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, roleId));
  return rows.map(({ code }) => code).sort();
}
