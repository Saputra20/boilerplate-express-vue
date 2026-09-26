import { and, asc, count, desc, eq, ilike, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { roles, userRoles } from '../../../config/drizzle/schema.js';
import type { AuditService } from '../../audit/services/audit.service.js';
import type { RoleList, RoleRepository } from '../services/role.service.js';

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
        await auditService.recordRequired({ ...audit, resourceId: role.id }, transaction);
        return role;
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
      return {
        items: rows,
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
      return role ?? null;
    },
    async update(id, input, audit) {
      return database.transaction(async (transaction) => {
        const [role] = await transaction
          .update(roles)
          .set(input)
          .where(eq(roles.id, id))
          .returning();
        if (role) await auditService.recordRequired({ ...audit, resourceId: role.id }, transaction);
        return role ?? null;
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
