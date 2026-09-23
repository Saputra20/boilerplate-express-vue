import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'node:crypto';
import {
  authAuditEvents,
  authSessions,
  refreshTokens,
  users,
} from '../../../config/drizzle/schema.js';
import { fingerprintToken } from '../../../helpers/token-fingerprint.helper.js';
import type {
  RefreshFailureReason,
  RefreshRotationRepository,
} from '../services/refresh-token.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema.js')>;

export function createRefreshRepository(database: Database): RefreshRotationRepository {
  return {
    async rotate(input, issue) {
      return database.transaction(async (transaction) => {
        const now = new Date();
        const lockedToken = await lockRefreshToken(transaction, input.jti);
        if (lockedToken === null) return { status: 'invalid' } as const;
        const [token] = lockedToken;

        if (
          token === undefined ||
          token.sessionId !== input.sid ||
          token.tokenHash !== input.tokenHash
        ) {
          await writeFailureAudit(
            transaction,
            input.requestId,
            null,
            null,
            'INVALID_REFRESH_TOKEN',
          );
          return { status: 'invalid' } as const;
        }

        const [session] = await transaction
          .select({
            id: authSessions.id,
            userId: authSessions.userId,
            expiresAt: authSessions.expiresAt,
            revokedAt: authSessions.revokedAt,
            status: users.status,
            deletedAt: users.deletedAt,
          })
          .from(authSessions)
          .innerJoin(users, eq(authSessions.userId, users.id))
          .where(eq(authSessions.id, token.sessionId))
          .for('update')
          .limit(1);

        if (session === undefined || session.userId !== input.sub) {
          await writeFailureAudit(
            transaction,
            input.requestId,
            null,
            token.sessionId,
            'INVALID_REFRESH_TOKEN',
          );
          return { status: 'invalid' } as const;
        }

        if (token.replacedByTokenId !== null) {
          await revokeCompromisedSession(
            transaction,
            session.id,
            session.userId,
            input.requestId,
            now,
          );
          return { status: 'reused' } as const;
        }

        if (token.revokedAt !== null) {
          await writeFailureAudit(
            transaction,
            input.requestId,
            session.userId,
            session.id,
            'TOKEN_REVOKED',
          );
          return { status: 'invalid' } as const;
        }

        if (token.expiresAt <= now) {
          await writeFailureAudit(
            transaction,
            input.requestId,
            session.userId,
            session.id,
            'TOKEN_EXPIRED',
          );
          return { status: 'invalid' } as const;
        }

        if (session.revokedAt !== null) {
          await writeFailureAudit(
            transaction,
            input.requestId,
            session.userId,
            session.id,
            'SESSION_REVOKED',
          );
          return { status: 'invalid' } as const;
        }

        if (session.expiresAt <= now) {
          await writeFailureAudit(
            transaction,
            input.requestId,
            session.userId,
            session.id,
            'SESSION_EXPIRED',
          );
          return { status: 'invalid' } as const;
        }

        if (session.status !== 'active' || session.deletedAt !== null) {
          await revokeInvalidUserSession(
            transaction,
            session.id,
            session.userId,
            input.requestId,
            now,
            session.status !== 'active' ? 'ACCOUNT_DISABLED' : 'ACCOUNT_DELETED',
          );
          return { status: 'invalid' } as const;
        }

        const result = issue(session.expiresAt);
        const childId = randomUUID();
        await transaction.insert(refreshTokens).values({
          id: childId,
          sessionId: session.id,
          jti: result.refreshJti,
          tokenHash: fingerprintToken(result.refreshToken),
          expiresAt: result.refreshExpiresAt,
        });
        const [consumedToken] = await transaction
          .update(refreshTokens)
          .set({ revokedAt: now, replacedByTokenId: childId })
          .where(
            and(
              eq(refreshTokens.id, token.id),
              isNull(refreshTokens.revokedAt),
              isNull(refreshTokens.replacedByTokenId),
            ),
          )
          .returning({ id: refreshTokens.id });

        if (consumedToken === undefined) throw new Error('Refresh token rotation conflict');

        await transaction.insert(authAuditEvents).values({
          eventType: 'auth.refresh.succeeded',
          userId: session.userId,
          sessionId: session.id,
          requestId: input.requestId,
        });
        return { status: 'rotated', result } as const;
      });
    },

    async recordInvalidRefresh({ requestId, reason }): Promise<void> {
      await database.insert(authAuditEvents).values({
        eventType: 'auth.refresh.failed',
        requestId,
        reason,
      });
    },
  };
}

async function revokeCompromisedSession(
  transaction: Database,
  sessionId: string,
  userId: string,
  requestId: string,
  now: Date,
): Promise<void> {
  await transaction
    .update(authSessions)
    .set({ revokedAt: now })
    .where(eq(authSessions.id, sessionId));
  await transaction
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(and(eq(refreshTokens.sessionId, sessionId), isNull(refreshTokens.revokedAt)));
  await transaction.insert(authAuditEvents).values([
    {
      eventType: 'auth.refresh.reuse_detected',
      userId,
      sessionId,
      requestId,
      reason: 'TOKEN_REUSED',
    },
    {
      eventType: 'auth.session.revoked_due_to_refresh_reuse',
      userId,
      sessionId,
      requestId,
      reason: 'TOKEN_REUSED',
    },
  ]);
}

async function revokeInvalidUserSession(
  transaction: Database,
  sessionId: string,
  userId: string,
  requestId: string,
  now: Date,
  reason: 'ACCOUNT_DISABLED' | 'ACCOUNT_DELETED',
): Promise<void> {
  await transaction
    .update(authSessions)
    .set({ revokedAt: now })
    .where(eq(authSessions.id, sessionId));
  await transaction
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(and(eq(refreshTokens.sessionId, sessionId), isNull(refreshTokens.revokedAt)));
  await writeFailureAudit(transaction, requestId, userId, sessionId, reason);
}

async function writeFailureAudit(
  transaction: Database,
  requestId: string,
  userId: string | null,
  sessionId: string | null,
  reason: RefreshFailureReason,
): Promise<void> {
  await transaction.insert(authAuditEvents).values({
    eventType: 'auth.refresh.failed',
    userId,
    sessionId,
    requestId,
    reason,
  });
}

async function lockRefreshToken(transaction: Database, jti: string) {
  try {
    return await transaction
      .select({
        id: refreshTokens.id,
        sessionId: refreshTokens.sessionId,
        tokenHash: refreshTokens.tokenHash,
        expiresAt: refreshTokens.expiresAt,
        revokedAt: refreshTokens.revokedAt,
        replacedByTokenId: refreshTokens.replacedByTokenId,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.jti, jti))
      .for('update', { noWait: true })
      .limit(1);
  } catch (error) {
    if (isLockNotAvailable(error)) return null;
    throw error;
  }
}

function isLockNotAvailable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '55P03';
}
