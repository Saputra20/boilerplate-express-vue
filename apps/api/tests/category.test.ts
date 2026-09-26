import {
  CategoryConflictError,
  CategoryNotFoundError,
  createCategorySchema,
  createCategoryService,
  listCategorySchema,
  updateCategorySchema,
} from '../src/modules/category/services/category.service.js';

const category = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'News',
  slug: 'news',
  description: null,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
};

function repository() {
  return {
    async create() {
      return category;
    },
    async list() {
      return { items: [category], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    },
    async findVisible() {
      return category;
    },
    async update() {
      return category;
    },
    async softDelete() {
      return true;
    },
  };
}

const audit = {
  actorUserId: '22222222-2222-4222-8222-222222222222',
  sessionId: '33333333-3333-4333-8333-333333333333',
  requestId: '44444444-4444-4444-8444-444444444444',
};

describe('category contract', () => {
  it('accepts approved create, update, and list shapes', () => {
    expect(createCategorySchema.parse({ name: 'News', slug: 'news' })).toEqual({
      name: 'News',
      slug: 'news',
    });
    expect(updateCategorySchema.parse({ isActive: false })).toEqual({ isActive: false });
    expect(listCategorySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
      sort: 'createdAt.desc',
    });
  });

  it('rejects non-canonical slugs and empty updates', () => {
    expect(() => createCategorySchema.parse({ name: 'News', slug: 'News Stories' })).toThrow();
    expect(() => updateCategorySchema.parse({})).toThrow();
  });

  it('maps missing resources and unique conflicts to domain errors', async () => {
    const missingRepository = {
      ...repository(),
      async findVisible() {
        return null;
      },
    };
    await expect(createCategoryService(missingRepository).get(category.id)).rejects.toBeInstanceOf(
      CategoryNotFoundError,
    );

    const conflictRepository = {
      ...repository(),
      async create() {
        throw Object.assign(new Error('duplicate'), { code: '23505' });
      },
    };
    await expect(
      createCategoryService(conflictRepository).create({ name: 'News', slug: 'news' }, audit),
    ).rejects.toBeInstanceOf(CategoryConflictError);
  });
});
