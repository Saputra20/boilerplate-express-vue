import type { RequestHandler } from 'express';
import { getAccessPrincipal } from '../../../../middleware/authentication.middleware.js';
import {
  createUserSchema,
  listUserSchema,
  updateUserSchema,
  userIdSchema,
  UserConflictError,
  UserNotFoundError,
  UserProtectedError,
  type UserService,
} from '../../services/user.service.js';
export function createUserController(service: UserService) {
  return {
    create: handler(async (req, res) => {
      const p = principal(res);
      res
        .status(201)
        .json(
          serializeUser(await service.create(createUserSchema.parse(req.body), context(req, p))),
        );
    }),
    list: handler(async (req, res) => {
      principal(res);
      const result = await service.list(listUserSchema.parse(req.query));
      res.status(200).json({ ...result, items: result.items.map(serializeUser) });
    }),
    get: handler(async (req, res) => {
      principal(res);
      res.status(200).json(serializeUser(await service.get(userIdSchema.parse(req.params.id))));
    }),
    update: handler(async (req, res) => {
      const p = principal(res);
      res
        .status(200)
        .json(
          serializeUser(
            await service.update(
              userIdSchema.parse(req.params.id),
              updateUserSchema.parse(req.body),
              context(req, p),
            ),
          ),
        );
    }),
    remove: handler(async (req, res) => {
      const p = principal(res);
      await service.remove(userIdSchema.parse(req.params.id), context(req, p));
      res.status(204).end();
    }),
  };
}
function handler(
  fn: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) => Promise<void>,
): RequestHandler {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof UserConflictError || error instanceof UserProtectedError)
        return void res.status(409).json({ message: 'Conflict' });
      if (error instanceof UserNotFoundError)
        return void res.status(404).json({ message: 'Not found' });
      if (error instanceof SyntaxError || (error instanceof Error && error.name === 'ZodError'))
        return void res.status(400).json({ message: 'Bad request' });
      next(error);
    }
  };
}
function principal(res: Parameters<RequestHandler>[1]) {
  const value = getAccessPrincipal(res);
  if (!value) throw new Error('Invalid authentication');
  return value;
}
function context(req: Parameters<RequestHandler>[0], p: ReturnType<typeof getAccessPrincipal>) {
  if (!p || typeof req.id !== 'string') throw new Error('Invalid authentication');
  return { actorUserId: p.sub, sessionId: p.sid, requestId: req.id };
}

function serializeUser(user: import('../../services/user.service.js').User) {
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}
