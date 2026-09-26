import { createMemoryHistory, createRouter } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, vi } from 'vitest';
import App from '../src/App.vue';
import { routes } from '../src/router';
import { cmsApiClient, useAuthStore } from '../src/stores/auth';

const dashboardSummary = {
  users: { total: 1, active: 1, disabled: 0 },
  roles: { total: 1 },
  categories: { total: 0, active: 0 },
};
const mountedWrappers: VueWrapper[] = [];

afterEach(() => {
  mountedWrappers.forEach((wrapper) => wrapper.unmount());
  mountedWrappers.length = 0;
  document.body.innerHTML = '';
});

async function mountApp(path: string) {
  vi.spyOn(cmsApiClient, 'getDashboardSummary').mockResolvedValue(dashboardSummary);
  const router = createRouter({ history: createMemoryHistory(), routes });
  router.push(path);
  await router.isReady();
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthStore();
  auth.status = 'authenticated';
  auth.identity = {
    userId: '00000000-0000-4000-8000-000000000001',
    email: 'admin@example.com',
    roles: ['admin'],
    effectivePermissions: ['dashboard.read'],
  };

  const wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [router, pinia] },
  });
  mountedWrappers.push(wrapper);
  return { router, wrapper };
}

describe('CMS shell', () => {
  it('renders the neutral home shell and configured navigation', async () => {
    const { wrapper } = await mountApp('/');

    expect(wrapper.get('nav').text()).toContain('Home');
    expect(wrapper.get('#navigation-toggle-desktop').attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('header').text()).toContain('CMS');
    expect(wrapper.get('main h1').text()).toBe('Overview');
    expect(wrapper.get('nav a').attributes('href')).toBe('/');
  });

  it('renders public login and not-found routes', async () => {
    const login = await mountApp('/login');
    expect(login.wrapper.get('h1').text()).toBe('Sign in');

    const notFound = await mountApp('/missing');
    expect(notFound.wrapper.get('h1').text()).toBe('404');
    expect(notFound.wrapper.get('a').attributes('href')).toBe('/');

    const denied = await mountApp('/forbidden');
    expect(denied.wrapper.get('h1').text()).toBe('Access denied');
    expect(denied.wrapper.get('a').attributes('href')).toBe('/');
  });

  it('opens the mobile navigation drawer and closes it with the overlay', async () => {
    const { wrapper } = await mountApp('/');
    const trigger = wrapper.get('#navigation-toggle-mobile');

    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('#primary-navigation[role="dialog"]').exists()).toBe(false);
    expect(wrapper.get('#primary-navigation nav').text()).toContain('Home');

    await trigger.trigger('click');
    await nextTick();
    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('#primary-navigation').attributes('aria-modal')).toBe('true');
    expect(wrapper.get('#application-content').attributes('inert')).toBeDefined();

    await wrapper.get('[aria-label="Dismiss navigation overlay"]').trigger('click');
    await nextTick();
    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('#primary-navigation[role="dialog"]').exists()).toBe(false);
    expect(wrapper.get('#application-content').attributes('inert')).toBeUndefined();
  });

  it('closes the mobile navigation drawer with Escape', async () => {
    const { wrapper } = await mountApp('/');
    await wrapper.get('#navigation-toggle-mobile').trigger('click');
    await nextTick();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    expect(wrapper.get('#navigation-toggle-mobile').attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('#primary-navigation[role="dialog"]').exists()).toBe(false);
  });

  it('toggles the theme and closes the profile menu with Escape', async () => {
    const { wrapper } = await mountApp('/');
    const themeButton = wrapper.get('button[aria-label="Use dark theme"]');
    await themeButton.trigger('click');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(wrapper.get('button[aria-label="Use light theme"]')).toBeTruthy();

    const profileButton = wrapper.get('button[aria-label="Open profile menu"]');
    await profileButton.trigger('keydown', { key: 'ArrowDown' });
    await nextTick();
    expect(profileButton.attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('[aria-label="Account actions"]').text()).toContain('Sign out');
    expect(document.activeElement?.getAttribute('role')).toBe('menuitem');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();
    expect(profileButton.attributes('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(profileButton.element);
  });
});
