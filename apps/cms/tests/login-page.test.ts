import { createRouter, createMemoryHistory } from 'vue-router';
import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/client';
import LoginView from '../src/views/LoginView.vue';

const authMock = vi.hoisted(() => ({
  login: vi.fn(),
  restore: vi.fn(),
  isAuthenticated: vi.fn(),
}));

vi.mock('../src/stores/auth', () => ({ useAuthStore: () => authMock }));

function createLoginRouter(returnTo?: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/:pathMatch(.*)*', component: { template: '<div>target</div>' } },
    ],
  });
  const query = returnTo === undefined ? '' : `?returnTo=${encodeURIComponent(returnTo)}`;
  return { router, path: `/login${query}` };
}

async function mountLogin(returnTo?: string) {
  const { router, path } = createLoginRouter(returnTo);
  await router.push(path);
  await router.isReady();
  const wrapper = mount(LoginView, { global: { plugins: [router] } });
  await flushPromises();
  return { router, wrapper };
}

describe('LoginView', () => {
  beforeEach(() => {
    authMock.login.mockReset();
    authMock.restore.mockReset().mockResolvedValue(false);
    authMock.isAuthenticated.mockReset().mockReturnValue(false);
  });

  it('uses the split authentication layout without unsupported login options', async () => {
    const { wrapper } = await mountLogin();

    expect(wrapper.get('main').classes()).toContain('lg:flex');
    expect(wrapper.get('[aria-label="CMS branding"]').classes()).toContain('lg:grid');
    expect(wrapper.get('#login-title').text()).toBe('Sign in');
    expect(wrapper.find('[aria-label="CMS sign in"]').exists()).toBe(false);
    expect(wrapper.find('a[href="/signup"]').exists()).toBe(false);
    expect(wrapper.find('a[href="/reset-password"]').exists()).toBe(false);
  });

  it('validates email and password before submission', async () => {
    const { wrapper } = await mountLogin();

    await wrapper.get('form').trigger('submit');

    expect(authMock.login).not.toHaveBeenCalled();
    expect(wrapper.get('#login-email-error').text()).toContain('valid email');
    expect(wrapper.get('#login-password-error').text()).toContain('password');
    expect(wrapper.get('#login-email').attributes('aria-invalid')).toBe('true');
  });

  it('submits exact credentials and navigates to a safe internal return target', async () => {
    authMock.login.mockResolvedValue(true);
    const { router, wrapper } = await mountLogin('/reports?tab=recent');

    await wrapper.get('#login-email').setValue('user@example.com');
    await wrapper.get('#login-password').setValue('not-trimmed ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(authMock.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'not-trimmed ',
    });
    expect(router.currentRoute.value.fullPath).toBe('/reports?tab=recent');
  });

  it('falls back to root for unsafe return targets', async () => {
    authMock.login.mockResolvedValue(true);
    const { router, wrapper } = await mountLogin('https://evil.example/steal');

    await wrapper.get('#login-email').setValue('user@example.com');
    await wrapper.get('#login-password').setValue('secret');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/');
  });

  it('shows safe authentication failure and prevents duplicate submit', async () => {
    authMock.login.mockRejectedValue(new ApiError('Unauthorized', 'http', 401));
    const { wrapper } = await mountLogin();

    await wrapper.get('#login-email').setValue('user@example.com');
    await wrapper.get('#login-password').setValue('secret');
    const submit = wrapper.get('form').trigger('submit');
    await wrapper.get('form').trigger('submit');
    await submit;
    await flushPromises();

    expect(authMock.login).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[role="alert"]').text()).toContain('those credentials');
  });

  it('redirects already authenticated users to root', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    const { router } = await mountLogin();

    expect(router.currentRoute.value.fullPath).toBe('/');
    expect(authMock.restore).not.toHaveBeenCalled();
  });
});
