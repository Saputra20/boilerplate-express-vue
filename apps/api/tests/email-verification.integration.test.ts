import { and, eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from '../src/config/database/client.js';
import { auditEvents, authChallenges, users } from '../src/config/drizzle/schema/index.js';
import { createAuditRepository } from '../src/modules/audit/repositories/audit.repository.js';
import { createAuditService } from '../src/modules/audit/services/audit.service.js';
import { createEmailVerificationRepository } from '../src/modules/auth/repositories/email-verification.repository.js';
import { hashVerificationToken } from '../src/modules/auth/services/email-verification.service.js';
import { API_INTEGRATION_ENABLED, testDatabaseConfig } from './helpers/integration.js';

const integrationDescribe = API_INTEGRATION_ENABLED ? describe : describe.skip;

integrationDescribe('email verification PostgreSQL integration', () => {
  const database = createDatabase(testDatabaseConfig);
  const audit = createAuditService(createAuditRepository(database.db), { error: () => undefined });
  const repository = createEmailVerificationRepository(database.db, audit);
  const userIds: string[] = [];
  const challengeIds: string[] = [];
  const requestId = '00000000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    await database.initialize();
    await migrate(database.db, {
      migrationsFolder: resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle'),
    });
  });

  afterAll(async () => {
    if (challengeIds.length || userIds.length) {
      const resourceIds = [...challengeIds, ...userIds];
      if (resourceIds.length)
        await database.db.delete(auditEvents).where(inArray(auditEvents.resourceId, resourceIds));
      if (userIds.length) await database.db.delete(users).where(inArray(users.id, userIds));
    }
    await database.close();
  });

  async function createUser() {
    const [user] = await database.db
      .insert(users)
      .values({
        email: `verify-${randomUUID()}@example.test`,
        passwordHash: 'unused-integration-hash',
        status: 'active',
      })
      .returning({ id: users.id, email: users.email });
    if (!user) throw new Error('Integration user insert returned no row');
    userIds.push(user.id);
    return user;
  }

  function issueInput(userEmail: string, token: string, now: Date) {
    return repository.issue({
      email: userEmail,
      tokenHash: hashVerificationToken(token),
      now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      cooldownBefore: new Date(now.getTime() - 60 * 1000),
      requestLimitBefore: new Date(now.getTime() - 60 * 60 * 1000),
      requestId,
      ipAddress: '127.0.0.1',
      userAgent: 'integration-test',
    });
  }

  it('stores only token hashes, enforces cooldown, and revokes prior verification challenges', async () => {
    const user = await createUser();
    const now = new Date('2026-09-27T00:00:00Z');
    const first = await issueInput(user.email, 'first-random-token', now);
    expect(first).not.toBeNull();
    if (!first) return;
    challengeIds.push(first.challengeId);

    const row = await database.db.query.authChallenges.findFirst({
      where: eq(authChallenges.id, first.challengeId),
    });
    expect(row?.tokenHash).toBe(hashVerificationToken('first-random-token'));
    expect(row?.tokenHash).not.toBe('first-random-token');
    expect(
      await issueInput(user.email, 'cooldown-token', new Date(now.getTime() + 30_000)),
    ).toBeNull();

    const replacement = await issueInput(
      user.email,
      'replacement-token',
      new Date(now.getTime() + 61_000),
    );
    expect(replacement).not.toBeNull();
    if (!replacement) return;
    challengeIds.push(replacement.challengeId);

    const [firstRow, replacementRow] = await Promise.all([
      database.db.query.authChallenges.findFirst({
        where: eq(authChallenges.id, first.challengeId),
      }),
      database.db.query.authChallenges.findFirst({
        where: eq(authChallenges.id, replacement.challengeId),
      }),
    ]);
    expect(firstRow?.revokedAt).toEqual(new Date(now.getTime() + 61_000));
    expect(replacementRow?.revokedAt).toBeNull();
    expect(replacementRow?.purpose).toBe('email_verification');
  });

  it('atomically consumes a valid challenge once and makes concurrent replay deterministic', async () => {
    const user = await createUser();
    const now = new Date('2026-09-27T01:00:00Z');
    const issued = await issueInput(user.email, 'concurrent-token', now);
    expect(issued).not.toBeNull();
    if (!issued) return;
    challengeIds.push(issued.challengeId);

    const results = await Promise.all([
      repository.consume({
        tokenHash: hashVerificationToken('concurrent-token'),
        now: new Date(now.getTime() + 1),
        requestId,
        ipAddress: '127.0.0.1',
        userAgent: 'integration-test',
      }),
      repository.consume({
        tokenHash: hashVerificationToken('concurrent-token'),
        now: new Date(now.getTime() + 1),
        requestId,
        ipAddress: '127.0.0.1',
        userAgent: 'integration-test',
      }),
    ]);
    expect(results.sort()).toEqual(['invalid', 'verified']);

    const [userRow, challengeRow, verifiedEvents] = await Promise.all([
      database.db.query.users.findFirst({ where: eq(users.id, user.id) }),
      database.db.query.authChallenges.findFirst({
        where: eq(authChallenges.id, issued.challengeId),
      }),
      database.db
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.eventType, 'auth.email_verified'),
            eq(auditEvents.resourceId, user.id),
          ),
        ),
    ]);
    expect(userRow?.emailVerifiedAt).toEqual(new Date(now.getTime() + 1));
    expect(challengeRow?.usedAt).toEqual(new Date(now.getTime() + 1));
    expect(verifiedEvents).toHaveLength(1);
  });

  it('distinguishes expired challenges without changing the user', async () => {
    const user = await createUser();
    const now = new Date('2026-09-27T02:00:00Z');
    const issued = await issueInput(user.email, 'expired-token', now);
    expect(issued).not.toBeNull();
    if (!issued) return;
    challengeIds.push(issued.challengeId);

    const result = await repository.consume({
      tokenHash: hashVerificationToken('expired-token'),
      now: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      requestId,
      ipAddress: null,
      userAgent: null,
    });
    const userRow = await database.db.query.users.findFirst({ where: eq(users.id, user.id) });
    const challengeRow = await database.db.query.authChallenges.findFirst({
      where: eq(authChallenges.id, issued.challengeId),
    });
    expect(result).toBe('expired');
    expect(userRow?.emailVerifiedAt).toBeNull();
    expect(challengeRow?.usedAt).toBeNull();
  });
});
