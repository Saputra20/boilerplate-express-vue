import { z } from 'zod';
import type { AuditEvent } from '../../audit/services/audit.service.js';

export const roleIdSchema = z.uuid();
export const roleCodeSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/);

const roleFields = {
  name: z
    .string()
    .min(1)
    .max(120)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0),
  description: z.string().max(500).nullable(),
};

const permissionCodesSchema = z
  .array(z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/))
  .default([]);

export const createRoleSchema = z
  .object({
    code: roleCodeSchema,
    name: roleFields.name,
    description: roleFields.description.optional(),
    permissionCodes: permissionCodesSchema,
  })
  .strict();

export const updateRoleSchema = z
  .object({
    name: roleFields.name.optional(),
    description: roleFields.description.optional(),
    permissionCodes: z.array(z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/)).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const listRoleSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(120).optional(),
    sort: z
      .enum(['name.asc', 'name.desc', 'createdAt.asc', 'createdAt.desc'])
      .default('createdAt.desc'),
  })
  .strict();

export type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  permissionCodes: string[];
};

export type RoleList = {
  items: Role[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type CreateRoleInput = z.infer<typeof createRoleSchema>;
type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
type ListRoleInput = z.infer<typeof listRoleSchema>;
export type RoleAuditContext = { actorUserId: string; sessionId: string; requestId: string };

export type RoleRepository = {
  create(input: CreateRoleInput, audit: AuditEvent): Promise<Role>;
  list(input: ListRoleInput): Promise<RoleList>;
  findById(id: string): Promise<Role | null>;
  update(id: string, input: UpdateRoleInput, audit: AuditEvent): Promise<Role | null>;
  delete(id: string, audit: AuditEvent): Promise<'deleted' | 'missing' | 'assigned'>;
};

export class RoleConflictError extends Error {}
export class RoleNotFoundError extends Error {}
export class RoleAssignedError extends Error {}
export class ProtectedRoleError extends Error {}
export class InvalidRolePermissionsError extends Error {}

export type RoleService = {
  create(input: CreateRoleInput, audit: RoleAuditContext): Promise<Role>;
  list(input: ListRoleInput): Promise<RoleList>;
  get(id: string): Promise<Role>;
  update(id: string, input: UpdateRoleInput, audit: RoleAuditContext): Promise<Role>;
  remove(id: string, audit: RoleAuditContext): Promise<void>;
};

export function createRoleService(repository: RoleRepository): RoleService {
  return {
    async create(input, audit) {
      try {
        return await repository.create(input, auditEvent('role.created', audit));
      } catch (error) {
        if (error instanceof InvalidRolePermissionsError) throw error;
        if (isUniqueViolation(error)) throw new RoleConflictError();
        throw error;
      }
    },
    list(input) {
      return repository.list(input);
    },
    async get(id) {
      const role = await repository.findById(id);
      if (role === null) throw new RoleNotFoundError();
      return role;
    },
    async update(id, input, audit) {
      const existing = await repository.findById(id);
      if (existing === null) throw new RoleNotFoundError();
      if (existing.code === 'admin') throw new ProtectedRoleError();
      try {
        const role = await repository.update(id, input, auditEvent('role.updated', audit, id));
        if (role === null) throw new RoleNotFoundError();
        return role;
      } catch (error) {
        if (error instanceof InvalidRolePermissionsError) throw error;
        if (isUniqueViolation(error)) throw new RoleConflictError();
        throw error;
      }
    },
    async remove(id, audit) {
      const existing = await repository.findById(id);
      if (existing === null) throw new RoleNotFoundError();
      if (existing.code === 'admin') throw new ProtectedRoleError();
      const result = await repository.delete(id, auditEvent('role.deleted', audit, id));
      if (result === 'missing') throw new RoleNotFoundError();
      if (result === 'assigned') throw new RoleAssignedError();
    },
  };
}

function auditEvent(
  eventType: AuditEvent['eventType'],
  context: RoleAuditContext,
  resourceId?: string,
): AuditEvent {
  return {
    eventType,
    actorType: 'user',
    actorUserId: context.actorUserId,
    sessionId: context.sessionId,
    requestId: context.requestId,
    resourceType: 'role',
    resourceId: resourceId ?? null,
    outcome: 'success',
    metadata: null,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
