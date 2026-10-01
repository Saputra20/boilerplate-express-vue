import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installAuthGuard, routes } from '../src/router';
import { sanitizeReturnTo } from '../src/router/return-to';

function createAuthMock(
  authenticated = false,
  permissions: string[] = [],
  mustChangePassword = false,
) {
  return {
    status: authenticated ? ('authenticated' as const) : ('unauthenticated' as const),
    restore: vi.fn().mockResolvedValue(authenticated),
    isAuthenticated: vi.fn().mockReturnValue(authenticated),
    can: vi.fn((permission: string) => permissions.includes(permission)),
    mustChangePassword,
    isPasswordChangeRequired: vi.fn(() => mustChangePassword),
  };
}

function createGuardedRouter(auth: ReturnType<typeof createAuthMock>) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  installAuthGuard(router, auth);
  return router;
}

describe('authentication route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('waits for restoration before deciding protected access', async () => {
    let resolveRestore: ((value: boolean) => void) | undefined;
    const auth = createAuthMock(false);
    auth.restore.mockReturnValue(
      new Promise((resolve) => {
        resolveRestore = resolve;
      }),
    );
    const router = createGuardedRouter(auth);
    const navigation = router.push('/');

    expect(router.currentRoute.value.name).toBe(undefined);
    resolveRestore?.(false);
    await navigation;

    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.returnTo).toBe('/');
  });

  it('redirects unauthenticated protected access to login with safe returnTo', async () => {
    const auth = createAuthMock(false);
    const router = createGuardedRouter(auth);

    await router.push('/');

    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.returnTo).toBe('/');
    expect(auth.restore).toHaveBeenCalled();
  });

  it('allows an unauthenticated visitor to open forgot password', async () => {
    const auth = createAuthMock(false);
    const router = createGuardedRouter(auth);

    await router.push('/forgot-password');

    expect(router.currentRoute.value.name).toBe('forgot-password');
    expect(auth.restore).toHaveBeenCalled();
  });

  it('allows an unauthenticated visitor to open reset password with its query token', async () => {
    const auth = createAuthMock(false);
    const router = createGuardedRouter(auth);

    await router.push('/reset-password?token=synthetic-token');

    expect(router.currentRoute.value.name).toBe('reset-password');
    expect(router.currentRoute.value.query.token).toBe('synthetic-token');
  });

  it('allows an unauthenticated visitor to open email verification with its query token', async () => {
    const auth = createAuthMock(false);
    const router = createGuardedRouter(auth);

    await router.push('/verify-email?token=synthetic-token');

    expect(router.currentRoute.value.name).toBe('verify-email');
    expect(router.currentRoute.value.query.token).toBe('synthetic-token');
    expect(auth.restore).not.toHaveBeenCalled();
  });

  it('allows authenticated protected access when dashboard.read is present', async () => {
    const auth = createAuthMock(true, ['dashboard.read']);
    const router = createGuardedRouter(auth);

    await router.push('/');

    expect(router.currentRoute.value.name).toBe('home');
  });

  it('allows a compliant authenticated user to open self-service password settings', async () => {
    const router = createGuardedRouter(createAuthMock(true));
    await router.push('/settings/change-password');

    expect(router.currentRoute.value.name).toBe('self-service-change-password');
  });

  it('keeps mandatory-change users in FE-24 when they navigate to self-service settings', async () => {
    const router = createGuardedRouter(createAuthMock(true, [], true));
    await router.push('/settings/change-password');

    expect(router.currentRoute.value.name).toBe('change-password');
  });

  it('requires authentication for self-service password settings and preserves the return path', async () => {
    const router = createGuardedRouter(createAuthMock(false));
    await router.push('/settings/change-password');

    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.returnTo).toBe('/settings/change-password');
  });

  it('requires dashboard.read before rendering the summary', async () => {
    const denied = createGuardedRouter(createAuthMock(true));
    await denied.push('/');
    expect(denied.currentRoute.value.name).toBe('denied');

    const allowed = createGuardedRouter(createAuthMock(true, ['dashboard.read']));
    await allowed.push('/');
    expect(allowed.currentRoute.value.name).toBe('home');
  });

  it('redirects authenticated login visits to root', async () => {
    const auth = createAuthMock(true, ['dashboard.read']);
    const router = createGuardedRouter(auth);

    await router.push('/login?returnTo=%2F');

    expect(router.currentRoute.value.path).toBe('/');
  });

  it('redirects required-change users from protected routes to the password flow', async () => {
    const router = createGuardedRouter(createAuthMock(true, ['dashboard.read'], true));
    await router.push('/categories?tab=recent');
    expect(router.currentRoute.value.path).toBe('/change-password');
    expect(router.currentRoute.value.query.returnTo).toBe('/categories?tab=recent');
    await router.push('/categories');
    expect(router.currentRoute.value.path).toBe('/change-password');
  });

  it('allows the password route without a redirect loop while change is required', async () => {
    const router = createGuardedRouter(createAuthMock(true, [], true));
    await router.push('/change-password');
    expect(router.currentRoute.value.name).toBe('change-password');
  });

  it('redirects an already-compliant user away from the mandatory password route', async () => {
    const router = createGuardedRouter(createAuthMock(true, ['dashboard.read'], false));
    await router.push('/change-password');
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('sends authenticated required-change users visiting login to the password route', async () => {
    const router = createGuardedRouter(createAuthMock(true, [], true));
    await router.push('/login');
    expect(router.currentRoute.value.path).toBe('/change-password');
  });

  it('allows authenticated access when the required permission is present', async () => {
    const auth = createAuthMock(true, ['fixture.view']);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        ...routes,
        { path: '/restricted', component: {}, meta: { requiredPermission: 'fixture.view' } },
      ],
    });
    installAuthGuard(router, auth);

    await router.push('/restricted');

    expect(router.currentRoute.value.path).toBe('/restricted');
  });

  it('redirects authenticated access without permission to denied UX, not login', async () => {
    const auth = createAuthMock(true);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        ...routes,
        { path: '/restricted', component: {}, meta: { requiredPermission: 'fixture.view' } },
      ],
    });
    installAuthGuard(router, auth);

    await router.push('/restricted');

    expect(router.currentRoute.value.name).toBe('denied');
    expect(auth.can).toHaveBeenCalledWith('fixture.view');
  });

  it('requires user.read before rendering user management', async () => {
    const denied = createGuardedRouter(createAuthMock(true));
    await denied.push('/users');
    expect(denied.currentRoute.value.name).toBe('denied');

    const allowed = createGuardedRouter(createAuthMock(true, ['user.read']));
    await allowed.push('/users');
    expect(allowed.currentRoute.value.name).toBe('users');
  });

  it.each([
    ['/roles/create', 'role.create', 'role-create'],
    ['/roles/00000000-0000-4000-8000-000000000001/edit', 'role.update', 'role-edit'],
    ['/users/create', 'user.create', 'user-create'],
    ['/users/00000000-0000-4000-8000-000000000001/edit', 'user.update', 'user-edit'],
  ])('protects %s with %s', async (path, permission, routeName) => {
    const denied = createGuardedRouter(createAuthMock(true));
    await denied.push(path);
    expect(denied.currentRoute.value.name).toBe('denied');

    const allowed = createGuardedRouter(createAuthMock(true, [permission]));
    await allowed.push(path);
    expect(allowed.currentRoute.value.name).toBe(routeName);
  });
});

describe('returnTo sanitization', () => {
  it.each([
    ['/reports?tab=recent', '/reports?tab=recent'],
    ['https://evil.example', '/'],
    ['//evil.example/path', '/'],
    ['\\\\evil.example\\path', '/'],
    ['/%E0%A4%A', '/'],
    ['javascript:alert(1)', '/'],
  ])('maps %s to %s', (value, expected) => {
    expect(sanitizeReturnTo(value)).toBe(expected);
  });
});
