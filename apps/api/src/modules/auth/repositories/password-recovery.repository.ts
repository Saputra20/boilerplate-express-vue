import { and, count, desc, eq, gt, gte, inArray, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  authChallenges,
  authSessions,
  refreshTokens,
  users,
} from '../../../config/drizzle/schema/index.js';
import type { AuditService } from '../../audit/services/audit.service.js';
import type { PasswordRecoveryRepository } from '../services/password-recovery.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema/index.js')>;
type Executor = Pick<Database, 'delete' | 'insert'>;
const PURPOSE = 'password_reset';

export function createPasswordRecoveryRepository(
  database: Database,
  audit: AuditService<Executor>,
): PasswordRecoveryRepository {
  return {
    async issue(input) {
      return database.transaction(async (tx) => {
        const [user] = await tx
          .select({
            id: users.id,
            email: users.email,
            status: users.status,
            deletedAt: users.deletedAt,
          })
          .from(users)
          .where(eq(users.email, input.email))
          .for('update')
          .limit(1);
        if (!user || user.status !== 'active' || user.deletedAt !== null) return null;

        const recent = await tx
          .select({ total: count() })
          .from(authChallenges)
          .where(
            and(
              eq(authChallenges.userId, user.id),
              eq(authChallenges.purpose, PURPOSE),
              gte(authChallenges.createdAt, input.requestLimitBefore),
            ),
          );
        if (Number(recent[0]?.total ?? 0) >= 5) return null;

        const [lastRequest] = await tx
          .select({ createdAt: authChallenges.createdAt })
          .from(authChallenges)
          .where(and(eq(authChallenges.userId, user.id), eq(authChallenges.purpose, PURPOSE)))
          .orderBy(desc(authChallenges.createdAt))
          .limit(1);
        if (lastRequest && lastRequest.createdAt > input.cooldownBefore) return null;

        await tx
          .update(authChallenges)
          .set({ revokedAt: input.now })
          .where(
            and(
              eq(authChallenges.userId, user.id),
              eq(authChallenges.purpose, PURPOSE),
              isNull(authChallenges.usedAt),
              isNull(authChallenges.revokedAt),
            ),
          );

        const [challenge] = await tx
          .insert(authChallenges)
          .values({
            userId: user.id,
            purpose: PURPOSE,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            createdAt: input.now,
          })
          .returning({ id: authChallenges.id });
        if (!challenge) throw new Error('Password reset challenge insert returned no row');

        await audit.recordRequired(
          {
            eventType: 'auth.password_reset.requested',
            actorType: 'system',
            actorUserId: null,
            resourceType: 'auth_challenge',
            resourceId: challenge.id,
            outcome: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { purpose: PURPOSE },
          },
          tx,
        );

        return { challengeId: challenge.id, userId: user.id, email: user.email };
      });
    },

    async consume(input) {
      const [candidate] = await database
        .select({ id: authChallenges.id, userId: authChallenges.userId })
        .from(authChallenges)
        .where(
          and(eq(authChallenges.tokenHash, input.tokenHash), eq(authChallenges.purpose, PURPOSE)),
        )
        .limit(1);
      if (!candidate) return false;

      return database.transaction(async (tx) => {
        const [user] = await tx
          .select({ id: users.id, status: users.status, deletedAt: users.deletedAt })
          .from(users)
          .where(eq(users.id, candidate.userId))
          .for('update')
          .limit(1);
        if (!user || user.status !== 'active' || user.deletedAt !== null) return false;

        const [challenge] = await tx
          .select()
          .from(authChallenges)
          .where(
            and(
              eq(authChallenges.id, candidate.id),
              eq(authChallenges.tokenHash, input.tokenHash),
              eq(authChallenges.purpose, PURPOSE),
            ),
          )
          .for('update')
          .limit(1);
        if (
          !challenge ||
          challenge.usedAt !== null ||
          challenge.revokedAt !== null ||
          challenge.expiresAt <= input.now
        )
          return false;

        const [updatedUser] = await tx
          .update(users)
          .set({ passwordHash: input.passwordHash, mustChangePassword: false })
          .where(and(eq(users.id, user.id), eq(users.status, 'active'), isNull(users.deletedAt)))
          .returning({ id: users.id });
        if (!updatedUser) return false;

        const [used] = await tx
          .update(authChallenges)
          .set({ usedAt: input.now })
          .where(
            and(
              eq(authChallenges.id, challenge.id),
              isNull(authChallenges.usedAt),
              isNull(authChallenges.revokedAt),
              gt(authChallenges.expiresAt, input.now),
            ),
          )
          .returning({ id: authChallenges.id });
        if (!used) throw new Error('Password reset challenge consumption lost its lock');

        const revokedSessions = await tx
          .update(authSessions)
          .set({ revokedAt: input.now })
          .where(
            and(
              eq(authSessions.userId, user.id),
              isNull(authSessions.revokedAt),
              gt(authSessions.expiresAt, input.now),
            ),
          )
          .returning({ id: authSessions.id });
        const sessionIds = revokedSessions.map(({ id }) => id);
        if (sessionIds.length > 0) {
          await tx
            .update(refreshTokens)
            .set({ revokedAt: input.now })
            .where(
              and(inArray(refreshTokens.sessionId, sessionIds), isNull(refreshTokens.revokedAt)),
            );
        }

        await audit.recordRequired(
          {
            eventType: 'auth.password_reset.completed',
            actorType: 'system',
            actorUserId: null,
            resourceType: 'user',
            resourceId: user.id,
            outcome: 'success',
            requestId: input.requestId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: { challengeId: challenge.id },
          },
          tx,
        );
        return true;
      });
    },
  };
}
