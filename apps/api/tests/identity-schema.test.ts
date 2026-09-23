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
      'replacedByTokenId',
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
      '0010_create-token-revocations-table',
      '0009_extend-auth-audit-event-vocabulary',
      '0008_add-refresh-token-rotation-lineage',
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
      'ALTER TABLE "auth_audit_events" DROP CONSTRAINT "auth_audit_events_event_type_check";',
      'ALTER TABLE "auth_audit_events" DROP CONSTRAINT "auth_audit_events_reason_check";',
      "ALTER TABLE \"auth_audit_events\" ADD CONSTRAINT \"auth_audit_events_event_type_check\" CHECK (\"auth_audit_events\".\"event_type\" IN ('auth.login.succeeded', 'auth.login.failed', 'auth.refresh.succeeded', 'auth.refresh.failed', 'auth.refresh.reuse_detected', 'auth.session.revoked_due_to_refresh_reuse'));",
      "ALTER TABLE \"auth_audit_events\" ADD CONSTRAINT \"auth_audit_events_reason_check\" CHECK (\"auth_audit_events\".\"reason\" IS NULL OR \"auth_audit_events\".\"reason\" IN ('INVALID_CREDENTIALS', 'ACCOUNT_DISABLED', 'ACCOUNT_DELETED', 'RATE_LIMITED', 'INTERNAL_ERROR', 'INVALID_REFRESH_TOKEN', 'TOKEN_EXPIRED', 'TOKEN_REVOKED', 'TOKEN_REUSED', 'SESSION_EXPIRED', 'SESSION_REVOKED'));",
      'DROP TABLE "token_revocations";',
      'ALTER TABLE "auth_audit_events" DROP CONSTRAINT "auth_audit_events_event_type_check";',
      'ALTER TABLE "auth_audit_events" DROP CONSTRAINT "auth_audit_events_reason_check";',
      'ALTER TABLE "auth_audit_events" ADD CONSTRAINT "auth_audit_events_event_type_check" CHECK ("auth_audit_events"."event_type" IN (\'auth.login.succeeded\', \'auth.login.failed\'));',
      'ALTER TABLE "auth_audit_events" ADD CONSTRAINT "auth_audit_events_reason_check" CHECK ("auth_audit_events"."reason" IS NULL OR "auth_audit_events"."reason" IN (\'INVALID_CREDENTIALS\', \'ACCOUNT_DISABLED\', \'ACCOUNT_DELETED\', \'RATE_LIMITED\', \'INTERNAL_ERROR\'));',
      'ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_replaced_by_token_id_refresh_tokens_id_fk";',
      'ALTER TABLE "refresh_tokens" DROP COLUMN "replaced_by_token_id";',
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
