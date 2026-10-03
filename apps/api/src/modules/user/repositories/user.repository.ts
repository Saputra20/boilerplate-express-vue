import { and, asc, count, desc, eq, ilike, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { authSessions, roles, userRoles, users } from '../../../config/drizzle/schema/index.js';
import type { AuditEvent, AuditService } from '../../audit/services/audit.service.js';
import type { UserList, UserRepository } from '../services/user.service.js';
type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema/index.js')>;
type Executor = Pick<Database, 'insert'>;
type User = typeof users.$inferSelect;
type UserAuditValues = {
  email: User['email'];
  roleId: string | null;
  status: User['status'];
};
type UserAuditMetadata = {
  before: Partial<UserAuditValues> | null;
  after: Partial<UserAuditValues> | null;
};
type ActorSnapshot = {
  actorSnapshotId: string;
  actorSnapshotDisplayName: string | null;
  actorSnapshotEmail: string | null;
};

function userValues(user: User, roleId: string | null): UserAuditValues {
  return { email: user.email, roleId, status: user.status };
}

function userChanges(before: UserAuditValues, after: UserAuditValues): UserAuditMetadata {
  const beforeChanges: Partial<UserAuditValues> = {};
  const afterChanges: Partial<UserAuditValues> = {};
  if (before.email !== after.email) {
    beforeChanges.email = before.email;
    afterChanges.email = after.email;
  }
  if (before.roleId !== after.roleId) {
    beforeChanges.roleId = before.roleId;
    afterChanges.roleId = after.roleId;
  }
  if (before.status !== after.status) {
    beforeChanges.status = before.status;
    afterChanges.status = after.status;
  }
  return { before: beforeChanges, after: afterChanges };
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
  metadata: UserAuditMetadata,
) {
  return {
    eventType,
    actorType: 'user' as const,
    actorUserId: actor.actorSnapshotId,
    ...actor,
    resourceType: 'user',
    resourceId,
    outcome: 'success' as const,
    requestId: context.requestId,
    sessionId: context.sessionId,
    metadata,
  };
}
export function createUserRepository(
  database: Database,
  auditService: AuditService<Executor>,
): UserRepository {
  return {
    async create(input, audit) {
      const result = await database.transaction(async (tx) => {
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
        const [assignedRole] = await tx
          .select({ id: roles.id, code: roles.code, name: roles.name })
          .from(roles)
          .where(eq(roles.id, input.roleId))
          .limit(1);
        return {
          user: { ...user, role: assignedRole ?? null },
          audit: createAuditEvent(
            'user.created',
            audit,
            await actorSnapshot(tx, audit.actorUserId),
            user.id,
            { before: null, after: userValues(user, input.roleId) },
          ),
        };
      });
      await auditService.recordInformational(result.audit);
      return result.user;
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
      const result = await database.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(users)
          .where(and(eq(users.id, id), isNull(users.deletedAt)))
          .for('update')
          .limit(1);
        if (!before) return null;
        const [beforeAssignment] = await tx
          .select({ roleId: userRoles.roleId })
          .from(userRoles)
          .where(eq(userRoles.userId, id))
          .limit(1);
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
        const nextRoleId = assignment?.id ?? null;
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(authSessions.userId, id), isNull(authSessions.revokedAt)));
        return {
          user: { ...user, role: assignment ?? null },
          audit: createAuditEvent(
            'user.updated',
            audit,
            await actorSnapshot(tx, audit.actorUserId),
            id,
            userChanges(
              userValues(before, beforeAssignment?.roleId ?? null),
              userValues(user, nextRoleId),
            ),
          ),
        };
      });
      if (!result) return null;
      await auditService.recordInformational(result.audit);
      return result.user;
    },
    async softDelete(id, audit) {
      const result = await database.transaction(async (tx) => {
        const [beforeUser] = await tx
          .select()
          .from(users)
          .where(and(eq(users.id, id), isNull(users.deletedAt)))
          .for('update')
          .limit(1);
        if (!beforeUser) return 'missing' as const;
        const [beforeAssignment] = await tx
          .select({ roleId: userRoles.roleId })
          .from(userRoles)
          .where(eq(userRoles.userId, id))
          .limit(1);
        const before = { user: beforeUser, roleId: beforeAssignment?.roleId ?? null };
        if (before.user.email === 'developer@dispostable.com') return 'protected' as const;
        if (before.roleId) {
          const [role] = await tx
            .select({ code: roles.code })
            .from(roles)
            .where(eq(roles.id, before.roleId));
          if (role?.code === 'admin') {
            const [{ total }] = await tx
              .select({ total: count() })
              .from(userRoles)
              .innerJoin(users, eq(users.id, userRoles.userId))
              .where(
                and(
                  eq(userRoles.roleId, before.roleId),
                  eq(users.status, 'active'),
                  isNull(users.deletedAt),
                ),
              );
            if (Number(total) <= 1) return 'lastAdmin' as const;
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
        return {
          audit: createAuditEvent(
            'user.deleted',
            audit,
            await actorSnapshot(tx, audit.actorUserId),
            id,
            { before: userValues(before.user, before.roleId), after: null },
          ),
        };
      });
      if (result === 'missing' || result === 'protected' || result === 'lastAdmin') return result;
      await auditService.recordInformational(result.audit);
      return 'deleted';
    },
  };
}
