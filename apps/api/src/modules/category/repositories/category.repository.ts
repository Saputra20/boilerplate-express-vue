import { and, asc, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { categories, users } from '../../../config/drizzle/schema/index.js';
import type { AuditEvent, AuditService } from '../../audit/services/audit.service.js';
import type { CategoryList, CategoryRepository } from '../services/category.service.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema/index.js')>;

type AuditExecutor = Pick<Database, 'insert'>;
type Category = typeof categories.$inferSelect;
type CategoryAuditValues = Pick<Category, 'name' | 'slug' | 'description' | 'isActive'>;
type CategoryAuditMetadata = {
  before: Partial<CategoryAuditValues> | null;
  after: Partial<CategoryAuditValues> | null;
};
type ActorSnapshot = {
  actorSnapshotId: string;
  actorSnapshotDisplayName: string | null;
  actorSnapshotEmail: string | null;
};

export function createCategoryRepository(
  database: Database,
  auditService: AuditService<AuditExecutor>,
): CategoryRepository {
  return {
    async create(input, audit) {
      const result = await database.transaction(async (transaction) => {
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
        return {
          category,
          audit: createAuditEvent(
            'category.created',
            audit,
            await actorSnapshot(transaction, audit.actorUserId),
            category.id,
            { before: null, after: categoryValues(category) },
          ),
        };
      });
      await auditService.recordInformational(result.audit);
      return result.category;
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
      const result = await database.transaction(async (transaction) => {
        const [before] = await transaction
          .select()
          .from(categories)
          .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
          .for('update')
          .limit(1);
        if (!before) return null;
        const [category] = await transaction
          .update(categories)
          .set(input)
          .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
          .returning();
        if (!category) return null;
        return {
          category,
          audit: createAuditEvent(
            'category.updated',
            audit,
            await actorSnapshot(transaction, audit.actorUserId),
            category.id,
            categoryChanges(categoryValues(before), categoryValues(category)),
          ),
        };
      });
      if (!result) return null;
      await auditService.recordInformational(result.audit);
      return result.category;
    },
    async softDelete(id, audit) {
      const result = await database.transaction(async (transaction) => {
        const [before] = await transaction
          .select()
          .from(categories)
          .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
          .for('update')
          .limit(1);
        if (!before) return false;
        const deleted = await transaction
          .update(categories)
          .set({ deletedAt: new Date() })
          .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
          .returning({ id: categories.id });
        if (deleted.length === 0) return false;
        return {
          audit: createAuditEvent(
            'category.deleted',
            audit,
            await actorSnapshot(transaction, audit.actorUserId),
            id,
            { before: categoryValues(before), after: null },
          ),
        };
      });
      if (!result) return false;
      await auditService.recordInformational(result.audit);
      return true;
    },
  };
}

async function actorSnapshot(
  transaction: Pick<Database, 'select'>,
  actorUserId: string | null | undefined,
): Promise<ActorSnapshot> {
  if (!actorUserId) throw new Error('Audit actor missing');
  const [actor] = await transaction
    .select({ id: users.id, displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, actorUserId))
    .limit(1);
  return {
    actorSnapshotId: actorUserId,
    actorSnapshotDisplayName: actor?.displayName ?? null,
    actorSnapshotEmail: actor?.email ?? null,
  };
}

function createAuditEvent(
  eventType: AuditEvent['eventType'],
  context: Pick<AuditEvent, 'requestId' | 'sessionId'>,
  actor: ActorSnapshot,
  resourceId: string,
  metadata: CategoryAuditMetadata,
) {
  return {
    eventType,
    actorType: 'user' as const,
    actorUserId: actor.actorSnapshotId,
    ...actor,
    resourceType: 'category',
    resourceId,
    outcome: 'success' as const,
    requestId: context.requestId,
    sessionId: context.sessionId,
    metadata,
  };
}

function categoryValues(category: Category): CategoryAuditValues {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    isActive: category.isActive,
  };
}

function categoryChanges(
  before: CategoryAuditValues,
  after: CategoryAuditValues,
): CategoryAuditMetadata {
  const beforeChanges: Partial<CategoryAuditValues> = {};
  const afterChanges: Partial<CategoryAuditValues> = {};
  if (before.name !== after.name) {
    beforeChanges.name = before.name;
    afterChanges.name = after.name;
  }
  if (before.slug !== after.slug) {
    beforeChanges.slug = before.slug;
    afterChanges.slug = after.slug;
  }
  if (before.description !== after.description) {
    beforeChanges.description = before.description;
    afterChanges.description = after.description;
  }
  if (before.isActive !== after.isActive) {
    beforeChanges.isActive = before.isActive;
    afterChanges.isActive = after.isActive;
  }
  return { before: beforeChanges, after: afterChanges };
}
