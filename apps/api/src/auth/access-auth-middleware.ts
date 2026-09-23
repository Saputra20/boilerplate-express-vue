import type { RequestHandler } from 'express';
import {
  AccessAuthError,
  type AccessAuthService,
  type AccessPrincipal,
} from './access-auth-service.js';

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

export function getAccessPrincipal(response: {
  locals: { authPrincipal?: unknown };
}): AccessPrincipal | null {
  const value = response.locals.authPrincipal;
  if (
    typeof value !== 'object' ||
    value === null ||
    !('sub' in value) ||
    typeof value.sub !== 'string' ||
    !('sid' in value) ||
    typeof value.sid !== 'string' ||
    !('jti' in value) ||
    typeof value.jti !== 'string' ||
    !('exp' in value) ||
    typeof value.exp !== 'number' ||
    !('revoked' in value) ||
    typeof value.revoked !== 'boolean'
  ) {
    return null;
  }

  return {
    sub: value.sub,
    sid: value.sid,
    jti: value.jti,
    exp: value.exp,
    revoked: value.revoked,
  };
}
