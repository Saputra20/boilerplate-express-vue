import { Router } from 'express';
import { createAccessAuthMiddleware } from '../../../middleware/authentication.middleware.js';
import { createPermissionMiddleware } from '../../../middleware/permission.middleware.js';
import type { AccessAuthService } from '../../auth/services/access-auth.service.js';
import type { PermissionService } from '../../rbac/services/permission.service.js';
import type { AuditReadService } from '../services/audit-read.service.js';
import { createAuditController } from './controllers/audit.controller.js';

export function createAuditRouter({
  accessAuthService,
  permissionService,
  auditService,
}: {
  accessAuthService: AccessAuthService;
  permissionService: PermissionService;
  auditService: AuditReadService;
}) {
  const router = Router();
  const authenticated = createAccessAuthMiddleware(accessAuthService);
  const controller = createAuditController(auditService);

  router.get(
    '/',
    authenticated,
    createPermissionMiddleware(permissionService, 'audit.read'),
    controller.list,
  );
  router.get(
    '/export',
    authenticated,
    createPermissionMiddleware(permissionService, 'audit.read'),
    createPermissionMiddleware(permissionService, 'audit.export'),
    controller.export,
  );
  router.get(
    '/:id',
    authenticated,
    createPermissionMiddleware(permissionService, 'audit.read'),
    controller.get,
  );

  return router;
}
