import { createMemoryHistory, createRouter as makeRouter } from 'vue-router';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/client';
import VerifyEmailView from '../src/views/VerifyEmailView.vue';

const apiMock = vi.hoisted(() => ({ verifyEmail: vi.fn() }));
const authStoreMock = vi.hoisted(() => vi.fn());

vi.mock('../src/stores/auth', () => ({
  cmsApiClient: apiMock,
  useAuthStore: authStoreMock,
}));

const token = 'A'.repeat(43);

function createRouter() {
  return makeRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/verify-email', name: 'verify-email', component: VerifyEmailView },
      { path: '/login', name: 'login', component: { template: '<main>Sign in</main>' } },
    ],
  });
}

async function mountVerifyEmail(url = `/verify-email?token=${token}`) {
  const router = createRouter();
  await router.push(url);
  await router.isReady();
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } });
  await flushPromises();
  return { router, wrapper };
}

function storageContents(storage: Storage): string {
  return Array.from({ length: storage.length }, (_, index) => {
    const key = storage.key(index);
    return key ? `${key}=${storage.getItem(key)}` : '';
  }).join('\n');
}

describe('VerifyEmailView', () => {
  beforeEach(() => {
    apiMock.verifyEmail.mockReset();
    authStoreMock.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('scrubs the token and automatically submits it once while showing progress', async () => {
    let resolveRequest: (() => void) | undefined;
    apiMock.verifyEmail.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { router, wrapper } = await mountVerifyEmail(
      `/verify-email?token=${token}&source=email#verify`,
    );

    expect(router.currentRoute.value.path).toBe('/verify-email');
    expect(router.currentRoute.value.query).toEqual({ source: 'email' });
    expect(router.currentRoute.value.hash).toBe('#verify');
    expect(apiMock.verifyEmail).toHaveBeenCalledTimes(1);
    expect(apiMock.verifyEmail).toHaveBeenCalledWith({ token });
    expect(wrapper.get('h1').text()).toBe('Verifying your email');
    expect(wrapper.get('[role="status"]').text()).toContain('Please wait');
    expect(storageContents(window.localStorage)).not.toContain(token);
    expect(storageContents(window.sessionStorage)).not.toContain(token);
    resolveRequest?.();
    await flushPromises();
  });

  it('reuses an in-flight verification when the same link is reopened', async () => {
    const reentryToken = 'B'.repeat(43);
    let resolveRequest: (() => void) | undefined;
    apiMock.verifyEmail.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const firstEntry = await mountVerifyEmail(`/verify-email?token=${reentryToken}`);

    await firstEntry.router.push('/login');
    await firstEntry.router.push(`/verify-email?token=${reentryToken}`);
    await flushPromises();

    expect(apiMock.verifyEmail).toHaveBeenCalledTimes(1);
    resolveRequest?.();
    await flushPromises();
    expect(firstEntry.wrapper.get('h1').text()).toBe('Email verified');
  });

  it('shows verified state and sign-in action without touching auth state', async () => {
    apiMock.verifyEmail.mockResolvedValue(undefined);
    const { wrapper } = await mountVerifyEmail();

    expect(wrapper.get('h1').text()).toBe('Email verified');
    expect(wrapper.get('[role="status"]').text()).toContain('You can now sign in');
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true);
    expect(authStoreMock).not.toHaveBeenCalled();
    expect(storageContents(window.localStorage)).not.toContain(token);
    expect(storageContents(window.sessionStorage)).not.toContain(token);
  });

  it('shows a missing-token state without making a request', async () => {
    const { wrapper } = await mountVerifyEmail('/verify-email');

    expect(wrapper.get('h1').text()).toBe('Verification link unavailable');
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true);
    expect(apiMock.verifyEmail).not.toHaveBeenCalled();
  });

  it('scrubs repeated token parameters without submitting an invalid query value', async () => {
    const { router } = await mountVerifyEmail('/verify-email?token=first&token=second');

    expect(router.currentRoute.value.query).toEqual({});
    expect(apiMock.verifyEmail).not.toHaveBeenCalled();
  });

  it('scrubs an empty token without submitting it', async () => {
    const { router } = await mountVerifyEmail('/verify-email?token=');

    expect(router.currentRoute.value.query).toEqual({});
    expect(apiMock.verifyEmail).not.toHaveBeenCalled();
  });

  it('maps an expired token to the supported expired state', async () => {
    apiMock.verifyEmail.mockRejectedValue(
      new ApiError('private expiry detail', 'http', 400, 'verification_token_expired'),
    );
    const { wrapper } = await mountVerifyEmail();

    expect(wrapper.get('h1').text()).toBe('Verification link expired');
    expect(wrapper.text()).not.toContain('private expiry detail');
    expect(wrapper.text()).not.toContain('already verified');
  });

  it('maps invalid, used, revoked, and unknown tokens to one neutral state', async () => {
    apiMock.verifyEmail.mockRejectedValue(
      new ApiError('private token detail', 'http', 400, 'invalid_or_used_verification_token'),
    );
    const { wrapper } = await mountVerifyEmail();

    expect(wrapper.get('h1').text()).toBe('Verification link unavailable');
    expect(wrapper.text()).toContain("This verification link can't be used");
    expect(wrapper.text()).not.toContain('private token detail');
    expect(wrapper.text()).not.toContain('already verified');
  });

  it.each([
    new ApiError('private throttle detail', 'http', 429),
    new ApiError('private server detail', 'http', 500),
    new ApiError('private network detail', 'network'),
    new ApiError('private timeout detail', 'timeout'),
    new ApiError('private response detail', 'invalid-response'),
  ])('shows safe retry guidance for %s', async (error) => {
    apiMock.verifyEmail.mockRejectedValue(error);
    const { wrapper } = await mountVerifyEmail();

    expect(wrapper.get('[role="alert"]').text()).not.toContain('private');
    expect(wrapper.get('[role="alert"]').text().toLowerCase()).toContain('reopen the link');
  });
});
