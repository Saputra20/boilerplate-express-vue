import { Router } from 'express';
import { createAccessAuthMiddleware } from '../../../middleware/authentication.middleware.js';
import { createPermissionMiddleware } from '../../../middleware/permission.middleware.js';
import type { AccessAuthService } from '../../auth/services/access-auth.service.js';
import type { PermissionService } from '../../rbac/services/permission.service.js';
import type { UserService } from '../services/user.service.js';
import { createUserController } from './controllers/user.controller.js';
export function createUserRouter({
  accessAuthService,
  permissionService,
  userService,
}: {
  accessAuthService: AccessAuthService;
  permissionService: PermissionService;
  userService: UserService;
}) {
  const router = Router();
  const c = createUserController(userService);
  const auth = createAccessAuthMiddleware(accessAuthService);
  router.get('/', auth, createPermissionMiddleware(permissionService, 'user.read'), c.list);
  router.get('/:id', auth, createPermissionMiddleware(permissionService, 'user.read'), c.get);
  router.post('/', auth, createPermissionMiddleware(permissionService, 'user.create'), c.create);
  router.put('/:id', auth, createPermissionMiddleware(permissionService, 'user.update'), c.update);
  router.delete(
    '/:id',
    auth,
    createPermissionMiddleware(permissionService, 'user.delete'),
    c.remove,
  );
  return router;
}
