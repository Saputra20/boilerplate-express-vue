import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  authAuditEvents,
  authSessions,
  refreshTokens,
  users,
} from '../../../config/drizzle/schema.js';
import type {
  AuthenticatedSessionInput,
  FailedLoginAuditInput,
  LoginRepository,
  LoginUser,
} from '../services/login.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema.js')>;

export function createLoginRepository(database: Database): LoginRepository {
  return {
    async findUserByEmail(email: string): Promise<LoginUser | null> {
      const [user] = await database
        .select({
          id: users.id,
          passwordHash: users.passwordHash,
          mustChangePassword: users.mustChangePassword,
          status: users.status,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return user ?? null;
    },

    async createAuthenticatedSession({
      sessionId,
      userId,
      refreshJti,
      refreshTokenHash,
      expiresAt,
      requestId,
    }: AuthenticatedSessionInput): Promise<'created' | 'accountUnavailable'> {
      return database.transaction(async (transaction) => {
        const [eligibleUser] = await transaction
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.id, userId), eq(users.status, 'active'), isNull(users.deletedAt)))
          .limit(1);

        if (eligibleUser === undefined) return 'accountUnavailable';

        await transaction.insert(authSessions).values({ id: sessionId, userId, expiresAt });
        await transaction.insert(refreshTokens).values({
          sessionId,
          jti: refreshJti,
          tokenHash: refreshTokenHash,
          expiresAt,
        });
        await transaction.insert(authAuditEvents).values({
          eventType: 'auth.login.succeeded',
          userId,
          sessionId,
          requestId,
        });
        return 'created';
      });
    },

    async createFailedLoginAuditEvent({
      userId,
      requestId,
      reason,
    }: FailedLoginAuditInput): Promise<void> {
      await database.insert(authAuditEvents).values({
        eventType: 'auth.login.failed',
        userId,
        requestId,
        reason,
      });
    },
  };
}
