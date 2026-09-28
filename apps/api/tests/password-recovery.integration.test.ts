import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/config/database/client.js';
import {
  auditEvents,
  authChallenges,
  authSessions,
  refreshTokens,
  users,
} from '../src/config/drizzle/schema/index.js';
import { createAuditRepository } from '../src/modules/audit/repositories/audit.repository.js';
import { createAuditService } from '../src/modules/audit/services/audit.service.js';
import { createPasswordRecoveryRepository } from '../src/modules/auth/repositories/password-recovery.repository.js';
import { fingerprintToken } from '../src/helpers/token-fingerprint.helper.js';
import { API_INTEGRATION_ENABLED, testDatabaseConfig } from './helpers/integration.js';

const integrationDescribe = API_INTEGRATION_ENABLED ? describe : describe.skip;

integrationDescribe('password recovery PostgreSQL integration', () => {
  const database = createDatabase(testDatabaseConfig);
  const audit = createAuditService(createAuditRepository(database.db), { error: () => undefined });
  const repository = createPasswordRecoveryRepository(database.db, audit);
  const userIds: string[] = [];
  const challengeIds: string[] = [];
  const sessionIds: string[] = [];
  const requestId = '00000000-0000-4000-8000-000000000001';
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../');

  beforeAll(async () => {
    await database.initialize();
    await migrate(database.db, { migrationsFolder: resolve(root, 'drizzle') });
  });

  afterAll(async () => {
    const resourceIds = [...challengeIds, ...userIds];
    if (resourceIds.length)
      await database.db.delete(auditEvents).where(inArray(auditEvents.resourceId, resourceIds));
    if (sessionIds.length)
      await database.db.delete(authSessions).where(inArray(authSessions.id, sessionIds));
    if (userIds.length) await database.db.delete(users).where(inArray(users.id, userIds));
    await database.close();
  });

  async function createUser() {
    const [user] = await database.db
      .insert(users)
      .values({
        email: `reset-${randomUUID()}@example.test`,
        passwordHash: 'old-password-hash',
        mustChangePassword: true,
        status: 'active',
      })
      .returning({ id: users.id, email: users.email });
    if (!user) throw new Error('Integration user insert returned no row');
    userIds.push(user.id);
    return user;
  }

  function issueInput(email: string, token: string, now: Date) {
    return repository.issue({
      email,
      tokenHash: fingerprintToken(token),
      now,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      cooldownBefore: new Date(now.getTime() - 60 * 1000),
      requestLimitBefore: new Date(now.getTime() - 60 * 60 * 1000),
      requestId,
      ipAddress: '127.0.0.1',
      userAgent: 'integration-test',
    });
  }

  it('issues password-reset challenges independently and leaves verification challenges untouched', async () => {
    const user = await createUser();
    const now = new Date('2026-09-27T00:00:00Z');
    const [verification] = await database.db
      .insert(authChallenges)
      .values({
        userId: user.id,
        purpose: 'email_verification',
        tokenHash: fingerprintToken(`verification-${randomUUID()}`),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        createdAt: now,
      })
      .returning({ id: authChallenges.id });
    if (!verification) throw new Error('Verification challenge insert returned no row');
    challengeIds.push(verification.id);

    const resetToken = `reset-${randomUUID()}`;
    const issued = await issueInput(user.email, resetToken, now);
    expect(issued).not.toBeNull();
    if (!issued) return;
    challengeIds.push(issued.challengeId);

    const [verificationRow, resetRow] = await Promise.all([
      database.db.query.authChallenges.findFirst({ where: eq(authChallenges.id, verification.id) }),
      database.db.query.authChallenges.findFirst({
        where: eq(authChallenges.id, issued.challengeId),
      }),
    ]);
    expect(verificationRow?.purpose).toBe('email_verification');
    expect(verificationRow?.revokedAt).toBeNull();
    expect(resetRow?.purpose).toBe('password_reset');
    expect(resetRow?.tokenHash).not.toBe(resetToken);
    expect(resetRow?.revokedAt).toBeNull();
    const requestEvents = await database.db
      .select({ eventType: auditEvents.eventType, metadata: auditEvents.metadata })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.eventType, 'auth.password_reset.requested'),
          eq(auditEvents.resourceId, issued.challengeId),
        ),
      );
    expect(requestEvents).toHaveLength(1);
    expect(JSON.stringify(requestEvents)).not.toContain(user.email);
    expect(JSON.stringify(requestEvents)).not.toContain(resetToken);
    expect(
      await issueInput(user.email, `blocked-${randomUUID()}`, new Date(now.getTime() + 30_000)),
    ).toBeNull();
  });

  it('changes password once, clears first-login flag, revokes active sessions/refresh tokens, and audits atomically', async () => {
    const user = await createUser();
    const now = new Date('2026-09-27T01:00:00Z');
    const token = `concurrent-${randomUUID()}`;
    const issued = await issueInput(user.email, token, now);
    expect(issued).not.toBeNull();
    if (!issued) return;
    challengeIds.push(issued.challengeId);

    const [session] = await database.db
      .insert(authSessions)
      .values({ userId: user.id, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) })
      .returning({ id: authSessions.id });
    if (!session) throw new Error('Integration session insert returned no row');
    sessionIds.push(session.id);
    const rawRefreshToken = `refresh-${randomUUID()}`;
    const [refresh] = await database.db
      .insert(refreshTokens)
      .values({
        sessionId: session.id,
        jti: randomUUID(),
        tokenHash: fingerprintToken(rawRefreshToken),
        expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      })
      .returning({ id: refreshTokens.id });
    if (!refresh) throw new Error('Integration refresh token insert returned no row');

    const input = {
      tokenHash: fingerprintToken(token),
      passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$test$sensitivehash',
      now: new Date(now.getTime() + 1),
      requestId,
      ipAddress: '127.0.0.1',
      userAgent: 'integration-test',
    };
    const results = await Promise.all([repository.consume(input), repository.consume(input)]);
    expect(results.sort()).toEqual([false, true]);

    const [userRow, challengeRow, sessionRow, refreshRow, completionEvents] = await Promise.all([
      database.db.query.users.findFirst({ where: eq(users.id, user.id) }),
      database.db.query.authChallenges.findFirst({
        where: eq(authChallenges.id, issued.challengeId),
      }),
      database.db.query.authSessions.findFirst({ where: eq(authSessions.id, session.id) }),
      database.db.query.refreshTokens.findFirst({ where: eq(refreshTokens.id, refresh.id) }),
      database.db
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.eventType, 'auth.password_reset.completed'),
            eq(auditEvents.resourceId, user.id),
          ),
        ),
    ]);
    expect(userRow?.passwordHash).toBe(input.passwordHash);
    expect(userRow?.mustChangePassword).toBe(false);
    expect(challengeRow?.usedAt).toEqual(input.now);
    expect(sessionRow?.revokedAt).toEqual(input.now);
    expect(refreshRow?.revokedAt).toEqual(input.now);
    expect(completionEvents).toHaveLength(1);
  });

  it('refuses to remove the password_reset purpose while challenge rows remain', async () => {
    const user = await createUser();
    const now = new Date();
    const issued = await issueInput(user.email, `down-${randomUUID()}`, now);
    expect(issued).not.toBeNull();
    if (!issued) return;
    challengeIds.push(issued.challengeId);

    const down = await readFile(
      resolve(root, 'drizzle/0019_extend-auth-challenge-purpose-for-password-reset.down.sql'),
      'utf8',
    );
    await expect(
      database.db.transaction(async (tx) => {
        await tx.execute(sql.raw(down));
      }),
    ).rejects.toThrow(
      'Cannot roll back password reset challenge purpose while password_reset challenges exist',
    );

    const challenge = await database.db.query.authChallenges.findFirst({
      where: eq(authChallenges.id, issued.challengeId),
    });
    expect(challenge?.purpose).toBe('password_reset');
  });
});
