import type { RequestHandler } from 'express';
import { getAccessPrincipal } from '../../../../middleware/authentication.middleware.js';
import type { AuthenticatedContextService } from '../../services/context.service.js';

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
