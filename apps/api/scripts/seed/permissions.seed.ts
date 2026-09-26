import { eq } from 'drizzle-orm';
import { permissions } from '../../src/config/drizzle/schema/permissions.schema.js';
import type { SeedTransaction } from './seed-transaction.js';

export const seedPermissionCodes = [
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
] as const;

function permissionDescription(code: string): string {
  if (code === 'system.access') return 'Foundation access permission';
  if (code.startsWith('role.')) return 'Role management permission';
  return 'Category management permission';
}

export async function seedPermissionCatalog(transaction: SeedTransaction): Promise<void> {
  for (const code of seedPermissionCodes) {
    const [createdPermission] = await transaction
      .insert(permissions)
      .values({ code, description: permissionDescription(code) })
      .onConflictDoNothing({ target: permissions.code })
      .returning({ id: permissions.id });

    const [existingPermission] = createdPermission
      ? [createdPermission]
      : await transaction
          .select({ id: permissions.id })
          .from(permissions)
          .where(eq(permissions.code, code))
          .limit(1);

    if (!existingPermission) throw new Error(`Permission could not be created or loaded: ${code}`);
  }
}
