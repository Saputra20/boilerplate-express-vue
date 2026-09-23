import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRollbackMigrations } from '../src/database/rollback.js';
import {
  authAuditEvents,
  authSessions,
  permissions,
  refreshTokens,
  rolePermissions,
  roles,
  userRoles,
  users,
  userStatus,
} from '../src/database/schema.js';

const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle');
const tableColumns = (table: object) => Object.keys(table).filter((key) => key !== 'enableRLS');

describe('identity schema', () => {
  it('defines approved identity and login/session tables', () => {
    expect(tableColumns(users)).toEqual([
      'id',
      'email',
      'passwordHash',
      'status',
      'emailVerifiedAt',
      'lastLoginAt',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ]);
    expect(tableColumns(authSessions)).toEqual([
      'id',
      'userId',
      'createdAt',
      'expiresAt',
      'revokedAt',
      'lastUsedAt',
    ]);
    expect(tableColumns(refreshTokens)).toEqual([
      'id',
      'sessionId',
      'jti',
      'tokenHash',
      'createdAt',
      'expiresAt',
      'revokedAt',
    ]);
    expect(tableColumns(authAuditEvents)).toEqual([
      'id',
      'eventType',
      'userId',
      'sessionId',
      'requestId',
      'reason',
      'createdAt',
    ]);
    expect(tableColumns(roles)).toEqual([
      'id',
      'code',
      'name',
      'description',
      'createdAt',
      'updatedAt',
    ]);
    expect(tableColumns(permissions)).toEqual([
      'id',
      'code',
      'description',
      'createdAt',
      'updatedAt',
    ]);
    expect(tableColumns(userRoles)).toEqual(['userId', 'roleId', 'createdAt']);
    expect(tableColumns(rolePermissions)).toEqual(['roleId', 'permissionId', 'createdAt']);
    expect(userStatus.enumValues).toEqual(['active', 'disabled']);
  });

  it('normalizes schema-managed identity identifiers before persistence', () => {
    expect(users.email.mapToDriverValue('Admin@Example.COM')).toBe('admin@example.com');
    expect(roles.code.mapToDriverValue('ADMIN')).toBe('admin');
    expect(permissions.code.mapToDriverValue('Users.Read')).toBe('users.read');
  });

  it('loads matching rollback migrations in reverse dependency order', async () => {
    const migrations = await readRollbackMigrations(migrationsDirectory);

    expect(migrations.map((migration) => migration.tag)).toEqual([
      '0007_create-auth-audit-events-table',
      '0006_create-refresh-tokens-table',
      '0005_create-auth-sessions-table',
      '0004_create-role-permissions-table',
      '0003_create-user-roles-table',
      '0002_create-permissions-table',
      '0001_create-roles-table',
      '0000_create-users-table',
    ]);
    expect(migrations.flatMap((migration) => migration.statements)).toEqual([
      'DROP TABLE "auth_audit_events";',
      'DROP TABLE "refresh_tokens";',
      'DROP TABLE "auth_sessions";',
      'DROP TABLE "role_permissions";',
      'DROP TABLE "user_roles";',
      'DROP TABLE "permissions";',
      'DROP TABLE "roles";',
      'DROP TABLE "users";',
      'DROP TYPE "public"."user_status";',
    ]);
  });
});
