import type { RequestHandler } from 'express';
import { getAccessPrincipal } from '../../../../middleware/authentication.middleware.js';
import {
  AuditEventNotFoundError,
  AuditQueryValidationError,
  type AuditReadService,
} from '../../services/audit-read.service.js';

export function createAuditController(service: AuditReadService) {
  return {
    list: handler(async (request, response) => {
      response.status(200).json(await service.list(request.query));
    }),

    get: handler(async (request, response) => {
      const id = typeof request.params.id === 'string' ? request.params.id : '';
      const result = await service.get(id);
      if (result === null) {
        response.status(404).json({ message: 'Not found' });
        return;
      }
      response.status(200).json(result);
    }),

    export: handler(async (request, response) => {
      const principal = getAccessPrincipal(response);
      if (principal === null || typeof request.id !== 'string') {
        response.status(401).json({ message: 'Invalid authentication' });
        return;
      }
      const csv = await service.export(request.query, {
        actorUserId: principal.sub,
        sessionId: principal.sid,
        requestId: request.id,
      });
      response
        .status(200)
        .type('text/csv')
        .set('Content-Disposition', 'attachment; filename="audit-trail.csv"')
        .send(csv);
    }),
  };
}

function handler(
  fn: (
    request: Parameters<RequestHandler>[0],
    response: Parameters<RequestHandler>[1],
  ) => Promise<void>,
): RequestHandler {
  return async (request, response, next) => {
    try {
      await fn(request, response);
    } catch (error) {
      if (error instanceof AuditEventNotFoundError) {
        response.status(404).json({ message: 'Not found' });
        return;
      }
      if (error instanceof AuditQueryValidationError) {
        response.status(400).json({ message: 'Bad request' });
        return;
      }
      if (error instanceof SyntaxError || (error instanceof Error && error.name === 'ZodError')) {
        response.status(400).json({ message: 'Bad request' });
        return;
      }
      next(error);
    }
  };
}
