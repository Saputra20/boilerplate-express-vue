import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/client';
import { installAuthGuard, routes } from '../src/router';

const { api, auth } = vi.hoisted(() => ({
  api: {
    listRoles: vi.fn(),
    getRole: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    listPermissionCatalog: vi.fn(),
  },
  auth: { can: vi.fn((permission: string) => Boolean(permission)) },
}));

vi.mock('../src/stores/auth', () => ({
  cmsApiClient: api,
  useAuthStore: () => auth,
}));

const editor = {
  id: '00000000-0000-4000-8000-000000000001',
  code: 'editor',
  name: 'Editor',
  description: 'Content editor',
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  updatedAt: new Date('2026-09-02T00:00:00.000Z'),
  permissionCodes: ['category.read', 'user.read'],
};

const catalog = [
  {
    id: '00000000-0000-4000-8000-000000000010',
    code: 'category.read',
    description: 'Read categories',
  },
  { id: '00000000-0000-4000-8000-000000000011', code: 'category.create', description: null },
  { id: '00000000-0000-4000-8000-000000000012', code: 'role.read', description: 'Read roles' },
  { id: '00000000-0000-4000-8000-000000000013', code: 'system.access', description: null },
  { id: '00000000-0000-4000-8000-000000000014', code: 'user.read', description: null },
  { id: '00000000-0000-4000-8000-000000000015', code: 'unexpected', description: null },
];

const wrappers: VueWrapper[] = [];

afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount());
  wrappers.length = 0;
  document.body.innerHTML = '';
});

