import { z } from 'zod';
import { hashPassword } from '../../../helpers/password.helper.js';
import type { AuditEvent } from '../../audit/services/audit.service.js';

export const userIdSchema = z.uuid();
const userFields = {
  email: z.email().transform((value) => value.toLowerCase()),
  roleId: z.uuid().nullable(),
};
export const createUserSchema = z.object({ email: userFields.email, roleId: z.uuid() }).strict();
export const updateUserSchema = z
  .object({
    email: userFields.email.optional(),
    roleId: userFields.roleId.optional(),
    status: z.enum(['active', 'disabled']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
export const listUserSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(255).optional(),
    status: z.enum(['active', 'disabled']).optional(),
    sort: z
      .enum(['email.asc', 'email.desc', 'createdAt.asc', 'createdAt.desc'])
      .default('createdAt.desc'),
  })
  .strict();

export type User = {
  id: string;
  email: string;
  status: 'active' | 'disabled';
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  role: { id: string; code: string; name: string } | null;
};
export type UserList = {
  items: User[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
export type UserAuditContext = { actorUserId: string; sessionId: string; requestId: string };
type CreateInput = z.infer<typeof createUserSchema>;
type UpdateInput = z.infer<typeof updateUserSchema>;
type ListInput = z.infer<typeof listUserSchema>;
export type UserRepository = {
  create(input: CreateInput & { passwordHash: string }, audit: AuditEvent): Promise<User>;
  list(input: ListInput): Promise<UserList>;
  findById(id: string): Promise<User | null>;
  update(id: string, input: UpdateInput, audit: AuditEvent): Promise<User | null>;
  softDelete(
    id: string,
    audit: AuditEvent,
  ): Promise<'deleted' | 'missing' | 'protected' | 'lastAdmin'>;
};
export class UserConflictError extends Error {}
export class UserNotFoundError extends Error {}
export class UserProtectedError extends Error {}
export type UserService = {
  create(input: CreateInput, audit: UserAuditContext): Promise<User>;
  list(input: ListInput): Promise<UserList>;
  get(id: string): Promise<User>;
  update(id: string, input: UpdateInput, audit: UserAuditContext): Promise<User>;
  remove(id: string, audit: UserAuditContext): Promise<void>;
};

export function createUserService(
  repository: UserRepository,
  defaultPassword: string,
): UserService {
  return {
    async create(input, audit) {
      try {
        return await repository.create(
          { ...input, passwordHash: await hashPassword(defaultPassword) },
          event('user.created', audit),
        );
      } catch (error) {
        if (isUnique(error)) throw new UserConflictError();
        throw error;
      }
    },
    list: (input) => repository.list(input),
    async get(id) {
      const user = await repository.findById(id);
      if (!user) throw new UserNotFoundError();
      return user;
    },
    async update(id, input, audit) {
      try {
        const user = await repository.update(id, input, event('user.updated', audit, id));
        if (!user) throw new UserNotFoundError();
        return user;
      } catch (error) {
        if (isUnique(error)) throw new UserConflictError();
        throw error;
      }
    },
    async remove(id, audit) {
      const result = await repository.softDelete(id, event('user.deleted', audit, id));
      if (result === 'missing') throw new UserNotFoundError();
      if (result === 'protected' || result === 'lastAdmin') throw new UserProtectedError();
    },
  };
}
function event(
  eventType: AuditEvent['eventType'],
  context: UserAuditContext,
  resourceId?: string,
): AuditEvent {
  return {
    eventType,
    actorType: 'user',
    actorUserId: context.actorUserId,
    sessionId: context.sessionId,
    requestId: context.requestId,
    resourceType: 'user',
    resourceId: resourceId ?? null,
    outcome: 'success',
    metadata: null,
  };
}
function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
