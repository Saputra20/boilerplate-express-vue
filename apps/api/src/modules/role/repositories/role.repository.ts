import { and, asc, count, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../../../config/drizzle/schema/index.js';
import type { AuditEvent, AuditService } from '../../audit/services/audit.service.js';
import type { RoleList, RoleRepository } from '../services/role.service.js';
import { InvalidRolePermissionsError } from '../services/role.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema/index.js')>;
type AuditExecutor = Pick<Database, 'insert'>;
type Role = typeof roles.$inferSelect;
type RoleAuditValues = {
  code: Role['code'];
  name: Role['name'];
  description: Role['description'];
  permissionCodes: string[];
};
type RoleAuditMetadata = {
  before: Partial<RoleAuditValues> | null;
  after: Partial<RoleAuditValues> | null;
};
type ActorSnapshot = {
  actorSnapshotId: string;
  actorSnapshotDisplayName: string | null;
  actorSnapshotEmail: string | null;
};

export function createRoleRepository(
  database: Database,
  auditService: AuditService<AuditExecutor>,
): RoleRepository {
  return {
    async create(input, audit) {
      const result = await database.transaction(async (transaction) => {
        const [role] = await transaction
          .insert(roles)
          .values({
            code: input.code,
            name: input.name,
            description: input.description ?? null,
          })
          .returning();
        if (!role) throw new Error('Role insert returned no row');
        const permissionCodes = [...input.permissionCodes].sort();
        if (permissionCodes.length > 0) {
          const available = await transaction
            .select({ id: permissions.id, code: permissions.code })
            .from(permissions);
          const selected = available.filter((permission) =>
            permissionCodes.includes(permission.code),
          );
          if (selected.length !== new Set(permissionCodes).size)
            throw new InvalidRolePermissionsError();
          await transaction
            .insert(rolePermissions)
            .values(
              selected.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
            );
        }
        return {
          role: { ...role, permissionCodes },
          audit: createAuditEvent(
            'role.created',
            audit,
            await actorSnapshot(transaction, audit.actorUserId),
            role.id,
            { before: null, after: roleValues(role, permissionCodes) },
          ),
        };
      });
      await auditService.recordInformational(result.audit);
      return result.role;
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
      const result = await database.transaction(async (transaction) => {
        const [beforeRole] = await transaction
          .select()
          .from(roles)
          .where(eq(roles.id, id))
          .for('update')
          .limit(1);
        if (!beforeRole) return null;
        const beforePermissionCodes = await listRolePermissionCodes(transaction, id);
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
        const nextPermissionCodes = selected.map((permission) => permission.code).sort();
        return {
          role: { ...role, permissionCodes: nextPermissionCodes },
          audit: createAuditEvent(
            'role.updated',
            audit,
            await actorSnapshot(transaction, audit.actorUserId),
            role.id,
            roleChanges(
              roleValues(beforeRole, beforePermissionCodes),
              roleValues(role, nextPermissionCodes),
            ),
          ),
        };
      });
      if (!result) return null;
      await auditService.recordInformational(result.audit);
      return result.role;
    },
    async delete(id, audit) {
      const result = await database.transaction(async (transaction) => {
        const [beforeRole] = await transaction
          .select()
          .from(roles)
          .where(eq(roles.id, id))
          .for('update')
          .limit(1);
        if (!beforeRole) return 'missing' as const;
        const [assignment] = await transaction
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(eq(userRoles.roleId, id))
          .limit(1);
        if (assignment) return 'assigned' as const;
        const permissionCodes = await listRolePermissionCodes(transaction, id);
        const deleted = await transaction
          .delete(roles)
          .where(eq(roles.id, id))
          .returning({ id: roles.id });
        if (deleted.length === 0) return 'missing' as const;
        return {
          status: 'deleted' as const,
          audit: createAuditEvent(
            'role.deleted',
            audit,
            await actorSnapshot(transaction, audit.actorUserId),
            id,
            { before: roleValues(beforeRole, permissionCodes), after: null },
          ),
        };
      });
      if (result === 'missing' || result === 'assigned') return result;
      await auditService.recordInformational(result.audit);
      return result.status;
    },
  };
}

async function listRolePermissionCodes(
  database: Pick<Database, 'select'>,
  roleId: string,
): Promise<string[]> {
  const rows = await database
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, roleId));
  return rows.map(({ code }) => code).sort();
}

async function actorSnapshot(
  transaction: Pick<Database, 'select'>,
  actorUserId: string | null | undefined,
): Promise<ActorSnapshot> {
  if (!actorUserId) throw new Error('Audit actor missing');
  const [actor] = await transaction
    .select({ id: users.id, displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, actorUserId))
    .limit(1);
  return {
    actorSnapshotId: actorUserId,
    actorSnapshotDisplayName: actor?.displayName ?? null,
    actorSnapshotEmail: actor?.email ?? null,
  };
}

function createAuditEvent(
  eventType: AuditEvent['eventType'],
  context: Pick<AuditEvent, 'requestId' | 'sessionId'>,
  actor: ActorSnapshot,
  resourceId: string,
  metadata: RoleAuditMetadata,
) {
  return {
    eventType,
    actorType: 'user' as const,
    actorUserId: actor.actorSnapshotId,
    ...actor,
    resourceType: 'role',
    resourceId,
    outcome: 'success' as const,
    requestId: context.requestId,
    sessionId: context.sessionId,
    metadata,
  };
}

function roleValues(role: Role, permissionCodes: string[]): RoleAuditValues {
  return {
    code: role.code,
    name: role.name,
    description: role.description,
    permissionCodes: [...permissionCodes].sort(),
  };
}

function roleChanges(before: RoleAuditValues, after: RoleAuditValues): RoleAuditMetadata {
  const beforeChanges: Partial<RoleAuditValues> = {};
  const afterChanges: Partial<RoleAuditValues> = {};
  if (before.code !== after.code) {
    beforeChanges.code = before.code;
    afterChanges.code = after.code;
  }
  if (before.name !== after.name) {
    beforeChanges.name = before.name;
    afterChanges.name = after.name;
  }
  if (before.description !== after.description) {
    beforeChanges.description = before.description;
    afterChanges.description = after.description;
  }
  if (JSON.stringify(before.permissionCodes) !== JSON.stringify(after.permissionCodes)) {
    beforeChanges.permissionCodes = before.permissionCodes;
    afterChanges.permissionCodes = after.permissionCodes;
  }
  return { before: beforeChanges, after: afterChanges };
}
