import { createMemoryHistory, createRouter as makeRouter } from 'vue-router';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/client';
import ResetPasswordView from '../src/views/ResetPasswordView.vue';

const apiMock = vi.hoisted(() => ({ confirmPasswordReset: vi.fn() }));
const authStoreMock = vi.hoisted(() => vi.fn());

vi.mock('../src/stores/auth', () => ({
  cmsApiClient: apiMock,
  useAuthStore: authStoreMock,
}));

function createRouter() {
  return makeRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/reset-password', name: 'reset-password', component: ResetPasswordView },
      {
        path: '/forgot-password',
        name: 'forgot-password',
        component: { template: '<main>Request a reset link</main>' },
      },
      { path: '/login', name: 'login', component: { template: '<main>Sign in</main>' } },
    ],
  });
}

async function mountResetPassword(url?: string, attachTo?: Element) {
  const router = createRouter();
  await router.push(url ?? '/reset-password?token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  await router.isReady();
  const wrapper = mount(
    { template: '<RouterView />' },
    { attachTo, global: { plugins: [router] } },
  );
  await flushPromises();
  return { router, wrapper };
}

function storageContents(storage: Storage): string {
  return Array.from({ length: storage.length }, (_, index) => {
    const key = storage.key(index);
    return key ? `${key}=${storage.getItem(key)}` : '';
  }).join('\n');
}

describe('ResetPasswordView', () => {
  beforeEach(() => {
    apiMock.confirmPasswordReset.mockReset();
    authStoreMock.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('scrubs the query token through router replacement without making a request', async () => {
    const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const { router, wrapper } = await mountResetPassword(`/reset-password?token=${token}`);

    expect(router.currentRoute.value.path).toBe('/reset-password');
    expect(router.currentRoute.value.query).toEqual({});
    expect(wrapper.get('h1').text()).toBe('Set a new password');
    expect(wrapper.get('#reset-password').attributes('autocomplete')).toBe('new-password');
    expect(apiMock.confirmPasswordReset).not.toHaveBeenCalled();
    expect(storageContents(window.localStorage)).not.toContain(token);
    expect(storageContents(window.sessionStorage)).not.toContain(token);
  });

  it('removes only the token query and retains other route state', async () => {
    const { router } = await mountResetPassword(
      '/reset-password?token=synthetic&source=email#form',
    );

    expect(router.currentRoute.value.query).toEqual({ source: 'email' });
    expect(router.currentRoute.value.hash).toBe('#form');
  });

  it('shows a missing-link state and a request-new-link action', async () => {
    const { wrapper } = await mountResetPassword('/reset-password');

    expect(wrapper.get('h1').text()).toBe('Reset link unavailable');
    expect(wrapper.get('a[href="/forgot-password"]').text()).toBe('Request a new reset link');
    expect(apiMock.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('focuses the first invalid password field after form submission', async () => {
    const { wrapper } = await mountResetPassword(undefined, document.body);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(document.activeElement).toBe(wrapper.get('#reset-password').element);
    expect(wrapper.get('#reset-password').attributes('aria-describedby')).toBe(
      'reset-password-error',
    );
    wrapper.unmount();
  });

  it.each([
    ['11 code points', 'a'.repeat(11)],
    ['129 code points', 'a'.repeat(129)],
  ])('blocks a password with %s', async (_label, password) => {
    const { wrapper } = await mountResetPassword();
    await wrapper.get('#reset-password').setValue(password);
    await wrapper.get('#reset-password-confirmation').setValue(password);
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('#reset-password-error').text()).toContain('12 to 128');
    expect(apiMock.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it.each([
    ['12 code points', '😀'.repeat(12)],
    ['128 code points', '😀'.repeat(128)],
  ])('accepts %s and preserves the exact password', async (_label, password) => {
    const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    apiMock.confirmPasswordReset.mockResolvedValue(undefined);
    const { wrapper } = await mountResetPassword(`/reset-password?token=${token}`);
    await wrapper.get('#reset-password').setValue(password);
    await wrapper.get('#reset-password-confirmation').setValue(password);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(apiMock.confirmPasswordReset).toHaveBeenCalledWith({ token, password });
    expect(wrapper.get('h1').text()).toBe('Password reset complete');
    expect(wrapper.get('[role="status"]').text()).toContain('active sessions have been revoked');
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true);
    expect(authStoreMock).not.toHaveBeenCalled();
    expect(storageContents(window.localStorage)).not.toContain(token);
    expect(storageContents(window.localStorage)).not.toContain(password);
    expect(storageContents(window.sessionStorage)).not.toContain(token);
    expect(storageContents(window.sessionStorage)).not.toContain(password);
  });

  it('counts Unicode code points and does not trim password whitespace', async () => {
    const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    apiMock.confirmPasswordReset.mockResolvedValue(undefined);
    const { wrapper } = await mountResetPassword(`/reset-password?token=${token}`);
    const password = ` ${'é'.repeat(10)} `;
    await wrapper.get('#reset-password').setValue(password);
    await wrapper.get('#reset-password-confirmation').setValue(password);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(apiMock.confirmPasswordReset).toHaveBeenCalledWith({ token, password });
  });

  it('blocks mismatched confirmation and never includes confirmation in the API request', async () => {
    const { wrapper } = await mountResetPassword(undefined, document.body);
    await wrapper.get('#reset-password').setValue('a sufficiently long password');
    await wrapper.get('#reset-password-confirmation').setValue('a different long password');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('#reset-password-confirmation-error').text()).toContain('must match');
    expect(document.activeElement).toBe(wrapper.get('#reset-password-confirmation').element);
    expect(apiMock.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it('prevents duplicate submission while the request is pending', async () => {
    let resolveRequest: (() => void) | undefined;
    apiMock.confirmPasswordReset.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { wrapper } = await mountResetPassword();
    await wrapper.get('#reset-password').setValue('a sufficiently long password');
    await wrapper.get('#reset-password-confirmation').setValue('a sufficiently long password');

    const submission = wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('#reset-password-submit').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(apiMock.confirmPasswordReset).toHaveBeenCalledTimes(1);

    resolveRequest?.();
    await submission;
    await flushPromises();
    expect(wrapper.get('h1').text()).toBe('Password reset complete');
  });

  it('maps unusable tokens to one combined state without exposing response detail', async () => {
    apiMock.confirmPasswordReset.mockRejectedValue(
      new ApiError('private token detail', 'http', 400, 'invalid_or_expired_password_reset_token'),
    );
    const { wrapper } = await mountResetPassword();
    await wrapper.get('#reset-password').setValue('a sufficiently long password');
    await wrapper.get('#reset-password-confirmation').setValue('a sufficiently long password');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('h1').text()).toBe('This reset link is no longer valid');
    expect(wrapper.text()).toContain('expired, or has already been used');
    expect(wrapper.text()).not.toContain('private token detail');
    expect(wrapper.find('a[href="/forgot-password"]').exists()).toBe(true);
  });

  it.each([
    new ApiError('private request detail', 'http', 400),
    new ApiError('private throttle detail', 'http', 429),
    new ApiError('private server detail', 'http', 500),
    new ApiError('private network detail', 'network'),
    new ApiError('private timeout detail', 'timeout'),
    new ApiError('private response detail', 'invalid-response'),
  ])('renders safe recovery guidance for %s', async (error) => {
    apiMock.confirmPasswordReset.mockRejectedValue(error);
    const { wrapper } = await mountResetPassword();
    await wrapper.get('#reset-password').setValue('a sufficiently long password');
    await wrapper.get('#reset-password-confirmation').setValue('a sufficiently long password');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).not.toContain('private');
    expect(wrapper.get('[role="alert"]').text().toLowerCase()).toContain('try again');
  });
});
