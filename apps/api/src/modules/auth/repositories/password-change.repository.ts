import { and, eq, gt, inArray, isNull, ne } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { authSessions, refreshTokens, users } from '../../../config/drizzle/schema/index.js';
import type { AuditService } from '../../audit/services/audit.service.js';
import type {
  PasswordChangeRepository,
  PasswordChangeResult,
} from '../services/password-change.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema/index.js')>;
type Executor = Pick<Database, 'delete' | 'insert'>;

export function createPasswordChangeRepository(
  database: Database,
  audit: AuditService<Executor>,
): PasswordChangeRepository {
  return {
    async change(input): Promise<PasswordChangeResult> {
      return database.transaction(async (tx) => {
        const [user] = await tx
          .select({
            id: users.id,
            passwordHash: users.passwordHash,
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
        if (!user.mustChangePassword) return 'not_required';

        const [session] = await tx
          .select({ id: authSessions.id })
          .from(authSessions)
          .where(
            and(
              eq(authSessions.id, input.sessionId),
              eq(authSessions.userId, input.userId),
              isNull(authSessions.revokedAt),
              gt(authSessions.expiresAt, input.now),
            ),
          )
          .for('update')
          .limit(1);
        if (!session) return 'invalid_authentication';

        const password = await input.verifyAndHash(user.passwordHash);
        if (password.status === 'unchanged') return 'password_unchanged';
        if (password.status !== 'valid') return 'invalid_current_password';

        const [updatedUser] = await tx
          .update(users)
          .set({ passwordHash: password.passwordHash, mustChangePassword: false })
          .where(and(eq(users.id, input.userId), eq(users.mustChangePassword, true)))
          .returning({ id: users.id });
        if (!updatedUser) return 'not_required';

        const revokedSessions = await tx
          .update(authSessions)
          .set({ revokedAt: input.now })
          .where(
            and(
              eq(authSessions.userId, input.userId),
              ne(authSessions.id, input.sessionId),
              isNull(authSessions.revokedAt),
              gt(authSessions.expiresAt, input.now),
            ),
          )
          .returning({ id: authSessions.id });
        const otherSessionIds = revokedSessions.map(({ id }) => id);
        if (otherSessionIds.length > 0) {
          await tx
            .update(refreshTokens)
            .set({ revokedAt: input.now })
            .where(
              and(
                inArray(refreshTokens.sessionId, otherSessionIds),
                isNull(refreshTokens.revokedAt),
                gt(refreshTokens.expiresAt, input.now),
              ),
            );
        }

        await audit.recordRequired(
          {
            eventType: 'auth.password_change.completed',
            actorType: 'user',
            actorUserId: input.userId,
            resourceType: 'user',
            resourceId: input.userId,
            outcome: 'success',
            requestId: input.requestId,
            sessionId: input.sessionId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { otherSessionsRevoked: otherSessionIds.length },
          },
          tx,
        );
        return 'changed';
      });
    },

    async recordInvalidCurrentPassword(input) {
      await audit.recordInformational({
        eventType: 'auth.password_change.failed',
        actorType: 'user',
        actorUserId: input.userId,
        resourceType: 'user',
        resourceId: input.userId,
        outcome: 'failure',
        reasonCode: 'INVALID_CURRENT_PASSWORD',
        requestId: input.requestId,
        sessionId: input.sessionId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: null,
      });
    },
  };
}
