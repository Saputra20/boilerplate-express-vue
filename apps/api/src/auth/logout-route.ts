import { randomUUID } from 'node:crypto';
import type { Express, RequestHandler } from 'express';
import { createAccessAuthMiddleware } from './access-auth-middleware.js';
import type { AccessAuthService, AccessPrincipal } from './access-auth-service.js';
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
    const principal = response.locals.authPrincipal;
    if (!isAccessPrincipal(principal)) {
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

function isAccessPrincipal(value: unknown): value is AccessPrincipal {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sub' in value &&
    typeof value.sub === 'string' &&
    'sid' in value &&
    typeof value.sid === 'string' &&
    'jti' in value &&
    typeof value.jti === 'string' &&
    'exp' in value &&
    typeof value.exp === 'number' &&
    'revoked' in value &&
    typeof value.revoked === 'boolean'
  );
}
