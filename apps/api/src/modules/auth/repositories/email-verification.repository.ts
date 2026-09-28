import { and, count, desc, eq, gt, gte, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { authChallenges, users } from '../../../config/drizzle/schema/index.js';
import type { AuditService } from '../../audit/services/audit.service.js';
import type { VerificationRepository } from '../services/email-verification.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema/index.js')>;
type Executor = Pick<Database, 'delete' | 'insert'>;
const PURPOSE = 'email_verification';

export function createEmailVerificationRepository(
  database: Database,
  audit: AuditService<Executor>,
): VerificationRepository {
  return {
    async issue(input) {
      return database.transaction(async (tx) => {
        const [user] = await tx
          .select({
            id: users.id,
            email: users.email,
            status: users.status,
            emailVerifiedAt: users.emailVerifiedAt,
            deletedAt: users.deletedAt,
          })
          .from(users)
          .where(eq(users.email, input.email))
          .for('update')
          .limit(1);
        if (
          !user ||
          user.status !== 'active' ||
          user.deletedAt !== null ||
          user.emailVerifiedAt !== null
        )
          return null;

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
        if (!challenge) throw new Error('Verification challenge insert returned no row');

        const auditBase = {
          actorType: 'system' as const,
          actorUserId: null,
          resourceType: 'auth_challenge',
          resourceId: challenge.id,
          requestId: input.requestId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: { purpose: PURPOSE },
        };
        await audit.recordRequired(
          { ...auditBase, eventType: 'auth.email_verification.requested', outcome: 'success' },
          tx,
        );
        await audit.recordRequired(
          {
            ...auditBase,
            eventType: 'auth.email_verification.challenge_created',
            outcome: 'success',
          },
          tx,
        );

        return { challengeId: challenge.id, userId: user.id, email: user.email };
      });
    },

    async consume(input) {
      return database.transaction(async (tx) => {
        const [challenge] = await tx
          .select()
          .from(authChallenges)
          .where(
            and(eq(authChallenges.tokenHash, input.tokenHash), eq(authChallenges.purpose, PURPOSE)),
          )
          .for('update')
          .limit(1);
        if (!challenge || challenge.usedAt || challenge.revokedAt) return 'invalid';
        if (challenge.expiresAt <= input.now) return 'expired';

        const [user] = await tx
          .select({
            id: users.id,
            status: users.status,
            deletedAt: users.deletedAt,
            emailVerifiedAt: users.emailVerifiedAt,
          })
          .from(users)
          .where(eq(users.id, challenge.userId))
          .for('update')
          .limit(1);
        if (!user || user.status !== 'active' || user.deletedAt || user.emailVerifiedAt)
          return 'invalid';

        const [updatedUser] = await tx
          .update(users)
          .set({ emailVerifiedAt: input.now })
          .where(
            and(
              eq(users.id, user.id),
              eq(users.status, 'active'),
              isNull(users.deletedAt),
              isNull(users.emailVerifiedAt),
            ),
          )
          .returning({ id: users.id });
        if (!updatedUser) return 'invalid';

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
        if (!used) throw new Error('Verification challenge consumption lost its lock');

        await audit.recordRequired(
          {
            eventType: 'auth.email_verified',
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
        return 'verified';
      });
    },

    async recordDeliveryQueued(input) {
      await audit.recordInformational({
        eventType: 'auth.email_verification.delivery_queued',
        actorType: 'system',
        actorUserId: null,
        resourceType: 'auth_challenge',
        resourceId: input.challengeId,
        outcome: 'success',
        requestId: input.requestId,
        metadata: { emailDeliveryId: input.emailDeliveryId },
      });
    },
  };
}
