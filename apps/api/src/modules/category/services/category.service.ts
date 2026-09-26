import { z } from 'zod';
import type { AuditEvent } from '../../audit/services/audit.service.js';

export const categoryIdSchema = z.uuid();
export const categorySlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const categoryFields = {
  name: z
    .string()
    .min(1)
    .max(120)
    .refine((value) => value.trim().length > 0),
  slug: categorySlugSchema,
  description: z.string().max(500).nullable(),
  isActive: z.boolean(),
};

export const createCategorySchema = z
  .object({
    name: categoryFields.name,
    slug: categoryFields.slug,
    description: categoryFields.description.optional(),
    isActive: categoryFields.isActive.optional(),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: categoryFields.name.optional(),
    slug: categoryFields.slug.optional(),
    description: categoryFields.description.optional(),
    isActive: categoryFields.isActive.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const listCategorySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(120).optional(),
    isActive: z.preprocess(parseBooleanQuery, z.boolean()).optional(),
    sort: z
      .enum(['name.asc', 'name.desc', 'createdAt.asc', 'createdAt.desc'])
      .default('createdAt.desc'),
  })
  .strict();

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CategoryList = {
  items: Category[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type CategoryRepository = {
  create(input: CreateCategoryInput, audit: AuditEvent): Promise<Category>;
  list(input: ListCategoryInput): Promise<CategoryList>;
  findVisible(id: string): Promise<Category | null>;
  update(id: string, input: UpdateCategoryInput, audit: AuditEvent): Promise<Category | null>;
  softDelete(id: string, audit: AuditEvent): Promise<boolean>;
};

type CreateCategoryInput = z.infer<typeof createCategorySchema>;
type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
type ListCategoryInput = z.infer<typeof listCategorySchema>;

export class CategoryConflictError extends Error {}
export class CategoryNotFoundError extends Error {}

export type CategoryService = {
  create(input: CreateCategoryInput, audit: AuditContext): Promise<Category>;
  list(input: ListCategoryInput): Promise<CategoryList>;
  get(id: string): Promise<Category>;
  update(id: string, input: UpdateCategoryInput, audit: AuditContext): Promise<Category>;
  remove(id: string, audit: AuditContext): Promise<void>;
};

type AuditContext = { actorUserId: string; sessionId: string; requestId: string };

export function createCategoryService(repository: CategoryRepository): CategoryService {
  return {
    async create(input, audit) {
      try {
        return await repository.create(input, auditEvent('category.created', audit));
      } catch (error) {
        if (isUniqueViolation(error)) throw new CategoryConflictError();
        throw error;
      }
    },
    list(input) {
      return repository.list(input);
    },
    async get(id) {
      const category = await repository.findVisible(id);
      if (category === null) throw new CategoryNotFoundError();
      return category;
    },
    async update(id, input, audit) {
      try {
        const category = await repository.update(
          id,
          input,
          auditEvent('category.updated', audit, id),
        );
        if (category === null) throw new CategoryNotFoundError();
        return category;
      } catch (error) {
        if (isUniqueViolation(error)) throw new CategoryConflictError();
        throw error;
      }
    },
    async remove(id, audit) {
      const deleted = await repository.softDelete(id, auditEvent('category.deleted', audit, id));
      if (!deleted) throw new CategoryNotFoundError();
    },
  };
}

function auditEvent(
  eventType: AuditEvent['eventType'],
  context: AuditContext,
  resourceId?: string,
): AuditEvent {
  return {
    eventType,
    actorType: 'user',
    actorUserId: context.actorUserId,
    sessionId: context.sessionId,
    requestId: context.requestId,
    resourceType: 'category',
    resourceId: resourceId ?? null,
    outcome: 'success',
    metadata: null,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

function parseBooleanQuery(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}
