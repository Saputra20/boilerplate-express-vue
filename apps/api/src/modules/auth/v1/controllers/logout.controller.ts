import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { getAccessPrincipal } from '../../../../middleware/authentication.middleware.js';
import type { LogoutService } from '../../services/logout.service.js';

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
