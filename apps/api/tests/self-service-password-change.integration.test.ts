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
import { hashPassword, verifyPassword } from '../src/helpers/password.helper.js';
import { createAuditRepository } from '../src/modules/audit/repositories/audit.repository.js';
import { createAuditService } from '../src/modules/audit/services/audit.service.js';
import { createSelfServicePasswordChangeRepository } from '../src/modules/auth/repositories/self-service-password-change.repository.js';
import { createSelfServicePasswordChangeService } from '../src/modules/auth/services/self-service-password-change.service.js';
import { API_INTEGRATION_ENABLED, testDatabaseConfig } from './helpers/integration.js';

const integrationDescribe = API_INTEGRATION_ENABLED ? describe : describe.skip;
const currentPassword = 'Current password for voluntary change';
const newPassword = 'Replacement password for voluntary change';
const requestId = '00000000-0000-4000-8000-000000000039';
const now = new Date('2026-09-30T00:00:00.000Z');

integrationDescribe('authenticated self-service password change PostgreSQL integration', () => {
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

  async function createAccount(mustChangePassword = false) {
    const [user] = await database.db
      .insert(users)
      .values({
        email: `self-service-${randomUUID()}@example.test`,
        passwordHash: await hashPassword(currentPassword),
        mustChangePassword,
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

  function service(auditService = audit) {
    return createSelfServicePasswordChangeService(
      createSelfServicePasswordChangeRepository(database.db, auditService),
      () => now,
    );
  }

  function changeInput(userId: string, sessionId: string, overrides: Record<string, unknown> = {}) {
    return {
      userId,
      sessionId,
      currentPassword,
      newPassword,
      requestId,
      ipAddress: '127.0.0.1',
      userAgent: 'integration-test',
      ...overrides,
    };
  }

  it('changes a compliant user password, keeps the current session, revokes other sessions, and audits', async () => {
    const userId = await createAccount();
    const current = await createSession(userId);
    const other = await createSession(userId);

    await expect(service().change(changeInput(userId, current.id))).resolves.toBe('changed');

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
    expect(events[0]?.metadata).toEqual({ flow: 'self_service', otherSessionsRevoked: 1 });
    expect(JSON.stringify(events)).not.toContain(currentPassword);
    expect(JSON.stringify(events)).not.toContain(newPassword);
  });

  it('does not clear the mandatory flag or change password for a required-change user', async () => {
    const userId = await createAccount(true);
    const current = await createSession(userId);
    const result = await service().change(changeInput(userId, current.id));
    const user = await database.db.query.users.findFirst({ where: eq(users.id, userId) });

    expect(result).toBe('password_change_required');
    expect(user?.mustChangePassword).toBe(true);
    expect(await verifyPassword(user?.passwordHash ?? '', currentPassword)).toBe(true);
  });

  it('rejects incorrect current password and records a safe best-effort audit event', async () => {
    const userId = await createAccount();
    const current = await createSession(userId);
    const result = await service().change(
      changeInput(userId, current.id, { currentPassword: 'incorrect current password' }),
    );
    const [user, events] = await Promise.all([
      database.db.query.users.findFirst({ where: eq(users.id, userId) }),
      database.db
        .select({
          eventType: auditEvents.eventType,
          reasonCode: auditEvents.reasonCode,
          metadata: auditEvents.metadata,
        })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.eventType, 'auth.password_change.failed'),
            eq(auditEvents.resourceId, userId),
          ),
        ),
    ]);

    expect(result).toBe('invalid_current_password');
    expect(await verifyPassword(user?.passwordHash ?? '', currentPassword)).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      eventType: 'auth.password_change.failed',
      reasonCode: 'INVALID_CURRENT_PASSWORD',
      metadata: { flow: 'self_service' },
    });
    expect(JSON.stringify(events)).not.toContain('incorrect current password');
  });

  it('rejects an unchanged password without changing session state', async () => {
    const userId = await createAccount();
    const current = await createSession(userId);
    const result = await service().change(
      changeInput(userId, current.id, { newPassword: currentPassword }),
    );
    const [user, session] = await Promise.all([
      database.db.query.users.findFirst({ where: eq(users.id, userId) }),
      database.db.query.authSessions.findFirst({ where: eq(authSessions.id, current.id) }),
    ]);

    expect(result).toBe('password_unchanged');
    expect(await verifyPassword(user?.passwordHash ?? '', currentPassword)).toBe(true);
    expect(session?.revokedAt).toBeNull();
  });

  it('serializes concurrent requests using the same current password', async () => {
    const userId = await createAccount();
    const current = await createSession(userId);
    const other = await createSession(userId);

    const results = await Promise.all([
      service().change(changeInput(userId, current.id)),
      service().change(changeInput(userId, current.id)),
    ]);
    const [user, currentSession, otherSession] = await Promise.all([
      database.db.query.users.findFirst({ where: eq(users.id, userId) }),
      database.db.query.authSessions.findFirst({ where: eq(authSessions.id, current.id) }),
      database.db.query.authSessions.findFirst({ where: eq(authSessions.id, other.id) }),
    ]);

    expect(results.sort()).toEqual(['changed', 'invalid_current_password']);
    expect(await verifyPassword(user?.passwordHash ?? '', newPassword)).toBe(true);
    expect(currentSession?.revokedAt).toBeNull();
    expect(otherSession?.revokedAt).toEqual(now);
  });

  it('rolls back password and session revocations when required success audit fails', async () => {
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

    await expect(service(failingAudit).change(changeInput(userId, current.id))).rejects.toThrow(
      'audit unavailable',
    );

    const [user, sessions] = await Promise.all([
      database.db.query.users.findFirst({ where: eq(users.id, userId) }),
      database.db
        .select()
        .from(authSessions)
        .where(inArray(authSessions.id, [current.id, other.id])),
    ]);
    expect(await verifyPassword(user?.passwordHash ?? '', currentPassword)).toBe(true);
    expect(sessions.every((session) => session.revokedAt === null)).toBe(true);
  });
});
