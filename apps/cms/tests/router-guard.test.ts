import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installAuthGuard, routes } from '../src/router';
import { sanitizeReturnTo } from '../src/router/return-to';

function createAuthMock(authenticated = false, permissions: string[] = []) {
  return {
    status: authenticated ? ('authenticated' as const) : ('unauthenticated' as const),
    restore: vi.fn().mockResolvedValue(authenticated),
    isAuthenticated: vi.fn().mockReturnValue(authenticated),
    can: vi.fn((permission: string) => permissions.includes(permission)),
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

  it('allows authenticated protected access', async () => {
    const auth = createAuthMock(true);
    const router = createGuardedRouter(auth);

    await router.push('/');

    expect(router.currentRoute.value.name).toBe('home');
  });

  it('redirects authenticated login visits to root', async () => {
    const auth = createAuthMock(true);
    const router = createGuardedRouter(auth);

    await router.push('/login?returnTo=%2F');

    expect(router.currentRoute.value.path).toBe('/');
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
