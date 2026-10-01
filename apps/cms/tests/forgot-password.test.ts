import { createMemoryHistory, createRouter as makeRouter } from 'vue-router';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/client';
import ForgotPasswordView from '../src/views/ForgotPasswordView.vue';

const apiMock = vi.hoisted(() => ({ requestPasswordReset: vi.fn() }));

vi.mock('../src/stores/auth', () => ({
  cmsApiClient: apiMock,
  useAuthStore: vi.fn(),
}));

function createRouter() {
  return makeRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordView },
      { path: '/login', name: 'login', component: { template: '<main>Sign in</main>' } },
    ],
  });
}

async function mountForgotPassword(attachTo?: Element) {
  const router = createRouter();
  await router.push('/forgot-password');
  await router.isReady();
  const wrapper = mount(ForgotPasswordView, { attachTo, global: { plugins: [router] } });
  return { router, wrapper };
}

describe('ForgotPasswordView', () => {
  beforeEach(() => {
    apiMock.requestPasswordReset.mockReset();
    window.sessionStorage.clear();
  });

  it('renders in the shared TailAdmin auth layout and links back to login', async () => {
    const { wrapper } = await mountForgotPassword();

    expect(wrapper.get('main').classes()).toContain('lg:flex');
    expect(wrapper.find('[aria-label="CMS branding"]').exists()).toBe(true);
    expect(wrapper.get('#forgot-password-title').text()).toBe('Forgot password');
    expect(wrapper.get('label').text()).toContain('Email');
    expect(wrapper.get('a[href="/login"]').text()).toBe('Back to sign in');
  });

  it('shows local email validation and focuses the invalid field', async () => {
    const { wrapper } = await mountForgotPassword(document.body);

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(apiMock.requestPasswordReset).not.toHaveBeenCalled();
    expect(wrapper.get('#forgot-password-email-error').text()).toContain('valid email');
    expect(wrapper.get('#forgot-password-email').attributes('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(wrapper.get('#forgot-password-email').element);
    wrapper.unmount();
  });

  it('submits the entered email and shows the generic privacy-preserving confirmation', async () => {
    apiMock.requestPasswordReset.mockResolvedValue(undefined);
    const { wrapper } = await mountForgotPassword();

    await wrapper.get('#forgot-password-email').setValue('User@example.com');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(apiMock.requestPasswordReset).toHaveBeenCalledWith({ email: 'User@example.com' });
    expect(wrapper.get('[role="status"]').text()).toContain(
      'If the account is eligible for a password reset, a reset email will be sent.',
    );
    expect(wrapper.text()).not.toContain('User@example.com');
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true);
  });

  it('disables repeated submission while the request is pending', async () => {
    let resolveRequest: (() => void) | undefined;
    apiMock.requestPasswordReset.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { wrapper } = await mountForgotPassword();
    await wrapper.get('#forgot-password-email').setValue('user@example.com');

    const submission = wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('#forgot-password-submit').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(apiMock.requestPasswordReset).toHaveBeenCalledTimes(1);

    resolveRequest?.();
    await submission;
    await flushPromises();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it('maps an IP rate limit to safe retry guidance', async () => {
    apiMock.requestPasswordReset.mockRejectedValue(new ApiError('Too many requests', 'http', 429));
    const { wrapper } = await mountForgotPassword();
    await wrapper.get('#forgot-password-email').setValue('user@example.com');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain('Too many requests');
    expect(wrapper.get('[role="alert"]').text()).toContain('Try again later');
  });

  it.each([
    new ApiError('private backend detail', 'http', 500),
    new ApiError('private network detail', 'network'),
    new ApiError('private timeout detail', 'timeout'),
    new ApiError('private response detail', 'invalid-response'),
  ])('shows a safe generic error for %s failures', async (error) => {
    apiMock.requestPasswordReset.mockRejectedValue(error);
    const { wrapper } = await mountForgotPassword();
    await wrapper.get('#forgot-password-email').setValue('user@example.com');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).not.toContain('private');
    expect(wrapper.get('[role="alert"]').text()).toContain('try again');
  });

  it('does not write authentication data to browser storage', async () => {
    apiMock.requestPasswordReset.mockResolvedValue(undefined);
    const { wrapper } = await mountForgotPassword();
    await wrapper.get('#forgot-password-email').setValue('user@example.com');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(window.sessionStorage.getItem('cms.refreshToken')).toBeNull();
    expect(window.localStorage.getItem('cms.accessToken')).toBeNull();
  });
});
