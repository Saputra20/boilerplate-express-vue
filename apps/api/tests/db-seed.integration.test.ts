import { and, eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from '../src/config/database/client.js';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../src/config/drizzle/schema/index.js';
import { runSeed } from '../scripts/db-seed.js';
import { seedPermissionCatalog, seedPermissionCodes } from '../scripts/seed/permissions.seed.js';
import { seedAdminRolePermissions } from '../scripts/seed/role-permissions.seed.js';
import { seedAdminRole, seedAdminRoleCode } from '../scripts/seed/roles.seed.js';
import { seedAdminEmail } from '../scripts/seed/users.seed.js';
import { API_INTEGRATION_ENABLED, testDatabaseConfig } from './helpers/integration.js';

const integrationDescribe = API_INTEGRATION_ENABLED ? describe : describe.skip;
const seedPassword = 'integration-only-seed-password';
const environmentKeys = [
  'NODE_ENV',
  'SEED_ADMIN_PASSWORD',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_NAME',
  'DATABASE_USERNAME',
  'DATABASE_PASSWORD',
  'DATABASE_SSL',
] as const;
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]] as const));

type SeedSnapshot = {
  roleId: string | undefined;
  userId: string | undefined;
  permissionIds: string[];
  rolePermissionIds: string[];
  userRoleIds: string[];
};

integrationDescribe('database seed decomposition', () => {
  let database: ReturnType<typeof createDatabase> | undefined;
  let initialSnapshot: SeedSnapshot | undefined;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SEED_ADMIN_PASSWORD = seedPassword;
    process.env.DATABASE_HOST = testDatabaseConfig.host;
    process.env.DATABASE_PORT = String(testDatabaseConfig.port);
    process.env.DATABASE_NAME = testDatabaseConfig.database;
    process.env.DATABASE_USERNAME = testDatabaseConfig.user;
    process.env.DATABASE_PASSWORD = testDatabaseConfig.password;
    process.env.DATABASE_SSL = String(testDatabaseConfig.ssl);

    database = createDatabase(testDatabaseConfig);
    await database.initialize();
    await migrate(database.db, {
      migrationsFolder: resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle'),
    });
    initialSnapshot = await readSeedSnapshot(database);
  });

  afterAll(async () => {
    try {
      if (database) {
        if (initialSnapshot) await removeSeedChanges(database, initialSnapshot);
        await database.close().catch(() => undefined);
      }
    } finally {
      for (const key of environmentKeys) {
        const value = originalEnvironment.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('rolls back all seed responsibilities when a later phase fails', async () => {
    if (!database) throw new Error('The isolated database did not initialize');
    if (!initialSnapshot) throw new Error('The isolated database baseline was not captured');

    await expect(
      database.db.transaction(async (transaction) => {
        const role = await seedAdminRole(transaction);
        await seedPermissionCatalog(transaction);
        await seedAdminRolePermissions(transaction, role.id);
        throw new Error('intentional seed transaction rollback');
      }),
    ).rejects.toThrow('intentional seed transaction rollback');

    await expect(readSeedSnapshot(database)).resolves.toEqual(initialSnapshot);
  });

  it('runs twice with stable seed records and secret-free phase messages', async () => {
    if (!database) throw new Error('The isolated database did not initialize');
    if (!initialSnapshot) throw new Error('The isolated database baseline was not captured');
    const messages: string[] = [];
    const originalLog = console.log;
    console.log = (...values: unknown[]) => messages.push(values.map(String).join(' '));

    try {
      await runSeed();
      const firstRun = await readSeedSnapshot(database);
      await runSeed();
      const secondRun = await readSeedSnapshot(database);

      expect(secondRun).toEqual(firstRun);
      expect(firstRun.roleId).toBeDefined();
      expect(firstRun.userId).toBeDefined();
      expect(messages).toContain(`Seeded ${seedAdminEmail} with role ${seedAdminRoleCode}`);

      const phaseMessages = messages;
      expect(phaseMessages.some((message) => message === 'Starting seed phase: admin role.')).toBe(
        true,
      );
      expect(phaseMessages.some((message) => message === 'Staged seed phase: user role.')).toBe(
        true,
      );
      expect(
        phaseMessages.filter((message) => message.startsWith('Starting seed phase:')),
      ).toHaveLength(10);
      for (const message of phaseMessages.filter((entry) =>
        /^(Starting|Staged) seed phase:/.test(entry),
      )) {
        expect(message).not.toContain(seedAdminEmail);
        expect(message).not.toContain(seedPassword);
      }
    } finally {
      console.log = originalLog;
    }
  });
});

async function readSeedSnapshot(
  database: ReturnType<typeof createDatabase>,
): Promise<SeedSnapshot> {
  const [role] = await database.db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.code, seedAdminRoleCode))
    .limit(1);
  const [user] = await database.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, seedAdminEmail))
    .limit(1);
  const permissionRows = await database.db
    .select({ id: permissions.id })
    .from(permissions)
    .where(inArray(permissions.code, [...seedPermissionCodes]));
  const rolePermissionRows = role
    ? await database.db
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, role.id))
    : [];
  const userRoleRows = user
    ? await database.db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .where(eq(userRoles.userId, user.id))
    : [];

  return {
    roleId: role?.id,
    userId: user?.id,
    permissionIds: permissionRows.map(({ id }) => id).sort(),
    rolePermissionIds: rolePermissionRows.map(({ permissionId }) => permissionId).sort(),
    userRoleIds: userRoleRows.map(({ roleId }) => roleId).sort(),
  };
}

async function removeSeedChanges(
  database: ReturnType<typeof createDatabase>,
  initial: SeedSnapshot,
): Promise<void> {
  await database.db.transaction(async (transaction) => {
    if (initial.roleId) {
      const rolePermissionRows = await transaction
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, initial.roleId));
      const newPermissionIds = rolePermissionRows
        .map(({ permissionId }) => permissionId)
        .filter((permissionId) => !initial.rolePermissionIds.includes(permissionId));

      for (const permissionId of newPermissionIds) {
        await transaction
          .delete(rolePermissions)
          .where(
            and(
              eq(rolePermissions.roleId, initial.roleId),
              eq(rolePermissions.permissionId, permissionId),
            ),
          );
      }
    }

    if (initial.userId) {
      const userRoleRows = await transaction
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .where(eq(userRoles.userId, initial.userId));
      const newRoleIds = userRoleRows
        .map(({ roleId }) => roleId)
        .filter((roleId) => !initial.userRoleIds.includes(roleId));

      for (const roleId of newRoleIds) {
        await transaction
          .delete(userRoles)
          .where(and(eq(userRoles.userId, initial.userId), eq(userRoles.roleId, roleId)));
      }
    }

    if (!initial.userId) {
      const [seedUser] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, seedAdminEmail))
        .limit(1);
      if (seedUser) await transaction.delete(users).where(eq(users.id, seedUser.id));
    }

    if (!initial.roleId) {
      const [seedRole] = await transaction
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.code, seedAdminRoleCode))
        .limit(1);
      if (seedRole) await transaction.delete(roles).where(eq(roles.id, seedRole.id));
    }

    const newPermissionIds = (
      await transaction
        .select({ id: permissions.id })
        .from(permissions)
        .where(inArray(permissions.code, [...seedPermissionCodes]))
    )
      .map(({ id }) => id)
      .filter((id) => !initial.permissionIds.includes(id));

    for (const permissionId of newPermissionIds) {
      await transaction.delete(permissions).where(eq(permissions.id, permissionId));
    }
  });
}
