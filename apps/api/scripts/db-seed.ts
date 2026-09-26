import { eq } from 'drizzle-orm';
import { createDatabase } from '../src/config/database/client.js';
import { loadDatabaseConfig } from '../src/config/database/config.js';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../src/config/drizzle/schema.js';
import { hashPassword } from '../src/helpers/password.helper.js';

const seedEmail = 'developer@dispostable.com';
const seedRoleCode = 'admin';
const seedPermissionCodes = [
  'system.access',
  'category.read',
  'category.create',
  'category.update',
  'category.delete',
  'role.read',
  'role.create',
  'role.update',
  'role.delete',
  'user.read',
  'user.create',
  'user.update',
  'user.delete',
  'dashboard.read',
];

function loadSeedPassword(): string {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error('SEED_ADMIN_PASSWORD is required; pass it at runtime and never commit it');
  }
  return password;
}

function assertNonProductionEnvironment(): void {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    throw new Error('Development admin seeding is restricted to development and test environments');
  }
}

async function seed(): Promise<void> {
  assertNonProductionEnvironment();
  const passwordHash = await hashPassword(loadSeedPassword());
  const database = createDatabase(loadDatabaseConfig());
  await database.initialize();

  try {
    await database.db.transaction(async (transaction) => {
      const [role] = await transaction
        .insert(roles)
        .values({
          code: seedRoleCode,
          name: 'Admin',
          description: 'Foundation administrator role',
        })
        .onConflictDoNothing({ target: roles.code })
        .returning({ id: roles.id });

      const roleRecord =
        role ??
        (
          await transaction
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.code, seedRoleCode))
            .limit(1)
        )[0];

      if (!roleRecord) throw new Error('Admin role could not be created or loaded');

      for (const code of seedPermissionCodes) {
        const [permission] = await transaction
          .insert(permissions)
          .values({
            code,
            description:
              code === 'system.access'
                ? 'Foundation access permission'
                : code.startsWith('role.')
                  ? 'Role management permission'
                  : 'Category management permission',
          })
          .onConflictDoNothing({ target: permissions.code })
          .returning({ id: permissions.id });

        const permissionRecord =
          permission ??
          (
            await transaction
              .select({ id: permissions.id })
              .from(permissions)
              .where(eq(permissions.code, code))
              .limit(1)
          )[0];

        if (!permissionRecord)
          throw new Error(`Permission could not be created or loaded: ${code}`);
      }

      const allPermissions = await transaction
        .select({ permissionId: permissions.id })
        .from(permissions);
      if (allPermissions.length > 0) {
        await transaction
          .insert(rolePermissions)
          .values(
            allPermissions.map(({ permissionId }) => ({ roleId: roleRecord.id, permissionId })),
          )
          .onConflictDoNothing();
      }

      const [existingUser] = await transaction
        .select({ id: users.id, status: users.status, deletedAt: users.deletedAt })
        .from(users)
        .where(eq(users.email, seedEmail))
        .limit(1);

      let userId = existingUser?.id;
      if (existingUser && (existingUser.status !== 'active' || existingUser.deletedAt !== null)) {
        throw new Error('Seed account exists but is disabled or deleted');
      }

      if (!userId) {
        const [createdUser] = await transaction
          .insert(users)
          .values({ email: seedEmail, passwordHash, status: 'active' })
          .returning({ id: users.id });
        userId = createdUser?.id;
      }

      if (!userId) throw new Error('Seed account could not be created or loaded');

      await transaction
        .insert(userRoles)
        .values({ userId, roleId: roleRecord.id })
        .onConflictDoNothing();
    });

    console.log(`Seeded ${seedEmail} with role ${seedRoleCode}`);
  } finally {
    await database.close();
  }
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Database seed failed');
  process.exitCode = 1;
});
