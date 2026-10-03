import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTableName } from 'drizzle-orm';
import { readRollbackMigrations } from '../src/config/drizzle/rollback.js';
import * as schema from '../src/config/drizzle/schema/index.js';

const {
  auditEvents,
  authChallenges,
  authAuditEvents,
  authSessions,
  categories,
  emailDeliveries,
  permissions,
  refreshTokens,
  rolePermissions,
  roles,
  userRoles,
  users,
  userStatus,
} = schema;

const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle');
const tableColumns = (table: object) => Object.keys(table).filter((key) => key !== 'enableRLS');

describe('identity schema', () => {
  it('aggregates each existing table once through the schema index', () => {
    expect(Object.keys(schema).sort()).toEqual([
      'auditEvents',
      'authAuditEvents',
      'authChallenges',
      'authSessions',
      'categories',
      'emailDeliveries',
      'permissions',
      'refreshTokens',
      'rolePermissions',
      'roles',
      'tokenRevocations',
      'userRoles',
      'userStatus',
      'users',
    ]);
    expect(
      [
        auditEvents,
        authAuditEvents,
        authChallenges,
        authSessions,
        categories,
        emailDeliveries,
        permissions,
        refreshTokens,
        rolePermissions,
        roles,
        schema.tokenRevocations,
        userRoles,
        users,
      ]
        .map(getTableName)
        .sort(),
    ).toEqual([
      'audit_events',
      'auth_audit_events',
      'auth_challenges',
      'auth_sessions',
      'categories',
      'email_deliveries',
      'permissions',
      'refresh_tokens',
      'role_permissions',
      'roles',
      'token_revocations',
      'user_roles',
      'users',
    ]);
  });

  it('defines approved identity and login/session tables', () => {
    expect(tableColumns(users)).toEqual([
      'id',
      'email',
      'displayName',
      'passwordHash',
      'mustChangePassword',
      'status',
      'emailVerifiedAt',
      'lastLoginAt',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ]);
    expect(tableColumns(emailDeliveries)).toContain('encryptedContext');
    expect(tableColumns(emailDeliveries)).toEqual(
      expect.arrayContaining([
        'recipientCiphertext',
        'recipientNonce',
        'recipientAuthTag',
        'recipientKeyVersion',
      ]),
    );
    expect(tableColumns(emailDeliveries)).not.toContain('recipient');
    expect(tableColumns(authChallenges)).toEqual([
      'id',
      'userId',
      'purpose',
      'tokenHash',
      'expiresAt',
      'usedAt',
      'revokedAt',
      'createdAt',
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
    expect(tableColumns(auditEvents)).toEqual([
      'id',
      'eventType',
      'actorUserId',
      'actorSnapshotId',
      'actorSnapshotDisplayName',
      'actorSnapshotEmail',
      'actorType',
      'resourceType',
      'resourceId',
      'outcome',
      'reasonCode',
      'requestId',
      'sessionId',
      'ipAddress',
      'userAgent',
      'metadata',
      'createdAt',
    ]);
    expect(tableColumns(categories)).toEqual([
      'id',
      'name',
      'slug',
      'description',
      'isActive',
      'createdAt',
      'updatedAt',
      'deletedAt',
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
      '0021_add-audit-event-reader-fields',
      '0020_add-display-name-to-users',
      '0019_extend-auth-challenge-purpose-for-password-reset',
      '0018_remove-plaintext-email-delivery-recipient',
      '0017_add-encrypted-email-recipient-fields',
      '0016_create-auth-challenges-table',
      '0015_create-email-deliveries-table',
      '0014_add-must-change-password',
      '0013_add-role-name-unique',
      '0012_create-categories-table',
      '0011_create-audit-events-table',
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
    expect(migrations[0]).toEqual({
      tag: '0021_add-audit-event-reader-fields',
      when: expect.any(Number),
      statements: [
        'DROP INDEX "audit_events_actor_snapshot_id_index";',
        'DROP INDEX "audit_events_created_at_id_index";',
        'ALTER TABLE "audit_events" DROP COLUMN "actor_snapshot_email";',
        'ALTER TABLE "audit_events" DROP COLUMN "actor_snapshot_display_name";',
        'ALTER TABLE "audit_events" DROP COLUMN "actor_snapshot_id";',
      ],
    });
    expect(migrations[1]).toEqual({
      tag: '0020_add-display-name-to-users',
      when: expect.any(Number),
      statements: ['ALTER TABLE "users" DROP COLUMN "display_name";'],
    });
    expect(migrations[2]).toEqual({
      tag: '0019_extend-auth-challenge-purpose-for-password-reset',
      when: expect.any(Number),
      statements: [
        'DO $$\nBEGIN\n  IF EXISTS (\n    SELECT 1 FROM "auth_challenges" WHERE "purpose" = \'password_reset\'\n  ) THEN\n    RAISE EXCEPTION \'Cannot roll back password reset challenge purpose while password_reset challenges exist\';\n  END IF;\nEND $$;',
        'ALTER TABLE "auth_challenges" DROP CONSTRAINT "auth_challenges_purpose_check";',
        'ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_purpose_check"\n  CHECK ("auth_challenges"."purpose" IN (\'email_verification\'));',
      ],
    });
    expect(migrations[3]).toEqual({
      tag: '0018_remove-plaintext-email-delivery-recipient',
      when: expect.any(Number),
      statements: [
        "DO $$\nBEGIN\n  RAISE EXCEPTION 'Migration 0018 is intentionally irreversible: reverting would restore plaintext recipient PII';\nEND $$;",
      ],
    });
    expect(migrations.flatMap((migration) => migration.statements).slice(10, 22)).toEqual([
      'ALTER TABLE "email_deliveries" DROP CONSTRAINT "email_deliveries_recipient_encryption_fields_check";',
      'ALTER TABLE "email_deliveries" DROP COLUMN "recipient_key_version";',
      'ALTER TABLE "email_deliveries" DROP COLUMN "recipient_auth_tag";',
      'ALTER TABLE "email_deliveries" DROP COLUMN "recipient_nonce";',
      'ALTER TABLE "email_deliveries" DROP COLUMN "recipient_ciphertext";',
      'ALTER TABLE "email_deliveries" ALTER COLUMN "recipient" SET NOT NULL;',
      'DROP TABLE "auth_challenges";',
      'DROP TABLE IF EXISTS "email_deliveries";',
      'ALTER TABLE "users" DROP COLUMN "must_change_password";',
      'DROP INDEX IF EXISTS "roles_name_unique";',
      'DROP INDEX "categories_active_created_at_index";',
      'DROP INDEX "categories_active_slug_unique";',
    ]);

    expect(migrations.flatMap((migration) => migration.statements).slice(22)).toEqual([
      'DROP TABLE "categories";',
      'DROP TABLE "audit_events";',
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
