import type { RequestHandler } from 'express';
import type { Logger } from 'pino';
import { getAccessPrincipal } from './access-auth-middleware.js';
import {
  AuthorizationConfigurationError,
  permissionCodeSchema,
  type PermissionService,
} from './permission-service.js';

export function createPermissionMiddleware(
  service: PermissionService,
  requiredPermission: string,
  logger?: Pick<Logger, 'warn'>,
): RequestHandler {
  if (!permissionCodeSchema.safeParse(requiredPermission).success) {
    throw new AuthorizationConfigurationError();
  }

  return async (request, response, next) => {
    const principal = getAccessPrincipal(response);
    if (principal === null) {
      response.status(401).json({ message: 'Invalid authentication' });
      return;
    }

    try {
      const resolution = await service.authorize({
        userId: principal.sub,
        permission: requiredPermission,
      });
      if (resolution === 'granted') {
        next();
        return;
      }
      if (resolution === 'unknown') throw new AuthorizationConfigurationError();

      logger?.warn(
        {
          requestId: request.id,
          userId: principal.sub,
          sessionId: principal.sid,
          permission: requiredPermission,
          outcome: 'forbidden',
        },
        'Authorization denied',
      );
      response.status(403).json({ message: 'Forbidden' });
    } catch (error) {
      next(error);
    }
  };
}
