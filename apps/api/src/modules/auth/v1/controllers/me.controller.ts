import type { RequestHandler } from 'express';
import { getAccessPrincipal } from '../../../../middleware/authentication.middleware.js';
import type { AuthenticatedContextService } from '../../services/context.service.js';
import { randomUUID } from 'node:crypto';
import { updateProfileSchema } from '../validation/profile.validation.js';

export function createMeController(contextService: AuthenticatedContextService): RequestHandler {
  return async (_request, response, next) => {
    const principal = getAccessPrincipal(response);
    if (principal === null) {
      response.status(401).json({ message: 'Invalid authentication' });
      return;
    }

    try {
      const context = await contextService.getContext(principal.sub);
      if (context === null) {
        response.status(401).json({ message: 'Invalid authentication' });
        return;
      }

      response.status(200).json(context);
    } catch (error) {
      next(error);
    }
  };
}

export function createUpdateMeController(
  contextService: AuthenticatedContextService,
): RequestHandler {
  return async (request, response, next) => {
    const principal = getAccessPrincipal(response);
    if (principal === null) {
      response.status(401).json({ message: 'Invalid authentication' });
      return;
    }
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Bad request' });
      return;
    }
    try {
      const result = await contextService.updateDisplayName({
        userId: principal.sub,
        displayName: parsed.data.displayName,
        requestId: typeof request.id === 'string' ? request.id : randomUUID(),
        sessionId: principal.sid,
        ipAddress: request.ip || null,
        userAgent: request.get('user-agent') ?? null,
      });
      if (result === 'invalid_authentication') {
        response.status(401).json({ message: 'Invalid authentication' });
        return;
      }
      if (result === 'password_change_required') {
        response
          .status(403)
          .json({ message: 'Password change required', code: 'password_change_required' });
        return;
      }
      const context = await contextService.getContext(principal.sub);
      if (context === null) {
        response.status(401).json({ message: 'Invalid authentication' });
        return;
      }
      response.status(200).json(context);
    } catch (error) {
      next(error);
    }
  };
}
