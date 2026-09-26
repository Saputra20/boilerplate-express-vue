import { eq } from 'drizzle-orm';
import { users } from '../../src/config/drizzle/schema/users.schema.js';
import type { SeedTransaction } from './seed-transaction.js';

export const seedAdminEmail = 'developer@dispostable.com';

export type SeededUser = { id: string; email: string };

export async function seedAdminUser(
  transaction: SeedTransaction,
  passwordHash: string,
): Promise<SeededUser> {
  const [existingUser] = await transaction
    .select({ id: users.id, status: users.status, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.email, seedAdminEmail))
    .limit(1);

  if (existingUser && (existingUser.status !== 'active' || existingUser.deletedAt !== null)) {
    throw new Error('Seed account exists but is disabled or deleted');
  }

  let userId = existingUser?.id;
  if (!userId) {
    const [createdUser] = await transaction
      .insert(users)
      .values({ email: seedAdminEmail, passwordHash, status: 'active' })
      .returning({ id: users.id });
    userId = createdUser?.id;
  }

  if (!userId) throw new Error('Seed account could not be created or loaded');

  return { id: userId, email: seedAdminEmail };
}
