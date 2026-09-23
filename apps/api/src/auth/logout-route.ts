import { randomUUID } from 'node:crypto';
import type { Express, RequestHandler } from 'express';
import { createAccessAuthMiddleware, getAccessPrincipal } from './access-auth-middleware.js';
import type { AccessAuthService } from './access-auth-service.js';
import type { LogoutService } from './logout-service.js';

export function installLogoutRoutes(
  app: Express,
  accessAuthService: AccessAuthService,
  logoutService: LogoutService,
): void {
  const authenticateLogout = createAccessAuthMiddleware(accessAuthService, { allowRevoked: true });
  app.post('/auth/logout', authenticateLogout, createLogoutController(logoutService, 'current'));
  app.post('/auth/logout-all', authenticateLogout, createLogoutController(logoutService, 'all'));
}

export function createLogoutController(
  logoutService: LogoutService,
  scope: 'current' | 'all',
): RequestHandler {
  return async (request, response, next) => {
    const principal = getAccessPrincipal(response);
    if (principal === null) {
      response.status(401).json({ message: 'Invalid authentication' });
      return;
    }

    try {
      const input = {
        principal,
        requestId: typeof request.id === 'string' ? request.id : randomUUID(),
      };
      if (scope === 'current') await logoutService.logoutCurrent(input);
      else await logoutService.logoutAll(input);
      response.status(204).send();
    } catch (error) {
      await logoutService
        .recordFailure({
          principal,
          requestId: typeof request.id === 'string' ? request.id : randomUUID(),
          scope,
        })
        .catch(() => undefined);
      next(error);
    }
  };
}
