import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from '../src/config/database/client.js';
import {
  auditEvents,
  authSessions,
  refreshTokens,
  users,
} from '../src/config/drizzle/schema/index.js';
import { createAuditRepository } from '../src/modules/audit/repositories/audit.repository.js';
import { createAuditService } from '../src/modules/audit/services/audit.service.js';
import { createPasswordChangeRepository } from '../src/modules/auth/repositories/password-change.repository.js';
import { createAccessAuthRepository } from '../src/modules/auth/repositories/access-auth.repository.js';
import { createAuthenticatedUserRepository } from '../src/modules/auth/repositories/context.repository.js';
import { createPasswordChangeService } from '../src/modules/auth/services/password-change.service.js';
import { createAuthenticatedContextService } from '../src/modules/auth/services/context.service.js';
import { createPermissionRepository } from '../src/modules/rbac/repositories/permission.repository.js';
import { createPermissionService } from '../src/modules/rbac/services/permission.service.js';
import { hashPassword, verifyPassword } from '../src/helpers/password.helper.js';
import { API_INTEGRATION_ENABLED, testDatabaseConfig } from './helpers/integration.js';

const integrationDescribe = API_INTEGRATION_ENABLED ? describe : describe.skip;
const currentPassword = 'Current first-login password';
const newPassword = 'Replacement password for account';
const requestId = '00000000-0000-4000-8000-000000000038';
const now = new Date('2026-09-30T00:00:00.000Z');

