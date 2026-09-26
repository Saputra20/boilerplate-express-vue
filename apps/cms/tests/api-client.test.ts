import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { vi } from 'vitest';
import { API_TIMEOUT_MS, createApiClient } from '../src/api/client';

const tokenResponse = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  tokenType: 'Bearer' as const,
  expiresIn: 900,
};

function createTransport() {
  return { request: vi.fn() };
}

function createResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() } as AxiosResponse<T>['config'],
  };
}

describe('API client', () => {
  it('loads dashboard summary from the protected endpoint and validates its contract', async () => {
    const transport = createTransport();
    const summary = {
      users: { total: 8, active: 6, disabled: 2 },
      roles: { total: 3 },
      categories: { total: 5, active: 4 },
    };
    transport.request.mockResolvedValue(createResponse(summary));
    const client = createApiClient('http://localhost:3000', () => 'access-token', transport);

    await expect(client.getDashboardSummary()).resolves.toEqual(summary);
    expect(transport.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: '/api/v1/dashboard/summary' }),
    );
    expect(transport.request.mock.calls[0]?.[0].headers.get('Authorization')).toBe(
      'Bearer access-token',
    );

    transport.request.mockResolvedValueOnce(
      createResponse({ ...summary, users: { ...summary.users, total: -1 } }),
    );
    await expect(client.getDashboardSummary()).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('loads and mutates categories through the approved contract', async () => {
    const transport = createTransport();
    const category = {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'News',
      slug: 'news',
      description: null,
      isActive: true,
      createdAt: '2026-09-26T00:00:00.000Z',
      updatedAt: '2026-09-26T00:00:00.000Z',
      deletedAt: null,
    };
    transport.request
      .mockResolvedValueOnce(
        createResponse({
          items: [category],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      )
      .mockResolvedValueOnce(createResponse(category))
      .mockResolvedValueOnce(createResponse(category))
      .mockResolvedValueOnce(createResponse(undefined));
    const client = createApiClient('http://localhost:3000', () => 'access-token', transport);

    await expect(
      client.listCategories({ search: 'news', sort: 'name.asc' }),
    ).resolves.toMatchObject({
      items: [{ slug: 'news' }],
    });
    await client.createCategory({ name: 'News', slug: 'news' });
    await client.updateCategory(category.id, { name: 'Latest news' });
    await client.deleteCategory(category.id);

    expect(transport.request.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['GET', '/api/v1/categories'],
      ['POST', '/api/v1/categories'],
      ['PATCH', `/api/v1/categories/${category.id}`],
      ['DELETE', `/api/v1/categories/${category.id}`],
    ]);
    expect(transport.request.mock.calls[0]?.[0].headers.get('Authorization')).toBe(
      'Bearer access-token',
    );
  });

  it('loads the permission catalog and updates roles with permission codes', async () => {
    const transport = createTransport();
    const role = {
      id: '00000000-0000-4000-8000-000000000002',
      code: 'editor',
      name: 'Editor',
      description: 'Content editor',
      createdAt: '2026-09-26T00:00:00.000Z',
      updatedAt: '2026-09-26T00:00:00.000Z',
      permissionCodes: ['category.read'],
    };
    transport.request
      .mockResolvedValueOnce(
        createResponse([
          {
            id: '00000000-0000-4000-8000-000000000003',
            code: 'category.read',
            description: null,
          },
        ]),
      )
      .mockResolvedValueOnce(createResponse(role));
    const client = createApiClient('http://localhost:3000', () => 'access-token', transport);

    await expect(client.listPermissionCatalog()).resolves.toMatchObject([
      { code: 'category.read', description: null },
    ]);
    await expect(
      client.updateRole(role.id, {
        name: 'Editor',
        description: 'Content editor',
        permissionCodes: ['category.read'],
      }),
    ).resolves.toMatchObject({ permissionCodes: ['category.read'] });
    expect(transport.request.mock.calls[0]?.[0].url).toBe('/api/v1/misc/permissions');
    expect(transport.request.mock.calls[1]?.[0]).toMatchObject({
      method: 'PATCH',
      url: `/api/v1/roles/${role.id}`,
      data: { name: 'Editor', description: 'Content editor', permissionCodes: ['category.read'] },
    });
  });

  it('uses approved user routes, update method, and safe response fields', async () => {
    const transport = createTransport();
    const user = {
      id: '00000000-0000-4000-8000-000000000004',
      email: 'member@example.com',
      status: 'active' as const,
      emailVerifiedAt: null,
      lastLoginAt: null,
      createdAt: '2026-09-26T00:00:00.000Z',
      updatedAt: '2026-09-26T00:00:00.000Z',
      deletedAt: null,
      role: { id: '00000000-0000-4000-8000-000000000005', code: 'editor', name: 'Editor' },
      mustChangePassword: true,
    };
    transport.request
      .mockResolvedValueOnce(
        createResponse({
          items: [user],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      )
      .mockResolvedValueOnce(createResponse(user))
      .mockResolvedValueOnce(createResponse(user))
      .mockResolvedValueOnce(createResponse(undefined));
    const client = createApiClient('http://localhost:3000', () => 'access-token', transport);

    await expect(client.listUsers({ search: 'member', status: 'active' })).resolves.toMatchObject({
      items: [{ email: user.email }],
    });
    await client.createUser({ email: user.email, roleId: user.role.id });
    await client.updateUser(user.id, {
      email: user.email,
      roleId: user.role.id,
      status: 'disabled',
    });
    await client.deleteUser(user.id);
    expect(transport.request.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['GET', '/api/v1/users'],
      ['POST', '/api/v1/users'],
      ['PUT', `/api/v1/users/${user.id}`],
      ['DELETE', `/api/v1/users/${user.id}`],
    ]);
    expect(transport.request.mock.calls[1]?.[0].data).toEqual({
      email: user.email,
      roleId: user.role.id,
    });
  });

  it('uses the configured base URL and ten-second timeout for public JSON requests', async () => {
    const transport = createTransport();
    transport.request.mockResolvedValue(createResponse(tokenResponse));
    const client = createApiClient('http://localhost:3000', undefined, transport);

    await expect(client.login({ email: 'user@example.com', password: 'secret' })).resolves.toEqual(
      tokenResponse,
    );
    expect(transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://localhost:3000',
        timeout: API_TIMEOUT_MS,
        method: 'POST',
        url: '/api/v1/auth/login',
        data: { email: 'user@example.com', password: 'secret' },
      }),
    );
    expect(transport.request.mock.calls[0]?.[0].headers.get('Authorization')).toBeUndefined();
  });

  it('injects an explicit bearer token for protected requests', async () => {
    const transport = createTransport();
    transport.request.mockResolvedValue(createResponse(undefined));
    const client = createApiClient('http://localhost:3000', () => 'provider-token', transport);

    await client.logout();

    expect(transport.request.mock.calls[0]?.[0].headers.get('Authorization')).toBe(
      'Bearer provider-token',
    );
  });

  it('supports explicit token override and current auth contracts', async () => {
    const transport = createTransport();
    transport.request
      .mockResolvedValueOnce(createResponse(tokenResponse))
      .mockResolvedValueOnce(createResponse(undefined));
    const client = createApiClient('http://localhost:3000', () => 'provider-token', transport);

    await expect(client.refresh({ refreshToken: 'refresh-token' })).resolves.toEqual(tokenResponse);
    await client.logoutAll('explicit-token');

    expect(transport.request.mock.calls[0]?.[0].url).toBe('/api/v1/auth/refresh');
    expect(transport.request.mock.calls[1]?.[0].url).toBe('/api/v1/auth/logout-all');
    expect(transport.request.mock.calls[1]?.[0].headers.get('Authorization')).toBe(
      'Bearer explicit-token',
    );
  });

  it('loads authenticated user context with the current bearer token', async () => {
    const transport = createTransport();
    transport.request.mockResolvedValue(
      createResponse({
        user: { id: '00000000-0000-4000-8000-000000000001', email: 'user@example.com' },
        roles: ['editor'],
        permissions: ['content.read'],
      }),
    );
    const client = createApiClient('http://localhost:3000', () => 'access-token', transport);

    await expect(client.me()).resolves.toEqual({
      user: { id: '00000000-0000-4000-8000-000000000001', email: 'user@example.com' },
      roles: ['editor'],
      permissions: ['content.read'],
    });
    expect(transport.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: '/api/v1/me' }),
    );
    expect(transport.request.mock.calls[0]?.[0].headers.get('Authorization')).toBe(
      'Bearer access-token',
    );
  });

  it.each([
    [400, 'Bad request'],
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [413, 'Payload too large'],
    [429, 'Too many requests'],
    [500, 'Internal server error'],
  ])('normalizes HTTP %s safely', async (status, message) => {
    const transport = createTransport();
    const error = new AxiosError('raw secret response', undefined, undefined, undefined, {
      status,
      statusText: 'Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { unexpected: 'secret' },
    });
    transport.request.mockRejectedValue(error);
    const client = createApiClient('http://localhost:3000', undefined, transport);

    await expect(client.logout('token')).rejects.toMatchObject({
      kind: 'http',
      status,
      message,
    });
    await expect(client.logout('token')).rejects.not.toThrow('secret');
  });

  it('preserves the backend safe message without exposing raw response data', async () => {
    const transport = createTransport();
    transport.request.mockRejectedValue(
      new AxiosError('raw error', undefined, undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { message: 'Invalid authentication', token: 'secret' },
      }),
    );
    const client = createApiClient('http://localhost:3000', undefined, transport);

    await expect(client.logout('token')).rejects.toMatchObject({
      kind: 'http',
      status: 401,
      message: 'Invalid authentication',
    });
  });

  it('distinguishes timeout and network failures without retrying', async () => {
    const transport = createTransport();
    transport.request
      .mockRejectedValueOnce(new AxiosError('timeout', 'ECONNABORTED'))
      .mockRejectedValueOnce(new AxiosError('network'));
    const client = createApiClient('http://localhost:3000', undefined, transport);

    await expect(client.logout('token')).rejects.toMatchObject({ kind: 'timeout' });
    await expect(client.logout('token')).rejects.toMatchObject({ kind: 'network' });
    expect(transport.request).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed token responses safely', async () => {
    const transport = createTransport();
    transport.request.mockResolvedValue(createResponse({ accessToken: 'only-access-token' }));
    const client = createApiClient('http://localhost:3000', undefined, transport);

    await expect(
      client.login({ email: 'user@example.com', password: 'secret' }),
    ).rejects.toMatchObject({
      kind: 'invalid-response',
      message: 'Invalid API response',
    });
  });
});
