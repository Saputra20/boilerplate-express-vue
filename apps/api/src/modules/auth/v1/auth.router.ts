import { Router } from 'express';
import { createAccessAuthMiddleware } from '../../../middleware/authentication.middleware.js';
import { createLoginController } from './controllers/login.controller.js';
import { createLogoutController } from './controllers/logout.controller.js';
import { createRefreshController } from './controllers/refresh.controller.js';
import type { AccessAuthService } from '../services/access-auth.service.js';
import type { LoginService } from '../services/login.service.js';
import type { LogoutService } from '../services/logout.service.js';
import type { RefreshService } from '../services/refresh-token.service.js';

export type AuthRouterDependencies = {
  loginService?: LoginService;
  refreshService?: RefreshService;
  accessAuthService?: AccessAuthService;
  logoutService?: LogoutService;
};

export function createAuthRouter({
  loginService,
  refreshService,
  accessAuthService,
  logoutService,
}: AuthRouterDependencies) {
  const router = Router();

  if (loginService) router.post('/login', createLoginController(loginService));
  if (refreshService) router.post('/refresh', createRefreshController(refreshService));
  if (accessAuthService && logoutService) {
    const authenticateLogout = createAccessAuthMiddleware(accessAuthService, {
      allowRevoked: true,
    });
    router.post('/logout', authenticateLogout, createLogoutController(logoutService, 'current'));
    router.post('/logout-all', authenticateLogout, createLogoutController(logoutService, 'all'));
  }

  return router;
}
