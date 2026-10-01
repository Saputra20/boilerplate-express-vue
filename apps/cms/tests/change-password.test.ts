import { createMemoryHistory, createRouter as makeRouter } from 'vue-router';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/client';
import ChangePasswordView from '../src/views/ChangePasswordView.vue';

const authMock = vi.hoisted(() => ({
  changePassword: vi.fn(),
  reloadIdentity: vi.fn(),
  logout: vi.fn(),
  clearSession: vi.fn(),
  identity: { mustChangePassword: Boolean(true) },
}));

vi.mock('../src/stores/auth', () => ({ useAuthStore: () => authMock }));

function createRouter() {
  return makeRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/change-password', name: 'change-password', component: ChangePasswordView },
      { path: '/', name: 'home', component: { template: '<main>Dashboard</main>' } },
      {
        path: '/categories',
        name: 'categories',
        component: { template: '<main>Categories</main>' },
      },
      { path: '/login', name: 'login', component: { template: '<main>Sign in</main>' } },
    ],
  });
}

async function mountView(path = '/change-password') {
  const router = createRouter();
  await router.push(path);
  await router.isReady();
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } });
  return { router, wrapper };
}

async function fillForm(wrapper: VueWrapper) {
  await wrapper.get('#change-current-password').setValue('current password');
  await wrapper.get('#change-new-password').setValue('a sufficiently long password');
  await wrapper.get('#change-password-confirmation').setValue('a sufficiently long password');
}

