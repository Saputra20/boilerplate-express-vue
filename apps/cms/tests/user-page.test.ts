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

  it('renders backend user fields without exposing credential data', async () => {
    const wrapper = mount(UserView, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.text()).toContain('member@example.com');
    expect(wrapper.text()).toContain('Editor');
    expect(wrapper.text()).toContain('Active');
    expect(wrapper.text()).not.toContain('passwordHash');
    expect(wrapper.text()).not.toContain('token');

    const detailButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes(user.email));
    await detailButton?.trigger('click');
    await flushPromises();
    expect(api.getUser).toHaveBeenCalledWith(user.id);
    expect(document.body.textContent).toContain('Password change is required at first login.');
    expect(document.body.textContent).not.toContain('passwordHash');
    wrapper.unmount();
  });

  it('surfaces list failures in the page error state', async () => {
    api.listUsers.mockRejectedValue(new Error('offline'));
    const wrapper = mount(UserView);
    await flushPromises();

    expect(wrapper.text()).toContain('Unable to load users.');
    expect(wrapper.text()).toContain('Try again');
  });

  it('keeps status changes as a draft until Apply and applies Reset on Apply', async () => {
    const wrapper = mount(UserView, { attachTo: document.body });
    await flushPromises();

    const trigger = wrapper.get('[data-filter-trigger]');
    await trigger.trigger('click');
    await wrapper.findAll('select')[1]?.setValue('disabled');
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
