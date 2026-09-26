import {
  createRoleSchema,
  createRoleService,
  listRoleSchema,
  ProtectedRoleError,
  RoleAssignedError,
  RoleConflictError,
  RoleNotFoundError,
  updateRoleSchema,
} from '../src/modules/role/services/role.service.js';

const role = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'editor',
  name: 'Editor',
  description: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  permissionCodes: [],
};
const audit = {
  actorUserId: '22222222-2222-4222-8222-222222222222',
  sessionId: '33333333-3333-4333-8333-333333333333',
  requestId: '44444444-4444-4444-8444-444444444444',
};

function repository() {
  return {
    async create() {
      return role;
    },
    async list() {
      return { items: [role], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    },
    async findById() {
      return role;
    },
    async update() {
      return role;
    },
    async delete() {
      return 'deleted' as const;
    },
  };
}

describe('role contract', () => {
  it('validates approved fields and trims names', () => {
    expect(createRoleSchema.parse({ code: 'editor', name: ' Editor ' })).toEqual({
      code: 'editor',
      name: 'Editor',
      permissionCodes: [],
    });
    expect(updateRoleSchema.parse({ name: ' Updated ' })).toEqual({ name: 'Updated' });
    expect(listRoleSchema.parse({})).toEqual({ page: 1, limit: 20, sort: 'createdAt.desc' });
  });

  it('rejects mutable code, unknown fields, empty names, and invalid codes', () => {
    expect(() => createRoleSchema.parse({ code: 'Admin', name: 'Admin' })).toThrow();
    expect(() => createRoleSchema.parse({ code: 'editor', name: '   ' })).toThrow();
    expect(() => updateRoleSchema.parse({ code: 'other' })).toThrow();
    expect(() => updateRoleSchema.parse({ name: 'Editor', unknown: true })).toThrow();
    expect(updateRoleSchema.parse({ permissionCodes: ['category.read'] })).toEqual({
      permissionCodes: ['category.read'],
    });
    expect(() => updateRoleSchema.parse({ permissionCodes: ['invalid'] })).toThrow();
  });

  it('maps not found, conflicts, protected admin, and assigned deletion', async () => {
    const missing = {
      ...repository(),
      async findById() {
        return null;
      },
    };
    await expect(createRoleService(missing).get(role.id)).rejects.toBeInstanceOf(RoleNotFoundError);

    const conflict = {
      ...repository(),
      async create() {
        throw Object.assign(new Error('duplicate'), { code: '23505' });
      },
    };
    await expect(
      createRoleService(conflict).create(
        { code: 'editor', name: 'Editor', permissionCodes: [] },
        audit,
      ),
    ).rejects.toBeInstanceOf(RoleConflictError);

    const admin = {
      ...repository(),
      async findById() {
        return { ...role, code: 'admin' };
      },
    };
    await expect(
      createRoleService(admin).update(role.id, { name: 'Root' }, audit),
    ).rejects.toBeInstanceOf(ProtectedRoleError);

    const assigned = {
      ...repository(),
      async delete() {
        return 'assigned' as const;
      },
    };
    await expect(createRoleService(assigned).remove(role.id, audit)).rejects.toBeInstanceOf(
      RoleAssignedError,
    );
  });
});
