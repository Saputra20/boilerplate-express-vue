import type { Express } from 'express';
import { createAccessAuthMiddleware } from '../../middleware/authentication.middleware.js';
import { createLoginController } from './controllers/login.controller.js';
import { createLogoutController } from './controllers/logout.controller.js';
import { createRefreshController } from './controllers/refresh.controller.js';
import type { AccessAuthService } from './services/access-auth.service.js';
import type { LoginService } from './services/login.service.js';
import type { LogoutService } from './services/logout.service.js';
import type { RefreshService } from './services/refresh-token.service.js';

export function installLoginRoute(app: Express, loginService: LoginService): void {
  app.post('/auth/login', createLoginController(loginService));
}

export function installRefreshRoute(app: Express, refreshService: RefreshService): void {
  app.post('/auth/refresh', createRefreshController(refreshService));
}

export function installLogoutRoutes(
  app: Express,
  accessAuthService: AccessAuthService,
  logoutService: LogoutService,
): void {
  const authenticateLogout = createAccessAuthMiddleware(accessAuthService, { allowRevoked: true });
  app.post('/auth/logout', authenticateLogout, createLogoutController(logoutService, 'current'));
  app.post('/auth/logout-all', authenticateLogout, createLogoutController(logoutService, 'all'));
}
