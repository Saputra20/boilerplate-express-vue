import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { roles, userRoles, users } from '../../../config/drizzle/schema/index.js';
import type { AuditService } from '../../audit/services/audit.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema/index.js')>;

export type AuthenticatedUserRecord = {
  id: string;
  email: string;
  displayName: string | null;
  mustChangePassword: boolean;
  roles: readonly string[];
};

export type AuthenticatedUserRepository = {
  findActiveUser(input: { userId: string }): Promise<AuthenticatedUserRecord | null>;
  updateDisplayName(input: {
    userId: string;
    displayName: string;
    requestId: string;
    sessionId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<'updated' | 'unchanged' | 'invalid_authentication' | 'password_change_required'>;
};

type Executor = Pick<Database, 'insert'>;

export function createAuthenticatedUserRepository(
  database: Database,
  audit: AuditService<Executor>,
): AuthenticatedUserRepository {
  return {
    async findActiveUser({ userId }) {
      const rows = await database
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          mustChangePassword: users.mustChangePassword,
          roleCode: roles.code,
        })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .leftJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(eq(users.id, userId), eq(users.status, 'active'), isNull(users.deletedAt)));

      const first = rows[0];
      if (first === undefined) return null;

      return {
        id: first.id,
        email: first.email,
        displayName: first.displayName,
        mustChangePassword: first.mustChangePassword,
        roles: [
          ...new Set(rows.flatMap((row) => (row.roleCode === null ? [] : [row.roleCode]))),
        ].sort(),
      };
    },
    async updateDisplayName(input) {
      return database.transaction(async (tx) => {
        const [user] = await tx
          .select({
            id: users.id,
            displayName: users.displayName,
            status: users.status,
            deletedAt: users.deletedAt,
            mustChangePassword: users.mustChangePassword,
          })
          .from(users)
          .where(eq(users.id, input.userId))
          .for('update')
          .limit(1);
        if (!user || user.status !== 'active' || user.deletedAt !== null)
          return 'invalid_authentication';
        if (user.mustChangePassword) return 'password_change_required';
        if (user.displayName === input.displayName) return 'unchanged';
        await tx
          .update(users)
          .set({ displayName: input.displayName })
          .where(eq(users.id, input.userId));
        await audit.recordRequired(
          {
            eventType: 'user.profile_updated',
            actorType: 'user',
            actorUserId: input.userId,
            resourceType: 'user',
            resourceId: input.userId,
            outcome: 'success',
            requestId: input.requestId,
            sessionId: input.sessionId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { changedFields: ['displayName'] },
          },
          tx,
        );
        return 'updated';
      });
    },
  };
}
