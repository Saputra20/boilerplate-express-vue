import type { RequestHandler } from 'express';
import { getAccessPrincipal } from '../../../../middleware/authentication.middleware.js';
import {
  CategoryConflictError,
  CategoryNotFoundError,
  categoryIdSchema,
  createCategorySchema,
  listCategorySchema,
  updateCategorySchema,
  type CategoryService,
} from '../../services/category.service.js';

export function createCategoryController(service: CategoryService) {
  return {
    create: handler(async (request, response) => {
      const principal = requirePrincipal(response);
      const input = createCategorySchema.parse(request.body);
      const category = await service.create(input, auditContext(request, principal));
      response.status(201).json(category);
    }),
    list: handler(async (request, response) => {
      requirePrincipal(response);
      response.status(200).json(await service.list(listCategorySchema.parse(request.query)));
    }),
    get: handler(async (request, response) => {
      requirePrincipal(response);
      response.status(200).json(await service.get(categoryIdSchema.parse(request.params.id)));
    }),
    update: handler(async (request, response) => {
      const principal = requirePrincipal(response);
      const input = updateCategorySchema.parse(request.body);
      const category = await service.update(
        categoryIdSchema.parse(request.params.id),
        input,
        auditContext(request, principal),
      );
      response.status(200).json(category);
    }),
    remove: handler(async (request, response) => {
      const principal = requirePrincipal(response);
      await service.remove(
        categoryIdSchema.parse(request.params.id),
        auditContext(request, principal),
      );
      response.status(204).end();
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
      if (error instanceof CategoryConflictError) {
        response.status(409).json({ message: 'Conflict' });
        return;
      }
      if (error instanceof CategoryNotFoundError) {
        response.status(404).json({ message: 'Not found' });
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

function requirePrincipal(response: Parameters<RequestHandler>[1]) {
  const principal = getAccessPrincipal(response);
  if (principal === null) throw new Error('Invalid authentication');
  return principal;
}

function auditContext(
  request: Parameters<RequestHandler>[0],
  principal: ReturnType<typeof getAccessPrincipal>,
) {
  if (principal === null || typeof request.id !== 'string')
    throw new Error('Invalid authentication');
  return { actorUserId: principal.sub, sessionId: principal.sid, requestId: request.id };
}
