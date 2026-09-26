import { and, asc, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { categories } from '../../../config/drizzle/schema.js';
import type { AuditEvent, AuditService } from '../../audit/services/audit.service.js';
import type { CategoryList, CategoryRepository } from '../services/category.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema.js')>;

type AuditExecutor = Pick<Database, 'insert'>;

export function createCategoryRepository(
  database: Database,
  auditService: AuditService<AuditExecutor>,
): CategoryRepository {
  return {
    async create(input, audit) {
      return database.transaction(async (transaction) => {
        const [category] = await transaction
          .insert(categories)
          .values({
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            isActive: input.isActive ?? true,
          })
          .returning();
        if (!category) throw new Error('Category insert returned no row');
        await auditService.recordRequired(withResourceId(audit, category.id), transaction);
        return category;
      });
    },
    async list(input): Promise<CategoryList> {
      const filters = [isNull(categories.deletedAt)];
      if (input.isActive !== undefined) filters.push(eq(categories.isActive, input.isActive));
      if (input.search) {
        filters.push(
          or(
            ilike(categories.name, `%${input.search}%`),
            ilike(categories.slug, `%${input.search}%`),
          )!,
        );
      }

      const orderBy =
        input.sort === 'name.asc'
          ? asc(categories.name)
          : input.sort === 'name.desc'
            ? desc(categories.name)
            : input.sort === 'createdAt.asc'
              ? asc(categories.createdAt)
              : desc(categories.createdAt);
      const offset = (input.page - 1) * input.limit;
      const [rows, totalRows] = await Promise.all([
        database
          .select()
          .from(categories)
          .where(and(...filters))
          .orderBy(orderBy, asc(categories.id))
          .limit(input.limit)
          .offset(offset),
        database
          .select({ total: count() })
          .from(categories)
          .where(and(...filters)),
      ]);
      const total = Number(totalRows[0]?.total ?? 0);
      return {
        items: rows,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    },
    async findVisible(id) {
      const [category] = await database
        .select()
        .from(categories)
        .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
        .limit(1);
      return category ?? null;
    },
    async update(id, input, audit) {
      return database.transaction(async (transaction) => {
        const [category] = await transaction
          .update(categories)
          .set(input)
          .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
          .returning();
        if (category)
          await auditService.recordRequired(withResourceId(audit, category.id), transaction);
        return category ?? null;
      });
    },
    async softDelete(id, audit) {
      return database.transaction(async (transaction) => {
        const result = await transaction
          .update(categories)
          .set({ deletedAt: new Date() })
          .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
          .returning({ id: categories.id });
        if (result.length === 0) return false;
        await auditService.recordRequired(withResourceId(audit, id), transaction);
        return true;
      });
    },
  };
}

function withResourceId(audit: AuditEvent, resourceId: string): AuditEvent {
  return { ...audit, resourceId };
}
