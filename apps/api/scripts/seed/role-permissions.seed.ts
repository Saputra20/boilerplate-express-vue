import { permissions } from '../../src/config/drizzle/schema/permissions.schema.js';
import { rolePermissions } from '../../src/config/drizzle/schema/role-permissions.schema.js';
import type { SeedTransaction } from './seed-transaction.js';

export async function seedAdminRolePermissions(
  transaction: SeedTransaction,
  roleId: string,
): Promise<void> {
  const existingPermissions = await transaction
    .select({ permissionId: permissions.id })
    .from(permissions);

  if (existingPermissions.length === 0) return;

  await transaction
    .insert(rolePermissions)
    .values(existingPermissions.map(({ permissionId }) => ({ roleId, permissionId })))
    .onConflictDoNothing();
}
