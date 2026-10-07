import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { flushPromises, mount } from '@vue/test-utils';
import { vi } from 'vitest';

const { api } = vi.hoisted(() => ({
  api: {
    listUsers: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    listRoles: vi.fn(),
  },
}));

vi.mock('../src/stores/auth', () => ({
  cmsApiClient: api,
  useAuthStore: () => ({ can: () => true }),
}));

import UserView from '../src/views/UserView.vue';
import UserDetailView from '../src/views/UserDetailView.vue';

async function mountUserView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/users', name: 'users', component: UserView },
      {
        path: '/users/:id',
        name: 'user-detail',
        component: UserDetailView,
        props: (route) => ({ userId: String(route.params.id) }),
      },
      { path: '/users/:id/edit', name: 'user-edit', component: { template: '<div />' } },
    ],
  });
  await router.push('/users');
  await router.isReady();
  return mount(RouterView, { global: { plugins: [router] } });
}

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

describe('user management page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listUsers.mockResolvedValue({
      items: [user],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    api.getUser.mockResolvedValue(user);
  });

  it('uses page-level pagination contract for initial load, footer, and page-size changes', async () => {
    api.listUsers.mockResolvedValue({
      items: [user],
      pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
    });
    const wrapper = await mountUserView();
    await flushPromises();

    expect(api.listUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10 }));
    const search = wrapper.get('input[aria-label="Search users by email"]');
    expect(search.attributes('placeholder')).toBe('Search users by email');
    const rows = wrapper.get('select[aria-label="Rows per page"]');
    expect(rows.findAll('option').map((option) => option.text())).toEqual([
      '10',
      '20',
      '50',
      '100',
    ]);
    const footer = wrapper.get('footer');
    expect(footer.text()).toContain('Showing 1 to 10 of 25 users');
    expect(footer.element.children[0]?.tagName).toBe('P');
    expect(footer.element.children[1]?.querySelector('label')?.textContent).toContain(
      'Rows per page',
    );
    expect(footer.element.children[1]?.querySelector('nav')).not.toBeNull();

    await wrapper.get('button[aria-label="Go to page 3"]').trigger('click');
    await flushPromises();
    await rows.setValue('20');
    await flushPromises();
    expect(api.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
    wrapper.unmount();
  });

  it('renders backend user fields without exposing credential data', async () => {
    const wrapper = await mountUserView();
    await flushPromises();

    expect(wrapper.text()).toContain('member@example.com');
    expect(wrapper.text()).toContain('Editor');
    expect(wrapper.text()).toContain('Active');
    expect(wrapper.text()).not.toContain('passwordHash');
    expect(wrapper.text()).not.toContain('token');

    await wrapper.get('[aria-label="View details for user member@example.com"]').trigger('click');
    await flushPromises();
    expect(api.getUser).toHaveBeenCalledWith(user.id);
    const backLink = wrapper.get('a[href="/users"]');
    const breadcrumb = wrapper.get('nav[aria-label="Breadcrumb"]');
    expect(breadcrumb.text()).toContain('Home');
    expect(breadcrumb.text()).toContain('User details');
    expect(backLink.element.parentElement).toBe(breadcrumb.element.parentElement);
    expect(breadcrumb.element.parentElement?.className).toContain('justify-between');
    expect(wrapper.text()).not.toContain('First-login password change');
    expect(wrapper.text()).not.toContain('Account identifiers');
    expect(wrapper.text()).not.toContain('Security');
    expect(wrapper.text()).not.toContain('Permissions');
    expect(wrapper.text()).not.toContain(user.id);
    expect(wrapper.text()).toContain('Not verified');
    expect(wrapper.text()).toContain('Never logged in');
    expect(wrapper.text()).toContain('Edit user');
    expect(wrapper.text()).not.toContain('Reset password');
    expect(wrapper.text()).not.toContain('Two-factor');
    expect(wrapper.text()).not.toContain('passwordHash');
    wrapper.unmount();
  });

  it('surfaces list failures in the page error state', async () => {
    api.listUsers.mockRejectedValue(new Error('offline'));
    const wrapper = await mountUserView();
    await flushPromises();

    expect(wrapper.text()).toContain('Unable to load users.');
    expect(wrapper.text()).toContain('Try again');
  });

  it('keeps status changes as a draft until Apply and applies Reset on Apply', async () => {
    const wrapper = await mountUserView();
    await flushPromises();

    const trigger = wrapper.get('[data-filter-trigger]');
    await trigger.trigger('click');
    await wrapper.get('[role="region"] select').setValue('disabled');
    expect(api.listUsers).toHaveBeenCalledTimes(1);

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Apply')
      ?.trigger('click');
    await flushPromises();
    expect(api.listUsers).toHaveBeenCalledTimes(2);
    expect(api.listUsers.mock.calls[1]?.[0]).toMatchObject({ status: 'disabled', page: 1 });
    expect(trigger.text()).toContain('1');

    await trigger.trigger('click');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Reset')
      ?.trigger('click');
    expect(api.listUsers).toHaveBeenCalledTimes(2);
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Apply')
      ?.trigger('click');
    await flushPromises();
    expect(api.listUsers).toHaveBeenCalledTimes(3);
    expect(api.listUsers.mock.calls[2]?.[0]).toMatchObject({ status: undefined });
    expect(trigger.text()).not.toContain('1');
    wrapper.unmount();
  });
});