async function mountRolePage(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  installAuthGuard(router, {
    restore: async () => true,
    isAuthenticated: () => true,
    can: (permission) => ['role.read', 'role.create', 'role.update'].includes(permission),
    isPasswordChangeRequired: () => false,
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(RouterView, { attachTo: document.body, global: { plugins: [router] } });
  wrappers.push(wrapper);
  return { router, wrapper };
}

describe('Role dedicated pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listRoles.mockResolvedValue({
      items: [editor],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    api.getRole.mockResolvedValue(editor);
    api.listPermissionCatalog.mockResolvedValue(catalog);
    api.createRole.mockResolvedValue(editor);
    api.updateRole.mockResolvedValue(editor);
    api.deleteRole.mockResolvedValue(undefined);
    auth.can.mockReturnValue(true);
  });

  it('uses page-level pagination contract for initial load, footer, and page-size changes', async () => {
    api.listRoles.mockResolvedValue({
      items: [editor],
      pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
    });
    const { wrapper } = await mountRolePage('/roles');
    await flushPromises();

    expect(api.listRoles).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10 }));
    const search = wrapper.get('input[aria-label="Search roles"]');
    expect(search.attributes('placeholder')).toBe('Search roles');
    const rows = wrapper.get('select[aria-label="Rows per page"]');
    expect(rows.findAll('option').map((option) => option.text())).toEqual([
      '10',
      '20',
      '50',
      '100',
    ]);
    const footer = wrapper.get('footer');
    expect(footer.text()).toContain('Showing 1 to 10 of 25 roles');
    expect(footer.element.children[0]?.tagName).toBe('P');
    expect(footer.element.children[1]?.querySelector('label')?.textContent).toContain(
      'Rows per page',
    );
    expect(footer.element.children[1]?.querySelector('nav')).not.toBeNull();

    await wrapper.get('button[aria-label="Go to page 3"]').trigger('click');
    await flushPromises();
    await rows.setValue('20');
    await flushPromises();
    expect(api.listRoles).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
  });

  it('navigates from the list to create/edit and keeps delete confirmation in a modal', async () => {
    const { router, wrapper } = await mountRolePage('/roles');
    await flushPromises();

    const addRole = wrapper.findAll('button').find((button) => button.text() === 'Add role');
    expect(addRole?.exists()).toBe(true);
    await addRole?.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/roles/create');

    await router.push('/roles');
    await flushPromises();
    await wrapper.get('[aria-label="Edit role Editor"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe(`/roles/${editor.id}/edit`);

    await router.push('/roles');
    await flushPromises();
    await wrapper.get('[aria-label="Delete role Editor"]').trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('Delete role');
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('creates a role with catalog codes and returns to the list on success', async () => {
    const { router, wrapper } = await mountRolePage('/roles/create');
    await flushPromises();

    const formContainer = wrapper.get('.role-form > div');
    expect(formContainer.classes()).toContain('w-full');
    expect(formContainer.classes()).not.toContain('max-w-4xl');
    expect(wrapper.text()).toContain('Role information');
    expect(wrapper.text()).toContain('Start with a lowercase letter');
    expect(wrapper.text()).toContain('Permissions');
    expect(wrapper.text()).toContain('Other');
    const codeInput = wrapper.get('input[name="code"]');
    expect(codeInput.attributes('pattern')).toBe('[a-z][a-z0-9_]*');
    expect(codeInput.attributes('maxlength')).toBe('64');
    expect(codeInput.attributes('required')).toBeDefined();
    expect(codeInput.attributes('aria-describedby')).toBe('role-code-help');
    await codeInput.setValue('TEST');
    expect((codeInput.element as HTMLInputElement).checkValidity()).toBe(false);
    await codeInput.setValue('writer');
    expect((codeInput.element as HTMLInputElement).checkValidity()).toBe(true);
    await wrapper.get('input[name="name"]').setValue('Writer');
    await wrapper.get('input[name="description"]').setValue('Writes content');
    await wrapper.get('[aria-label="Select all Category permissions"]').trigger('click');
    await wrapper.get('[aria-label="Select all System permissions"]').trigger('click');
    expect(wrapper.get('input[value="category.read"]').element).toBeTruthy();

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.createRole).toHaveBeenCalledWith({
      code: 'writer',
      name: 'Writer',
      description: 'Writes content',
      permissionCodes: ['category.read', 'category.create', 'system.access'],
    });
    expect(router.currentRoute.value.path).toBe('/roles');
  });

  it('keeps create values and route after submission failure', async () => {
    api.createRole.mockRejectedValue(new ApiError('Unable to create role.', 'http', 400));
    const { router, wrapper } = await mountRolePage('/roles/create');
    await flushPromises();
    await wrapper.get('input[name="code"]').setValue('writer');
    await wrapper.get('input[name="name"]').setValue('Writer');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/roles/create');
    expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Writer');
    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to create role.');
  });

  it('loads Edit data before rendering the form and updates existing values', async () => {
    const { router, wrapper } = await mountRolePage(`/roles/${editor.id}/edit`);
    expect(wrapper.find('form').exists()).toBe(false);
    await flushPromises();

    expect(api.getRole).toHaveBeenCalledWith(editor.id);
    expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe('Editor');
    expect(wrapper.text()).toContain('editor');
    expect(wrapper.text()).toContain('Role code cannot be changed.');
    expect((wrapper.get('input[value="category.read"]').element as HTMLInputElement).checked).toBe(
      true,
    );
    expect((wrapper.get('input[value="user.read"]').element as HTMLInputElement).checked).toBe(
      true,
    );

    await wrapper.get('input[name="name"]').setValue('Managing Editor');
    await wrapper.get('[aria-label="Select all Category permissions"]').trigger('click');
    expect((wrapper.get('input[value="user.read"]').element as HTMLInputElement).checked).toBe(
      true,
    );
    await wrapper.get('[aria-label="Clear Category permissions"]').trigger('click');
    expect((wrapper.get('input[value="user.read"]').element as HTMLInputElement).checked).toBe(
      true,
    );
    await wrapper.get('input[value="category.read"]').setValue(true);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(api.updateRole).toHaveBeenCalledWith(editor.id, {
      name: 'Managing Editor',
      description: 'Content editor',
      permissionCodes: ['user.read', 'category.read'],
    });
    expect(router.currentRoute.value.path).toBe('/roles');
  });

  it('keeps Edit values and route after update failure', async () => {
    api.updateRole.mockRejectedValue(new ApiError('Unable to update role.', 'http', 400));
    const { router, wrapper } = await mountRolePage(`/roles/${editor.id}/edit`);
    await flushPromises();
    await wrapper.get('input[name="name"]').setValue('Managing Editor');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe(`/roles/${editor.id}/edit`);
    expect((wrapper.get('input[name="name"]').element as HTMLInputElement).value).toBe(
      'Managing Editor',
    );
    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to update role.');
  });

  it('shows Edit load failures without a blank form and provides a list cancel path', async () => {
    api.getRole.mockRejectedValue(new ApiError('not found', 'http', 404));
    const { router, wrapper } = await mountRolePage(`/roles/${editor.id}/edit`);
    await flushPromises();

    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('Role not found.');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel')
      ?.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/roles');
  });

  it('shows the existing API denial when Edit lacks role.read for detail', async () => {
    api.getRole.mockRejectedValue(new ApiError('Access denied', 'http', 403));
    const { wrapper } = await mountRolePage(`/roles/${editor.id}/edit`);
    await flushPromises();

    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.get('[role="alert"]').text()).toContain('Access denied');
  });

  it('cancels Create to the list even when opened directly', async () => {
    const { router, wrapper } = await mountRolePage('/roles/create');
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel')
      ?.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/roles');
  });

  it('hides Add and Edit controls without their corresponding permissions', async () => {
    auth.can.mockImplementation((permission: string) => permission === 'role.read');
    const { wrapper } = await mountRolePage('/roles');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Add role');
    expect(wrapper.find('[aria-label="Edit role Editor"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Delete role Editor"]').exists()).toBe(false);
  });
});
