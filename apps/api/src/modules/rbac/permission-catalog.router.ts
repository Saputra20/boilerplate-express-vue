import { Router } from 'express';
import { createAccessAuthMiddleware } from '../../middleware/authentication.middleware.js';
import type { AccessAuthService } from '../auth/services/access-auth.service.js';
import type { PermissionService } from './services/permission.service.js';

export function createPermissionCatalogRouter({
  accessAuthService,
  permissionService,
}: {
  accessAuthService: AccessAuthService;
  permissionService: PermissionService;
}) {
  const router = Router();
  router.get(
    '/permissions',
    createAccessAuthMiddleware(accessAuthService),
    async (_request, response, next) => {
      try {
        response.status(200).json(await permissionService.listCatalog());
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
