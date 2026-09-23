import { and, eq, gt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { authSessions, tokenRevocations, users } from '../database/schema.js';
import type { AccessAuthRepository } from './access-auth-service.js';

type Database = NodePgDatabase<typeof import('../database/schema.js')>;

export function createAccessAuthRepository(database: Database): AccessAuthRepository {
  return {
    async findPrincipal({ sub, sid, jti, allowRevoked }) {
      const now = new Date();
      const [session] = await database
        .select({
          userId: authSessions.userId,
          sessionId: authSessions.id,
          expiresAt: authSessions.expiresAt,
          revokedAt: authSessions.revokedAt,
          status: users.status,
          deletedAt: users.deletedAt,
        })
        .from(authSessions)
        .innerJoin(users, eq(authSessions.userId, users.id))
        .where(and(eq(authSessions.id, sid), eq(authSessions.userId, sub)))
        .limit(1);

      if (
        session === undefined ||
        session.expiresAt <= now ||
        session.status !== 'active' ||
        session.deletedAt !== null
      ) {
        return null;
      }

      const [revocation] = await database
        .select({ jti: tokenRevocations.jti })
        .from(tokenRevocations)
        .where(and(eq(tokenRevocations.jti, jti), gt(tokenRevocations.expiresAt, now)))
        .limit(1);
      const revoked = session.revokedAt !== null || revocation !== undefined;
      if (revoked && !allowRevoked) return null;

      return {
        sub: session.userId,
        sid: session.sessionId,
        jti,
        revoked,
      };
    },
  };
}
