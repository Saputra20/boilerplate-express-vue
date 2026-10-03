import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { roles, userRoles, users } from '../../../config/drizzle/schema/index.js';
import type { AuditEvent, AuditService } from '../../audit/services/audit.service.js';

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
      const result = await database.transaction(async (tx) => {
        const [user] = await tx
          .select({
            id: users.id,
            email: users.email,
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
          return 'invalid_authentication' as const;
        if (user.mustChangePassword) return 'password_change_required' as const;
        if (user.displayName === input.displayName) return 'unchanged' as const;
        await tx
          .update(users)
          .set({ displayName: input.displayName })
          .where(eq(users.id, input.userId));
        return {
          status: 'updated' as const,
          audit: {
            eventType: 'user.profile_updated' as const,
            actorType: 'user' as const,
            actorUserId: input.userId,
            actorSnapshotId: user.id,
            actorSnapshotDisplayName: input.displayName,
            actorSnapshotEmail: user.email,
            resourceType: 'user' as const,
            resourceId: input.userId,
            outcome: 'success' as const,
            requestId: input.requestId,
            sessionId: input.sessionId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: {
              before: { displayName: user.displayName },
              after: { displayName: input.displayName },
            },
          } satisfies AuditEvent,
        };
      });
      if (typeof result === 'string') return result;
      await audit.recordInformational(result.audit);
      return result.status;
    },
  };
}
