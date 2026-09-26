import { Router } from 'express';
import { createAccessAuthMiddleware } from '../../../middleware/authentication.middleware.js';
import { createPermissionMiddleware } from '../../../middleware/permission.middleware.js';
import type { AccessAuthService } from '../../auth/services/access-auth.service.js';
import type { PermissionService } from '../../rbac/services/permission.service.js';
import type { DashboardService } from '../services/dashboard.service.js';
import { createDashboardController } from './controllers/dashboard.controller.js';
export function createDashboardRouter({
  accessAuthService,
  permissionService,
  dashboardService,
}: {
  accessAuthService: AccessAuthService;
  permissionService: PermissionService;
  dashboardService: DashboardService;
}) {
  const router = Router();
  router.get(
    '/summary',
    createAccessAuthMiddleware(accessAuthService),
    createPermissionMiddleware(permissionService, 'dashboard.read'),
    createDashboardController(dashboardService),
  );
  return router;
}
