import { Router } from 'express';
import { createAccessAuthMiddleware } from '../../../middleware/authentication.middleware.js';
import { createPermissionMiddleware } from '../../../middleware/permission.middleware.js';
import type { AccessAuthService } from '../../auth/services/access-auth.service.js';
import type { PermissionService } from '../../rbac/services/permission.service.js';
import type { CategoryService } from '../services/category.service.js';
import { createCategoryController } from './controllers/category.controller.js';

export type CategoryRouterDependencies = {
  accessAuthService: AccessAuthService;
  permissionService: PermissionService;
  categoryService: CategoryService;
};

export function createCategoryRouter({
  accessAuthService,
  permissionService,
  categoryService,
}: CategoryRouterDependencies) {
  const router = Router();
  const controller = createCategoryController(categoryService);
  const authenticated = createAccessAuthMiddleware(accessAuthService);
  router.get(
    '/',
    authenticated,
    createPermissionMiddleware(permissionService, 'category.read'),
    controller.list,
  );
  router.get(
    '/:id',
    authenticated,
    createPermissionMiddleware(permissionService, 'category.read'),
    controller.get,
  );
  router.post(
    '/',
    authenticated,
    createPermissionMiddleware(permissionService, 'category.create'),
    controller.create,
  );
  router.patch(
    '/:id',
    authenticated,
    createPermissionMiddleware(permissionService, 'category.update'),
    controller.update,
  );
  router.delete(
    '/:id',
    authenticated,
    createPermissionMiddleware(permissionService, 'category.delete'),
    controller.remove,
  );
  return router;
}