integrationDescribe('authenticated first-login password change PostgreSQL integration', () => {
  const database = createDatabase(testDatabaseConfig);
  const audit = createAuditService(createAuditRepository(database.db), { error: () => undefined });
  const userIds: string[] = [];
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../');

  beforeAll(async () => {
    await database.initialize();
    await migrate(database.db, { migrationsFolder: resolve(root, 'drizzle') });
  });

  afterAll(async () => {
    if (userIds.length) {
      await database.db.delete(auditEvents).where(inArray(auditEvents.resourceId, userIds));
      await database.db.delete(users).where(inArray(users.id, userIds));
    }
    await database.close();
  });

  async function createAccount() {
    const [user] = await database.db
      .insert(users)
      .values({
        email: `first-login-${randomUUID()}@example.test`,
        passwordHash: await hashPassword(currentPassword),
        mustChangePassword: true,
        status: 'active',
      })
      .returning({ id: users.id });
    if (!user) throw new Error('Integration user insert returned no row');
    userIds.push(user.id);
    return user.id;
  }

  async function createSession(userId: string) {
    const [session] = await database.db
      .insert(authSessions)
      .values({ userId, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) })
      .returning({ id: authSessions.id });
    if (!session) throw new Error('Integration session insert returned no row');
    const [refresh] = await database.db
      .insert(refreshTokens)
      .values({
        sessionId: session.id,
        jti: randomUUID(),
        tokenHash: randomUUID(),
        expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      })
      .returning({ id: refreshTokens.id });
    if (!refresh) throw new Error('Integration refresh token insert returned no row');
    return { id: session.id, refreshId: refresh.id };
  }

  function changeService(auditService = audit) {
    return createPasswordChangeService(
      createPasswordChangeRepository(database.db, auditService),
      () => now,
    );
  }

  it('changes once under concurrency, keeps current credentials, revokes other sessions, and audits', async () => {
    const userId = await createAccount();
    const current = await createSession(userId);
    const other = await createSession(userId);
    const accessRepository = createAccessAuthRepository(database.db);
    const contextService = createAuthenticatedContextService(
      createAuthenticatedUserRepository(database.db, audit),
      createPermissionService(createPermissionRepository(database.db)),
    );
    const accessInput = { sub: userId, sid: current.id, jti: randomUUID(), allowRevoked: false };
    expect(await accessRepository.findPrincipal(accessInput)).toMatchObject({
      mustChangePassword: true,
    });
    expect((await contextService.getContext(userId))?.user.mustChangePassword).toBe(true);
    const service = changeService();
    const input = {
      userId,
      sessionId: current.id,
      currentPassword,
      newPassword,
      requestId,
      ipAddress: '127.0.0.1',
      userAgent: 'integration-test',
    };

    const results = await Promise.all([service.change(input), service.change(input)]);
    expect(results.sort()).toEqual(['changed', 'not_required']);

    const [user, currentSession, otherSession, refreshRows, events] = await Promise.all([
      database.db.query.users.findFirst({ where: eq(users.id, userId) }),
      database.db.query.authSessions.findFirst({ where: eq(authSessions.id, current.id) }),
      database.db.query.authSessions.findFirst({ where: eq(authSessions.id, other.id) }),
      database.db
        .select()
        .from(refreshTokens)
        .where(inArray(refreshTokens.sessionId, [current.id, other.id])),
      database.db
        .select({ eventType: auditEvents.eventType, metadata: auditEvents.metadata })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.eventType, 'auth.password_change.completed'),
            eq(auditEvents.resourceId, userId),
          ),
        ),
    ]);

    expect(user?.mustChangePassword).toBe(false);
    expect(await verifyPassword(user?.passwordHash ?? '', currentPassword)).toBe(false);
    expect(await verifyPassword(user?.passwordHash ?? '', newPassword)).toBe(true);
    expect(currentSession?.revokedAt).toBeNull();
    expect(otherSession?.revokedAt).toEqual(now);
    expect(refreshRows.find((row) => row.sessionId === current.id)?.revokedAt).toBeNull();
    expect(refreshRows.find((row) => row.sessionId === other.id)?.revokedAt).toEqual(now);
    expect(events).toHaveLength(1);
    expect(events[0]?.metadata).toEqual({ otherSessionsRevoked: 1 });
    expect(JSON.stringify(events)).not.toContain(currentPassword);
    expect(JSON.stringify(events)).not.toContain(newPassword);
    expect(await accessRepository.findPrincipal(accessInput)).toMatchObject({
      mustChangePassword: false,
    });
    expect((await contextService.getContext(userId))?.user.mustChangePassword).toBe(false);
  });

  it('rolls back password and session changes when required success audit fails', async () => {
    const userId = await createAccount();
    const current = await createSession(userId);
    const other = await createSession(userId);
    const failingAudit = createAuditService<Pick<typeof database.db, 'delete' | 'insert'>>(
      {
        append: async () => {
          throw new Error('audit unavailable');
        },
        cleanupBefore: async () => 0,
      },
      { error: () => undefined },
    );

    await expect(
      changeService(failingAudit).change({
        userId,
        sessionId: current.id,
        currentPassword,
        newPassword,
        requestId,
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toThrow('audit unavailable');

    const [user, sessions] = await Promise.all([
      database.db.query.users.findFirst({ where: eq(users.id, userId) }),
      database.db
        .select()
        .from(authSessions)
        .where(inArray(authSessions.id, [current.id, other.id])),
    ]);
    expect(user?.mustChangePassword).toBe(true);
    expect(await verifyPassword(user?.passwordHash ?? '', currentPassword)).toBe(true);
    expect(sessions.every((session) => session.revokedAt === null)).toBe(true);
  });

  it('records invalid current password without mutating account state', async () => {
    const userId = await createAccount();
    const current = await createSession(userId);
    const result = await changeService().change({
      userId,
      sessionId: current.id,
      currentPassword: 'incorrect current password',
      newPassword,
      requestId,
      ipAddress: null,
      userAgent: null,
    });

    const [user, failedEvents] = await Promise.all([
      database.db.query.users.findFirst({ where: eq(users.id, userId) }),
      database.db
        .select({ reasonCode: auditEvents.reasonCode, metadata: auditEvents.metadata })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.eventType, 'auth.password_change.failed'),
            eq(auditEvents.resourceId, userId),
          ),
        ),
    ]);
    expect(result).toBe('invalid_current_password');
    expect(user?.mustChangePassword).toBe(true);
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0]).toEqual({ reasonCode: 'INVALID_CURRENT_PASSWORD', metadata: null });
  });
});
