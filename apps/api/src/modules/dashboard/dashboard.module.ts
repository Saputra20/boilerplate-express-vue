import type { Database } from '../../config/database/client.js';
import type { AccessAuthService } from '../auth/services/access-auth.service.js';
import type { PermissionService } from '../rbac/services/permission.service.js';
import { createDashboardRepository } from './repositories/dashboard.repository.js';
import { createDashboardService } from './services/dashboard.service.js';
import { createDashboardRouter } from './v1/dashboard.router.js';
export function createDashboardModule({
  db,
  accessAuthService,
  permissionService,
}: {
  db: Database;
  accessAuthService: AccessAuthService;
  permissionService: PermissionService;
}) {
  const dashboardService = createDashboardService(createDashboardRepository(db));
  return {
    v1: {
      router: createDashboardRouter({ accessAuthService, permissionService, dashboardService }),
    },
  };
}
