import type { RequestHandler } from 'express';
import { getAccessPrincipal } from '../../../../middleware/authentication.middleware.js';
import {
  createRoleSchema,
  listRoleSchema,
  ProtectedRoleError,
  InvalidRolePermissionsError,
  RoleAssignedError,
  RoleConflictError,
  roleIdSchema,
  RoleNotFoundError,
  updateRoleSchema,
  type RoleService,
} from '../../services/role.service.js';

export function createRoleController(service: RoleService) {
  return {
    create: handler(async (request, response) => {
      const principal = requirePrincipal(response);
      response
        .status(201)
        .json(
          await service.create(
            createRoleSchema.parse(request.body),
            auditContext(request, principal),
          ),
        );
    }),
    list: handler(async (request, response) => {
      requirePrincipal(response);
      response.status(200).json(await service.list(listRoleSchema.parse(request.query)));
    }),
    get: handler(async (request, response) => {
      requirePrincipal(response);
      response.status(200).json(await service.get(roleIdSchema.parse(request.params.id)));
    }),
    update: handler(async (request, response) => {
      const principal = requirePrincipal(response);
      response
        .status(200)
        .json(
          await service.update(
            roleIdSchema.parse(request.params.id),
            updateRoleSchema.parse(request.body),
            auditContext(request, principal),
          ),
        );
    }),
    remove: handler(async (request, response) => {
      const principal = requirePrincipal(response);
      await service.remove(roleIdSchema.parse(request.params.id), auditContext(request, principal));
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
      if (
        error instanceof RoleConflictError ||
        error instanceof RoleAssignedError ||
        error instanceof ProtectedRoleError
      ) {
        response.status(409).json({ message: 'Conflict' });
        return;
      }
      if (error instanceof RoleNotFoundError) {
        response.status(404).json({ message: 'Not found' });
        return;
      }
      if (error instanceof InvalidRolePermissionsError) {
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
