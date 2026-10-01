import { createMemoryHistory, createRouter } from 'vue-router';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import CmsProfileMenu from '../src/components/CmsProfileMenu.vue';

const authMock = vi.hoisted(() => ({
  identity: { email: 'member@example.com', roles: ['editor'] },
  logout: vi.fn(),
}));

vi.mock('../src/stores/auth', () => ({ useAuthStore: () => authMock }));

function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<main>Home</main>' } },
      {
        path: '/settings/change-password',
        component: { template: '<main>Password settings</main>' },
      },
      { path: '/login', component: { template: '<main>Login</main>' } },
    ],
  });
  const wrapper = mount(CmsProfileMenu, { attachTo: document.body, global: { plugins: [router] } });
  return { router, wrapper };
}

describe('CMS profile menu', () => {
  it('links to self-service password settings and closes after navigation', async () => {
    const { router, wrapper } = setup();
    await wrapper.get('[aria-label="Open profile menu"]').trigger('click');
    await wrapper.get('a[role="menuitem"]').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/settings/change-password');
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('supports arrow-key movement between menu items', async () => {
    const { wrapper } = setup();
    const trigger = wrapper.get('[aria-label="Open profile menu"]');
    await trigger.trigger('keydown', { key: 'ArrowDown' });
    await flushPromises();
    const passwordLink = wrapper.get('a[role="menuitem"]').element;

    expect(document.activeElement).toBe(passwordLink);

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(wrapper.get('button[role="menuitem"]').element);

    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement).toBe(passwordLink);
    wrapper.unmount();
  });
});
