import { and, asc, count, desc, eq, ilike, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { authSessions, roles, userRoles, users } from '../../../config/drizzle/schema.js';
import type { AuditService } from '../../audit/services/audit.service.js';
import type { UserList, UserRepository } from '../services/user.service.js';
type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema.js')>;
type Executor = Pick<Database, 'insert'>;
export function createUserRepository(
  database: Database,
  auditService: AuditService<Executor>,
): UserRepository {
  return {
    async create(input, audit) {
      return database.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            email: input.email,
            status: 'active',
            passwordHash: input.passwordHash,
            mustChangePassword: true,
          })
          .returning();
        if (!user) throw new Error('User insert returned no row');
        await tx.insert(userRoles).values({ userId: user.id, roleId: input.roleId });
        await auditService.recordRequired({ ...audit, resourceId: user.id }, tx);
        const [assignedRole] = await tx
          .select({ id: roles.id, code: roles.code, name: roles.name })
          .from(roles)
          .where(eq(roles.id, input.roleId))
          .limit(1);
        return { ...user, role: assignedRole ?? null };
      });
    },
    async list(input): Promise<UserList> {
      const filters = [isNull(users.deletedAt)];
      if (input.search) filters.push(ilike(users.email, `%${input.search}%`));
      if (input.status) filters.push(eq(users.status, input.status));
      const order =
        input.sort === 'email.asc'
          ? asc(users.email)
          : input.sort === 'email.desc'
            ? desc(users.email)
            : input.sort === 'createdAt.asc'
              ? asc(users.createdAt)
              : desc(users.createdAt);
      const offset = (input.page - 1) * input.limit;
      const [rows, totals] = await Promise.all([
        database
          .select({ user: users, role: { id: roles.id, code: roles.code, name: roles.name } })
          .from(users)
          .leftJoin(userRoles, eq(userRoles.userId, users.id))
          .leftJoin(roles, eq(roles.id, userRoles.roleId))
          .where(and(...filters))
          .orderBy(order, asc(users.id))
          .limit(input.limit)
          .offset(offset),
        database
          .select({ total: count() })
          .from(users)
          .where(and(...filters)),
      ]);
      const total = Number(totals[0]?.total ?? 0);
      return {
        items: rows.map(({ user, role }) => ({ ...user, role: role?.id ? role : null })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    },
    async findById(id) {
      const [row] = await database
        .select({ user: users, role: { id: roles.id, code: roles.code, name: roles.name } })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .leftJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .limit(1);
      return row ? { ...row.user, role: row.role?.id ? row.role : null } : null;
    },
    async update(id, input, audit) {
      return database.transaction(async (tx) => {
        const { roleId, ...fields } = input;
        const userFields =
          input.email === undefined ? fields : { ...fields, emailVerifiedAt: null };
        const [user] = await tx
          .update(users)
          .set(userFields)
          .where(and(eq(users.id, id), isNull(users.deletedAt)))
          .returning();
        if (!user) return null;
        if (roleId !== undefined) {
          await tx.delete(userRoles).where(eq(userRoles.userId, id));
          if (roleId !== null) await tx.insert(userRoles).values({ userId: id, roleId });
        }
        const [assignment] = await tx
          .select({ id: roles.id, code: roles.code, name: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(eq(userRoles.userId, id))
          .limit(1);
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(authSessions.userId, id), isNull(authSessions.revokedAt)));
        await auditService.recordRequired({ ...audit, resourceId: id }, tx);
        return { ...user, role: assignment ?? null };
      });
    },
    async softDelete(id, audit) {
      return database.transaction(async (tx) => {
        const [user] = await tx
          .select({ email: users.email, roleId: userRoles.roleId })
          .from(users)
          .leftJoin(userRoles, eq(userRoles.userId, users.id))
          .where(and(eq(users.id, id), isNull(users.deletedAt)))
          .limit(1);
        if (!user) return 'missing';
        if (user.email === 'developer@dispostable.com') return 'protected';
        if (user.roleId) {
          const [role] = await tx
            .select({ code: roles.code })
            .from(roles)
            .where(eq(roles.id, user.roleId));
          if (role?.code === 'admin') {
            const [{ total }] = await tx
              .select({ total: count() })
              .from(userRoles)
              .innerJoin(users, eq(users.id, userRoles.userId))
              .where(
                and(
                  eq(userRoles.roleId, user.roleId),
                  eq(users.status, 'active'),
                  isNull(users.deletedAt),
                ),
              );
            if (Number(total) <= 1) return 'lastAdmin';
          }
        }
        await tx
          .update(users)
          .set({ deletedAt: new Date(), status: 'disabled' })
          .where(eq(users.id, id));
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(authSessions.userId, id), isNull(authSessions.revokedAt)));
        await auditService.recordRequired({ ...audit, resourceId: id }, tx);
        return 'deleted';
      });
    },
  };
}
