import { and, eq, gt, inArray, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  authAuditEvents,
  authSessions,
  refreshTokens,
  tokenRevocations,
} from '../../../config/drizzle/schema.js';
import type { LogoutRepository } from '../services/logout.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema.js')>;

export function createLogoutRepository(database: Database): LogoutRepository {
  return {
    async logoutCurrent({ principal, requestId }) {
      await database.transaction(async (transaction) => {
        const now = new Date();
        const [revokedSession] = await transaction
          .update(authSessions)
          .set({ revokedAt: now })
          .where(
            and(
              eq(authSessions.id, principal.sid),
              eq(authSessions.userId, principal.sub),
              isNull(authSessions.revokedAt),
            ),
          )
          .returning({ id: authSessions.id });

        if (revokedSession !== undefined) {
          await revokeRefreshTokens(transaction, [principal.sid], now);
        }
        await revokeAccessJti(transaction, principal, now, 'LOGOUT');

        if (revokedSession !== undefined) {
          await transaction.insert(authAuditEvents).values({
            eventType: 'auth.logout.succeeded',
            userId: principal.sub,
            sessionId: principal.sid,
            requestId,
            reason: 'LOGOUT',
          });
        }
      });
    },

    async logoutAll({ principal, requestId }) {
      await database.transaction(async (transaction) => {
        const now = new Date();
        const revokedSessions = await transaction
          .update(authSessions)
          .set({ revokedAt: now })
          .where(
            and(
              eq(authSessions.userId, principal.sub),
              isNull(authSessions.revokedAt),
              gt(authSessions.expiresAt, now),
            ),
          )
          .returning({ id: authSessions.id });
        const sessionIds = revokedSessions.map((session) => session.id);

        if (sessionIds.length > 0) await revokeRefreshTokens(transaction, sessionIds, now);
        await revokeAccessJti(transaction, principal, now, 'LOGOUT_ALL');

        if (sessionIds.length > 0) {
          await transaction.insert(authAuditEvents).values({
            eventType: 'auth.logout_all.succeeded',
            userId: principal.sub,
            sessionId: principal.sid,
            requestId,
            reason: 'LOGOUT_ALL',
          });
        }
      });
    },

    async recordFailure({ principal, requestId, scope }) {
      await database.insert(authAuditEvents).values({
        eventType: scope === 'current' ? 'auth.logout.failed' : 'auth.logout_all.failed',
        userId: principal.sub,
        sessionId: principal.sid,
        requestId,
        reason: 'INTERNAL_ERROR',
      });
    },
  };
}

async function revokeRefreshTokens(
  transaction: Database,
  sessionIds: string[],
  now: Date,
): Promise<void> {
  await transaction
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(and(inArray(refreshTokens.sessionId, sessionIds), isNull(refreshTokens.revokedAt)));
}

async function revokeAccessJti(
  transaction: Database,
  principal: { jti: string; sub: string; sid: string; exp: number },
  now: Date,
  reason: 'LOGOUT' | 'LOGOUT_ALL',
): Promise<void> {
  await transaction
    .insert(tokenRevocations)
    .values({
      jti: principal.jti,
      tokenType: 'access',
      userId: principal.sub,
      sessionId: principal.sid,
      revokedAt: now,
      expiresAt: new Date(principal.exp * 1000),
      reason,
    })
    .onConflictDoNothing({ target: tokenRevocations.jti });
}
