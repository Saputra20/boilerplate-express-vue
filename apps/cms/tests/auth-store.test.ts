import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore, REFRESH_TOKEN_STORAGE_KEY } from '../src/stores/auth';
import type { ApiClient } from '../src/api/client';

const tokenResponse = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  tokenType: 'Bearer' as const,
  expiresIn: 900,
};

const contextResponse = {
  user: { id: '00000000-0000-4000-8000-000000000001', email: 'user@example.com' },
  roles: ['editor'],
  permissions: ['content.read'],
};

function createApiMock(): ApiClient {
  return {
    request: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    listRoles: vi.fn(),
    getRole: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    listPermissionCatalog: vi.fn(),
    listUsers: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getDashboardSummary: vi.fn(),
  };
}

describe('auth store', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setActivePinia(createPinia());
  });

  it('keeps access token in memory and establishes login state', async () => {
    const api = createApiMock();
    vi.mocked(api.login).mockResolvedValue(tokenResponse);
    vi.mocked(api.me).mockResolvedValue(contextResponse);
    const store = createAuthStore(api)();

    await expect(store.login({ email: 'user@example.com', password: 'secret' })).resolves.toBe(
      true,
    );

    expect(store.accessToken).toBe('access-token');
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-token');
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(store.identity).toEqual({
      userId: contextResponse.user.id,
      email: contextResponse.user.email,
      roles: contextResponse.roles,
      effectivePermissions: contextResponse.permissions,
    });
    expect(api.me).toHaveBeenCalledWith('access-token');
    expect(store.isAuthenticated()).toBe(true);
  });

  it('restores unauthenticated state without a stored refresh token', async () => {
    const api = createApiMock();
    const store = createAuthStore(api)();

    await expect(store.restore()).resolves.toBe(false);

    expect(store.status).toBe('unauthenticated');
    expect(api.refresh).not.toHaveBeenCalled();
  });

  it('runs restoration only once per store lifetime', async () => {
    const api = createApiMock();
    vi.mocked(api.refresh).mockResolvedValue(tokenResponse);
    vi.mocked(api.me).mockResolvedValue(contextResponse);
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'old-refresh-token');
    const store = createAuthStore(api)();

    await expect(store.restore()).resolves.toBe(true);
    await expect(store.restore()).resolves.toBe(true);

    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(api.me).toHaveBeenCalledTimes(1);
  });

  it('restores and rotates a stored refresh token', async () => {
    const api = createApiMock();
    vi.mocked(api.refresh).mockResolvedValue(tokenResponse);
    vi.mocked(api.me).mockResolvedValue(contextResponse);
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'old-refresh-token');
    const store = createAuthStore(api)();

    await expect(store.restore()).resolves.toBe(true);

    expect(api.refresh).toHaveBeenCalledWith({ refreshToken: 'old-refresh-token' });
    expect(store.accessToken).toBe('access-token');
    expect(store.identity?.effectivePermissions).toEqual(['content.read']);
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-token');
  });

  it('shares one refresh operation across concurrent callers', async () => {
    const api = createApiMock();
    let resolveRefresh: ((value: typeof tokenResponse) => void) | undefined;
    vi.mocked(api.refresh).mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'old-refresh-token');
    const store = createAuthStore(api)();

    const first = store.refreshSession();
    const second = store.refreshSession();
    resolveRefresh?.(tokenResponse);

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(api.refresh).toHaveBeenCalledTimes(1);
  });

  it('clears state when restoration refresh fails', async () => {
    const api = createApiMock();
    vi.mocked(api.refresh).mockRejectedValue(new Error('Invalid refresh token'));
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'old-refresh-token');
    const store = createAuthStore(api)();

    await expect(store.restore()).resolves.toBe(false);

    expect(store.status).toBe('unauthenticated');
    expect(store.accessToken).toBeNull();
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it.each([
    ['logout', 'logout'],
    ['logoutAll', 'logoutAll'],
  ] as const)('clears local state after %s failure', async (action, apiMethod) => {
    const api = createApiMock();
    vi.mocked(api.login).mockResolvedValue(tokenResponse);
    vi.mocked(api.me).mockResolvedValue(contextResponse);
    vi.mocked(api[apiMethod]).mockRejectedValue(new Error('network failure'));
    const store = createAuthStore(api)();
    await store.login({ email: 'user@example.com', password: 'secret' });

    await expect(store[action]()).rejects.toThrow('network failure');

    expect(store.status).toBe('unauthenticated');
    expect(store.accessToken).toBeNull();
    expect(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('does not recursively refresh through the API client', async () => {
    const api = createApiMock();
    vi.mocked(api.refresh).mockRejectedValue(new Error('Invalid refresh token'));
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'old-refresh-token');
    const store = createAuthStore(api)();

    await store.restore();

    expect(api.refresh).toHaveBeenCalledTimes(1);
    expect(api.request).not.toHaveBeenCalled();
  });
});
