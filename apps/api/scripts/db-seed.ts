import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from '../src/config/database/client.js';
import { loadDatabaseConfig } from '../src/config/database/config.js';
import { hashPassword } from '../src/helpers/password.helper.js';
import { seedPermissionCatalog } from './seed/permissions.seed.js';
import { seedAdminRole } from './seed/roles.seed.js';
import { seedAdminRolePermissions } from './seed/role-permissions.seed.js';
import { seedUserRole } from './seed/user-roles.seed.js';
import { seedAdminUser } from './seed/users.seed.js';

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

export async function runSeed(): Promise<void> {
  assertNonProductionEnvironment();
  const passwordHash = await hashPassword(loadSeedPassword());
  const database = createDatabase(loadDatabaseConfig());
  await database.initialize();

  try {
    let seedEmail = '';
    let seedRoleCode = '';

    await database.db.transaction(async (transaction) => {
      console.log('Starting seed phase: admin role.');
      const role = await seedAdminRole(transaction);
      seedRoleCode = role.code;
      console.log('Staged seed phase: admin role.');

      console.log('Starting seed phase: permission catalog.');
      await seedPermissionCatalog(transaction);
      console.log('Staged seed phase: permission catalog.');

      console.log('Starting seed phase: role permissions.');
      await seedAdminRolePermissions(transaction, role.id);
      console.log('Staged seed phase: role permissions.');

      console.log('Starting seed phase: admin user.');
      const user = await seedAdminUser(transaction, passwordHash);
      seedEmail = user.email;
      console.log('Staged seed phase: admin user.');

      console.log('Starting seed phase: user role.');
      await seedUserRole(transaction, user.id, role.id);
      console.log('Staged seed phase: user role.');
    });

    console.log(`Seeded ${seedEmail} with role ${seedRoleCode}`);
  } finally {
    await database.close();
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
const isDirectExecution = invokedPath === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  runSeed().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Database seed failed');
    process.exitCode = 1;
  });
}
