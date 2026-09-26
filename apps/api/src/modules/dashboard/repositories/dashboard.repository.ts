import { count, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { categories, roles, users } from '../../../config/drizzle/schema.js';
import type { DashboardRepository } from '../services/dashboard.service.js';
type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema.js')>;
export function createDashboardRepository(database: Database): DashboardRepository {
  return {
    async summary() {
      const [userCounts, roleCounts, categoryCounts] = await Promise.all([
        database
          .select({ status: users.status, total: count() })
          .from(users)
          .where(isNull(users.deletedAt))
          .groupBy(users.status),
        database.select({ total: count() }).from(roles),
        database
          .select({ isActive: categories.isActive, total: count() })
          .from(categories)
          .where(isNull(categories.deletedAt))
          .groupBy(categories.isActive),
      ]);
      const activeUsers = Number(userCounts.find((row) => row.status === 'active')?.total ?? 0);
      const disabledUsers = Number(userCounts.find((row) => row.status === 'disabled')?.total ?? 0);
      const activeCategories = Number(categoryCounts.find((row) => row.isActive)?.total ?? 0);
      const totalCategories = categoryCounts.reduce((sum, row) => sum + Number(row.total), 0);
      return {
        users: { total: activeUsers + disabledUsers, active: activeUsers, disabled: disabledUsers },
        roles: { total: Number(roleCounts[0]?.total ?? 0) },
        categories: { total: totalCategories, active: activeCategories },
      };
    },
  };
}
