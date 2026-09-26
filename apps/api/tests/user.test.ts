import {
  createUserSchema,
  createUserService,
  UserConflictError,
  UserNotFoundError,
  updateUserSchema,
} from '../src/modules/user/services/user.service.js';
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  status: 'active' as const,
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  role: { id: '22222222-2222-4222-8222-222222222222', code: 'editor', name: 'Editor' },
};
const audit = {
  actorUserId: '33333333-3333-4333-8333-333333333333',
  sessionId: '44444444-4444-4444-8444-444444444444',
  requestId: '55555555-5555-4555-8555-555555555555',
};
function repository() {
  return {
    async create() {
      return user;
    },
    async list() {
      return { items: [user], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    },
    async findById() {
      return user;
    },
    async update() {
      return user;
    },
    async softDelete() {
      return 'deleted' as const;
    },
  };
}
describe('user contract', () => {
  it('normalizes email and rejects unknown fields', () => {
    expect(createUserSchema.parse({ email: 'USER@example.com', roleId: user.role.id }).email).toBe(
      'user@example.com',
    );
    expect(() => updateUserSchema.parse({ passwordHash: 'bad' })).toThrow();
  });
  it('maps missing and duplicate users to safe domain errors', async () => {
    const missing = {
      ...repository(),
      async findById() {
        return null;
      },
    };
    await expect(
      createUserService(missing, 'correct horse battery staple').get(user.id),
    ).rejects.toBeInstanceOf(UserNotFoundError);
    const conflict = {
      ...repository(),
      async create() {
        throw Object.assign(new Error(), { code: '23505' });
      },
    };
    await expect(
      createUserService(conflict, 'correct horse battery staple').create(
        { email: user.email, roleId: user.role.id },
        audit,
      ),
    ).rejects.toBeInstanceOf(UserConflictError);
  });
});