describe('ChangePasswordView', () => {
  beforeEach(() => {
    authMock.changePassword.mockReset();
    authMock.reloadIdentity.mockReset();
    authMock.logout.mockReset();
    authMock.clearSession.mockReset();
    authMock.identity.mustChangePassword = true;
  });

  it('validates the password and confirmation before calling the API', async () => {
    const { wrapper } = await mountView();
    await wrapper.get('#change-new-password').setValue('short');
    await wrapper.get('#change-password-confirmation').setValue('different');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('#change-new-password-error').text()).toContain('12 to 128');
    expect(wrapper.get('#change-password-confirmation-error').text()).toContain('must match');
    expect(authMock.changePassword).not.toHaveBeenCalled();
  });

  it('requires a current password before sending a request', async () => {
    const { wrapper } = await mountView();
    await wrapper.get('#change-new-password').setValue('a sufficiently long password');
    await wrapper.get('#change-password-confirmation').setValue('a sufficiently long password');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('#change-current-password-error').text()).toContain('current password');
    expect(authMock.changePassword).not.toHaveBeenCalled();
  });

  it.each([
    ['11 code points', '😀'.repeat(11)],
    ['129 code points', '😀'.repeat(129)],
  ])('rejects a new password with %s', async (_label, password) => {
    const { wrapper } = await mountView();
    await wrapper.get('#change-current-password').setValue('current password');
    await wrapper.get('#change-new-password').setValue(password);
    await wrapper.get('#change-password-confirmation').setValue(password);
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('#change-new-password-error').text()).toContain('12 to 128');
    expect(authMock.changePassword).not.toHaveBeenCalled();
  });

  it.each([
    ['12 code points', '😀'.repeat(12)],
    ['128 code points', '😀'.repeat(128)],
  ])('accepts a new password with %s', async (_label, password) => {
    authMock.changePassword.mockResolvedValue(undefined);
    authMock.reloadIdentity.mockImplementation(async () => {
      authMock.identity.mustChangePassword = false;
    });
    const { wrapper } = await mountView();
    await wrapper.get('#change-current-password').setValue('current password');
    await wrapper.get('#change-new-password').setValue(password);
    await wrapper.get('#change-password-confirmation').setValue(password);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(authMock.changePassword).toHaveBeenCalledWith({
      currentPassword: 'current password',
      newPassword: password,
    });
  });

  it('submits current and new values, then confirms the backend identity before continuing', async () => {
    authMock.changePassword.mockResolvedValue(undefined);
    authMock.reloadIdentity.mockImplementation(async () => {
      authMock.identity.mustChangePassword = false;
    });
    const { router, wrapper } = await mountView();
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(authMock.changePassword).toHaveBeenCalledWith({
      currentPassword: 'current password',
      newPassword: 'a sufficiently long password',
    });
    expect(authMock.reloadIdentity).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe('/');
    expect(wrapper.text()).not.toContain('current password');
  });

  it('preserves password whitespace in the authenticated request', async () => {
    authMock.changePassword.mockResolvedValue(undefined);
    authMock.reloadIdentity.mockImplementation(async () => {
      authMock.identity.mustChangePassword = false;
    });
    const { wrapper } = await mountView();
    const password = `  ${'é'.repeat(12)}  `;
    await wrapper.get('#change-current-password').setValue('current password');
    await wrapper.get('#change-new-password').setValue(password);
    await wrapper.get('#change-password-confirmation').setValue(password);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(authMock.changePassword).toHaveBeenCalledWith({
      currentPassword: 'current password',
      newPassword: password,
    });
  });

  it('returns to the saved authenticated destination after backend confirmation', async () => {
    authMock.changePassword.mockResolvedValue(undefined);
    authMock.reloadIdentity.mockImplementation(async () => {
      authMock.identity.mustChangePassword = false;
    });
    const { router, wrapper } = await mountView('/change-password?returnTo=%2Fcategories');
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/categories');
  });

  it('blocks duplicate form submissions while the request is pending', async () => {
    let resolveChange: (() => void) | undefined;
    authMock.changePassword.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveChange = resolve;
      }),
    );
    authMock.reloadIdentity.mockImplementation(async () => {
      authMock.identity.mustChangePassword = false;
    });
    const { wrapper } = await mountView();
    await fillForm(wrapper);
    const submission = wrapper.get('form').trigger('submit');
    await flushPromises();
    await wrapper.get('form').trigger('submit');

    expect(authMock.changePassword).toHaveBeenCalledOnce();
    resolveChange?.();
    await submission;
    await flushPromises();
  });

  it('does not proceed until the reloaded backend identity clears the requirement', async () => {
    authMock.changePassword.mockResolvedValue(undefined);
    authMock.reloadIdentity.mockResolvedValue(undefined);
    const { router, wrapper } = await mountView();
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/change-password');
    expect(wrapper.get('[role="alert"]').text()).toContain('status could not be confirmed');
  });

  it('rehydrates the identity when the backend reports that no change is required', async () => {
    authMock.changePassword.mockRejectedValue(
      new ApiError('private detail', 'http', 409, 'password_change_not_required'),
    );
    authMock.reloadIdentity.mockImplementation(async () => {
      authMock.identity.mustChangePassword = false;
    });
    const { router, wrapper } = await mountView();
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(authMock.reloadIdentity).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('clears an expired session and returns to login with the password flow as return target', async () => {
    authMock.changePassword.mockRejectedValue(new ApiError('Unauthorized', 'http', 401));
    const { router, wrapper } = await mountView('/change-password?returnTo=%2Fcategories');
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(authMock.clearSession).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.returnTo).toBe(
      '/change-password?returnTo=%2Fcategories',
    );
  });

  it('returns to login when the post-change identity request reports an expired session', async () => {
    authMock.changePassword.mockResolvedValue(undefined);
    authMock.reloadIdentity.mockRejectedValue(new ApiError('Unauthorized', 'http', 401));
    const { router, wrapper } = await mountView();
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(authMock.clearSession).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe('/login');
  });

  it('maps backend validation and throttling errors to safe messages', async () => {
    authMock.changePassword.mockRejectedValue(
      new ApiError('private detail', 'http', 400, 'invalid_current_password'),
    );
    const { wrapper } = await mountView();
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('#change-current-password-error').text()).toContain('incorrect');
    expect(wrapper.text()).not.toContain('private detail');
  });

  it('routes to login after existing logout clears local state, even when the request fails', async () => {
    authMock.logout.mockRejectedValue(new Error('offline'));
    const { router, wrapper } = await mountView();
    const signOut = wrapper.findAll('button').find((button) => button.text().includes('Sign out'));
    await signOut?.trigger('click');
    await flushPromises();

    expect(authMock.logout).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe('/login');
  });
});
