import { Router } from 'express';
import { createAccessAuthMiddleware } from '../../../middleware/authentication.middleware.js';
import { createPermissionMiddleware } from '../../../middleware/permission.middleware.js';
import type { AccessAuthService } from '../../auth/services/access-auth.service.js';
import type { PermissionService } from '../../rbac/services/permission.service.js';
import type { RoleService } from '../services/role.service.js';
import { createRoleController } from './controllers/role.controller.js';

export function createRoleRouter({
  accessAuthService,
  permissionService,
  roleService,
}: {
  accessAuthService: AccessAuthService;
  permissionService: PermissionService;
  roleService: RoleService;
}) {
  const router = Router();
  const controller = createRoleController(roleService);
  const authenticated = createAccessAuthMiddleware(accessAuthService);
  router.get(
    '/',
    authenticated,
    createPermissionMiddleware(permissionService, 'role.read'),
    controller.list,
  );
  router.get(
    '/:id',
    authenticated,
    createPermissionMiddleware(permissionService, 'role.read'),
    controller.get,
  );
  router.post(
    '/',
    authenticated,
    createPermissionMiddleware(permissionService, 'role.create'),
    controller.create,
  );
  router.patch(
    '/:id',
    authenticated,
    createPermissionMiddleware(permissionService, 'role.update'),
    controller.update,
  );
  router.delete(
    '/:id',
    authenticated,
    createPermissionMiddleware(permissionService, 'role.delete'),
    controller.remove,
  );
  return router;
}
