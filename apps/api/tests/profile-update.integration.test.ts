import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '../src/config/database/client.js';
import { auditEvents, authSessions, users } from '../src/config/drizzle/schema/index.js';
import { createAuditRepository } from '../src/modules/audit/repositories/audit.repository.js';
import { createAuditService } from '../src/modules/audit/services/audit.service.js';
import { createAuthenticatedUserRepository } from '../src/modules/auth/repositories/context.repository.js';
import { API_INTEGRATION_ENABLED, testDatabaseConfig } from './helpers/integration.js';

const integrationDescribe = API_INTEGRATION_ENABLED ? describe : describe.skip;

integrationDescribe('self-profile PostgreSQL integration', () => {
  const database = createDatabase(testDatabaseConfig);
  const audit = createAuditService(createAuditRepository(database.db), { error: () => undefined });
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../');
  const userIds: string[] = [];

  beforeAll(async () => {
    await database.initialize();
    await migrate(database.db, { migrationsFolder: resolve(root, 'drizzle') });
  });

  afterAll(async () => {
    if (userIds.length) {
      await database.db.delete(auditEvents).where(inArray(auditEvents.resourceId, userIds));
      await database.db.delete(authSessions).where(inArray(authSessions.userId, userIds));
      await database.db.delete(users).where(inArray(users.id, userIds));
    }
    await database.close();
  });

  async function createAccount(mustChangePassword = false) {
    const [user] = await database.db
      .insert(users)
      .values({
        email: `profile-${randomUUID()}@example.test`,
        passwordHash: 'synthetic-hash',
        status: 'active',
        mustChangePassword,
      })
      .returning({ id: users.id });
    if (!user) throw new Error('Integration user insert returned no row');
    userIds.push(user.id);
    const [session] = await database.db
      .insert(authSessions)
      .values({
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
      })
      .returning({ id: authSessions.id });
    if (!session) throw new Error('Integration session insert returned no row');
    return { userId: user.id, sessionId: session.id };
  }

  it('updates and audits only changes, and treats the same normalized value as a no-op', async () => {
    const { userId, sessionId } = await createAccount();
    const repository = createAuthenticatedUserRepository(database.db, audit);
    const input = {
      userId,
      displayName: 'Ada Lovelace',
      requestId: randomUUID(),
      sessionId,
      ipAddress: '127.0.0.1',
      userAgent: 'integration-test',
    };

    await expect(repository.updateDisplayName(input)).resolves.toBe('updated');
    await expect(repository.updateDisplayName(input)).resolves.toBe('unchanged');

    const [user] = await database.db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId));
    const events = await database.db
      .select()
      .from(auditEvents)
      .where(
        and(eq(auditEvents.resourceId, userId), eq(auditEvents.eventType, 'user.profile_updated')),
      );
    expect(user?.displayName).toBe('Ada Lovelace');
    expect(events).toHaveLength(1);
    expect(events[0]?.metadata).toEqual({ changedFields: ['displayName'] });
  });

  it('rechecks mandatory password change under the user lock before mutation', async () => {
    const { userId, sessionId } = await createAccount(true);
    const repository = createAuthenticatedUserRepository(database.db, audit);

    await expect(
      repository.updateDisplayName({
        userId,
        displayName: 'Ada',
        requestId: randomUUID(),
        sessionId,
        ipAddress: null,
        userAgent: null,
      }),
    ).resolves.toBe('password_change_required');

    const [user] = await database.db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId));
    expect(user?.displayName).toBeNull();
  });
});
