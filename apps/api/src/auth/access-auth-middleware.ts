import type { RequestHandler } from 'express';
import { AccessAuthError, type AccessAuthService } from './access-auth-service.js';

export function createAccessAuthMiddleware(
  service: AccessAuthService,
  options?: { allowRevoked?: boolean },
): RequestHandler {
  return async (request, response, next) => {
    const token = bearerToken(request.header('authorization'));
    if (token === null) {
      response.status(401).json({ message: 'Invalid authentication' });
      return;
    }

    try {
      response.locals.authPrincipal = await service.authenticate(token, options);
      next();
    } catch (error) {
      if (error instanceof AccessAuthError) {
        response.status(401).json({ message: 'Invalid authentication' });
        return;
      }
      next(error);
    }
  };
}

function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer ([^\s]+)$/.exec(header ?? '');
  return match?.[1] ?? null;
}
