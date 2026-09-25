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
