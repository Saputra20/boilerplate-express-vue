import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { roles, userRoles, users } from '../../../config/drizzle/schema/index.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema/index.js')>;

export type AuthenticatedUserRecord = {
  id: string;
  email: string;
  mustChangePassword: boolean;
  roles: readonly string[];
};

export type AuthenticatedUserRepository = {
  findActiveUser(input: { userId: string }): Promise<AuthenticatedUserRecord | null>;
};

export function createAuthenticatedUserRepository(database: Database): AuthenticatedUserRepository {
  return {
    async findActiveUser({ userId }) {
      const rows = await database
        .select({
          id: users.id,
          email: users.email,
          mustChangePassword: users.mustChangePassword,
          roleCode: roles.code,
        })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .leftJoin(roles, eq(roles.id, userRoles.roleId))
        .where(and(eq(users.id, userId), eq(users.status, 'active'), isNull(users.deletedAt)));

      const first = rows[0];
      if (first === undefined) return null;

      return {
        id: first.id,
        email: first.email,
        mustChangePassword: first.mustChangePassword,
        roles: [
          ...new Set(rows.flatMap((row) => (row.roleCode === null ? [] : [row.roleCode]))),
        ].sort(),
      };
    },
  };
}
