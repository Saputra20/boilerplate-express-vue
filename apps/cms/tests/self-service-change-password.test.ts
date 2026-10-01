import { createMemoryHistory, createRouter as makeRouter } from 'vue-router';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/client';
import SelfServiceChangePasswordView from '../src/views/SelfServiceChangePasswordView.vue';

const authMock = vi.hoisted(() => ({
  changeCurrentUserPassword: vi.fn(),
  reloadIdentity: vi.fn(),
  clearSession: vi.fn(),
  identity: { mustChangePassword: Boolean(false) },
}));

vi.mock('../src/stores/auth', () => ({ useAuthStore: () => authMock }));

function createRouter() {
  return makeRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/settings/change-password',
        name: 'self-service-change-password',
        component: SelfServiceChangePasswordView,
      },
      { path: '/change-password', name: 'change-password', component: { template: '<main />' } },
      { path: '/login', name: 'login', component: { template: '<main />' } },
    ],
  });
}

async function mountView() {
  const router = createRouter();
  await router.push('/settings/change-password');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } });
  return { router, wrapper };
}

async function fillForm(
  wrapper: VueWrapper,
  values = {
    currentPassword: 'current password',
    newPassword: 'replacement password value',
    confirmation: 'replacement password value',
  },
) {
  await wrapper.get('#self-service-current-password').setValue(values.currentPassword);
  await wrapper.get('#self-service-new-password').setValue(values.newPassword);
  await wrapper.get('#self-service-password-confirmation').setValue(values.confirmation);
}

describe('SelfServiceChangePasswordView', () => {
  beforeEach(() => {
    authMock.changeCurrentUserPassword.mockReset();
    authMock.reloadIdentity.mockReset();
    authMock.clearSession.mockReset();
    authMock.identity.mustChangePassword = false;
  });

  it('validates required fields, password length, and confirmation before submitting', async () => {
    const { wrapper } = await mountView();
    await fillForm(wrapper, {
      currentPassword: '',
      newPassword: 'short',
      confirmation: 'different',
    });
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('#self-service-current-password-error').text()).toContain(
      'current password',
    );
    expect(wrapper.get('#self-service-new-password-error').text()).toContain('12 to 128');
    expect(wrapper.get('#self-service-password-confirmation-error').text()).toContain('must match');
    expect(authMock.changeCurrentUserPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['11 code points', '😀'.repeat(11)],
    ['129 code points', '😀'.repeat(129)],
  ])('rejects a new password with %s', async (_label, password) => {
    const { wrapper } = await mountView();
    await fillForm(wrapper, {
      currentPassword: 'current password',
      newPassword: password,
      confirmation: password,
    });
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('#self-service-new-password-error').text()).toContain('12 to 128');
    expect(authMock.changeCurrentUserPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['12 code points', '😀'.repeat(12)],
    ['128 code points', '😀'.repeat(128)],
  ])(
    'accepts a password with %s and clears sensitive values after success',
    async (_label, value) => {
      authMock.changeCurrentUserPassword.mockResolvedValue(undefined);
      const { wrapper } = await mountView();
      await fillForm(wrapper, {
        currentPassword: 'current password',
        newPassword: value,
        confirmation: value,
      });
      await wrapper.get('form').trigger('submit');
      await flushPromises();

      expect(authMock.changeCurrentUserPassword).toHaveBeenCalledWith({
        currentPassword: 'current password',
        newPassword: value,
      });
      expect(wrapper.get('#self-service-current-password').element).toHaveProperty('value', '');
      expect(wrapper.get('#self-service-new-password').element).toHaveProperty('value', '');
      expect(wrapper.get('#self-service-password-confirmation').element).toHaveProperty(
        'value',
        '',
      );
      expect(wrapper.get('[role="status"]').text()).toContain('changed');
      expect(authMock.reloadIdentity).not.toHaveBeenCalled();
    },
  );

  it('preserves spaces in the submitted password and keeps confirmation frontend-only', async () => {
    authMock.changeCurrentUserPassword.mockResolvedValue(undefined);
    const { wrapper } = await mountView();
    const password = `  ${'é'.repeat(12)}  `;
    await fillForm(wrapper, {
      currentPassword: ' current password ',
      newPassword: password,
      confirmation: password,
    });
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(authMock.changeCurrentUserPassword).toHaveBeenCalledWith({
      currentPassword: ' current password ',
      newPassword: password,
    });
    expect(authMock.changeCurrentUserPassword.mock.calls[0]?.[0]).not.toHaveProperty(
      'confirmation',
    );
  });

  it.each([
    ['invalid_current_password', 'currentPassword'],
    ['password_policy_violation', 'newPassword'],
    ['password_unchanged', 'newPassword'],
  ] as const)('maps %s to its field', async (code, field) => {
    authMock.changeCurrentUserPassword.mockRejectedValue(
      new ApiError('private detail', 'http', 400, code),
    );
    const { wrapper } = await mountView();
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const errorId =
      field === 'currentPassword'
        ? '#self-service-current-password-error'
        : '#self-service-new-password-error';
    const message = wrapper.get(errorId).text();
    expect(message).not.toContain('private detail');
    expect(message).toMatch(
      code === 'invalid_current_password'
        ? /current password is incorrect/i
        : code === 'password_policy_violation'
          ? /12 to 128 Unicode code points/i
          : /different from your current password/i,
    );
  });

  it('shows the documented rate-limit response without exposing backend details', async () => {
    authMock.changeCurrentUserPassword.mockRejectedValue(
      new ApiError('private detail', 'http', 429, undefined),
    );
    const { wrapper } = await mountView();
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain('Too many attempts');
    expect(wrapper.text()).not.toContain('private detail');
  });

  it('rehydrates identity and enters FE-24 when the backend requires the mandatory flow', async () => {
    authMock.changeCurrentUserPassword.mockRejectedValue(
      new ApiError('Password change required', 'http', 403, 'password_change_required'),
    );
    authMock.reloadIdentity.mockImplementation(async () => {
      authMock.identity.mustChangePassword = true;
    });
    const { router, wrapper } = await mountView();
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(authMock.reloadIdentity).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe('/change-password');
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('clears an expired session and returns to login', async () => {
    authMock.changeCurrentUserPassword.mockRejectedValue(new ApiError('Unauthorized', 'http', 401));
    const { router, wrapper } = await mountView();
    await fillForm(wrapper);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(authMock.clearSession).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.returnTo).toBe('/settings/change-password');
  });

  it('prevents duplicate requests while the password change is pending', async () => {
    let resolveChange: (() => void) | undefined;
    authMock.changeCurrentUserPassword.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveChange = resolve;
      }),
    );
    const { wrapper } = await mountView();
    await fillForm(wrapper);
    const submission = wrapper.get('form').trigger('submit');
    await flushPromises();
    await wrapper.get('form').trigger('submit');

    expect(authMock.changeCurrentUserPassword).toHaveBeenCalledOnce();
    expect(wrapper.get('#self-service-current-password').attributes('disabled')).toBeDefined();
    resolveChange?.();
    await submission;
    await flushPromises();
  });
});
