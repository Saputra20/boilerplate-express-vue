import { eq } from 'drizzle-orm';
import { roles } from '../../src/config/drizzle/schema/roles.schema.js';
import type { SeedTransaction } from './seed-transaction.js';

export const seedAdminRoleCode = 'admin';

export type SeededRole = { id: string; code: string };

export async function seedAdminRole(transaction: SeedTransaction): Promise<SeededRole> {
  const [createdRole] = await transaction
    .insert(roles)
    .values({
      code: seedAdminRoleCode,
      name: 'Admin',
      description: 'Foundation administrator role',
    })
    .onConflictDoNothing({ target: roles.code })
    .returning({ id: roles.id });

  const [existingRole] = createdRole
    ? [createdRole]
    : await transaction
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.code, seedAdminRoleCode))
        .limit(1);

  if (!existingRole) throw new Error('Admin role could not be created or loaded');

  return { id: existingRole.id, code: seedAdminRoleCode };
}
