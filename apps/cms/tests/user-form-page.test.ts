import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/client';
import { installAuthGuard, routes } from '../src/router';

const { api, auth } = vi.hoisted(() => ({
  api: {
    listUsers: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    listRoles: vi.fn(),
  },
  auth: { can: vi.fn((permission: string) => Boolean(permission)) },
}));

vi.mock('../src/stores/auth', () => ({
  cmsApiClient: api,
  useAuthStore: () => auth,
}));

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'member@example.com',
  status: 'active' as const,
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt: new Date('2026-09-26T00:00:00.000Z'),
  updatedAt: new Date('2026-09-26T00:00:00.000Z'),
  deletedAt: null,
  role: { id: '00000000-0000-4000-8000-000000000002', code: 'editor', name: 'Editor' },
  mustChangePassword: true,
};

const roles = [
  {
    id: user.role.id,
    code: user.role.code,
    name: user.role.name,
    description: 'Content editor',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    permissionCodes: ['category.read'],
  },
];

const wrappers: VueWrapper[] = [];

afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount());
  wrappers.length = 0;
  document.body.innerHTML = '';
});

async function mountUserPage(
  path: string,
  permissions = ['user.read', 'user.create', 'user.update', 'user.delete'],
) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  installAuthGuard(router, {
    restore: async () => true,
    isAuthenticated: () => true,
    can: (permission) => permissions.includes(permission),
  });
  auth.can.mockImplementation((permission: string) => permissions.includes(permission));
  await router.push(path);
  await router.isReady();
  const wrapper = mount(RouterView, { attachTo: document.body, global: { plugins: [router] } });
  wrappers.push(wrapper);
  return { router, wrapper };
}

describe('User dedicated pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listUsers.mockResolvedValue({
      items: [user],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    api.getUser.mockResolvedValue(user);
    api.listRoles.mockResolvedValue({
      items: roles,
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    });
    api.createUser.mockResolvedValue(user);
    api.updateUser.mockResolvedValue(user);
    api.deleteUser.mockResolvedValue(undefined);
    auth.can.mockReturnValue(true);
  });

  it('navigates to dedicated forms and keeps details and delete on the list', async () => {
    const { router, wrapper } = await mountUserPage('/users');
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add user')
      ?.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/users/create');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel')
      ?.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/users');
    await flushPromises();

    await wrapper.get('[aria-label="Edit user member@example.com"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe(`/users/${user.id}/edit`);
    await router.push('/users');
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === user.email)
      ?.trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('User details');
    await wrapper.get('[aria-label="Delete user member@example.com"]').trigger('click');
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('creates with only email and one role, then returns to the list', async () => {
    const { router, wrapper } = await mountUserPage('/users/create');
    await flushPromises();

    expect(wrapper.text()).toContain('A default password will be assigned.');
    expect(wrapper.text()).toContain('The user must change it at first login.');
    expect(wrapper.find('input[type="password"]').exists()).toBe(false);
    expect(wrapper.find('select[name="status"]').exists()).toBe(false);
    expect(wrapper.get('.user-form > div').classes()).toContain('w-full');
    await wrapper.get('input[name="email"]').setValue('new@example.com');
    await wrapper.get('select[name="roleId"]').setValue(user.role.id);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.createUser).toHaveBeenCalledWith({ email: 'new@example.com', roleId: user.role.id });
    expect(router.currentRoute.value.path).toBe('/users');
  });

  it('retains Create values and route after API failure', async () => {
    api.createUser.mockRejectedValue(new ApiError('Conflict', 'http', 409));
    const { router, wrapper } = await mountUserPage('/users/create');
    await flushPromises();
    await wrapper.get('input[name="email"]').setValue('duplicate@example.com');
    await wrapper.get('select[name="roleId"]').setValue(user.role.id);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/users/create');
    expect((wrapper.get('input[name="email"]').element as HTMLInputElement).value).toBe(
      'duplicate@example.com',
    );
    expect(wrapper.get('[role="alert"]').text()).toContain('Conflict');
  });

  it('loads Edit before rendering and updates via the existing fields', async () => {
    const { router, wrapper } = await mountUserPage(`/users/${user.id}/edit`);
    expect(wrapper.find('form').exists()).toBe(false);
    await flushPromises();

    expect(api.getUser).toHaveBeenCalledWith(user.id);
    expect((wrapper.get('input[name="email"]').element as HTMLInputElement).value).toBe(user.email);
    expect((wrapper.get('select[name="roleId"]').element as HTMLSelectElement).value).toBe(
      user.role.id,
    );
    expect((wrapper.get('select[name="status"]').element as HTMLSelectElement).value).toBe(
      'active',
    );
    await wrapper.get('input[name="email"]').setValue('updated@example.com');
    await wrapper.get('select[name="status"]').setValue('disabled');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.updateUser).toHaveBeenCalledWith(user.id, {
      email: 'updated@example.com',
      roleId: user.role.id,
      status: 'disabled',
    });
    expect(router.currentRoute.value.path).toBe('/users');
  });

  it('retains Edit values after update failure', async () => {
    api.updateUser.mockRejectedValue(new ApiError('Conflict', 'http', 409));
    const { router, wrapper } = await mountUserPage(`/users/${user.id}/edit`);
    await flushPromises();
    await wrapper.get('input[name="email"]').setValue('duplicate@example.com');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe(`/users/${user.id}/edit`);
    expect((wrapper.get('input[name="email"]').element as HTMLInputElement).value).toBe(
      'duplicate@example.com',
    );
    expect(wrapper.get('[role="alert"]').text()).toContain('Conflict');
  });

  it('shows a safe not-found state and allows direct-route cancellation', async () => {
    api.getUser.mockRejectedValue(new ApiError('Not found', 'http', 404));
    const { router, wrapper } = await mountUserPage(`/users/${user.id}/edit`);
    await flushPromises();

    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('User not found.');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel')
      ?.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/users');
  });

  it('keeps submit unavailable and shows safe feedback when roles cannot load', async () => {
    api.listRoles.mockRejectedValue(new ApiError('Access denied', 'http', 403));
    const { wrapper } = await mountUserPage('/users/create');
    await flushPromises();

    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.get('[role="alert"]').text()).toContain('Access denied');
  });

  it('hides Add and Edit when their action permissions are missing', async () => {
    const { wrapper } = await mountUserPage('/users', ['user.read']);
    await flushPromises();

    expect(wrapper.text()).not.toContain('Add user');
    expect(wrapper.find('[aria-label="Edit user member@example.com"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Delete user member@example.com"]').exists()).toBe(false);
  });
});
