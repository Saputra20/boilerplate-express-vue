import { Router } from 'express';
import { createAccessAuthMiddleware } from '../../../middleware/authentication.middleware.js';
import type { AccessAuthService } from '../services/access-auth.service.js';
import type { AuthenticatedContextService } from '../services/context.service.js';
import { createMeController } from './controllers/me.controller.js';

export type MeRouterDependencies = {
  accessAuthService: AccessAuthService;
  contextService: AuthenticatedContextService;
};

export function createMeRouter({ accessAuthService, contextService }: MeRouterDependencies) {
  const router = Router();
  router.get(
    '/me',
    createAccessAuthMiddleware(accessAuthService),
    createMeController(contextService),
  );
  return router;
}
