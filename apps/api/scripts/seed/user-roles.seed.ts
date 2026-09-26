import { userRoles } from '../../src/config/drizzle/schema/user-roles.schema.js';
import type { SeedTransaction } from './seed-transaction.js';

export async function seedUserRole(
  transaction: SeedTransaction,
  userId: string,
  roleId: string,
): Promise<void> {
  await transaction.insert(userRoles).values({ userId, roleId }).onConflictDoNothing();
}
