import type { Request, Response } from 'express';
import type { AccessAuthService } from '../src/modules/auth/services/access-auth.service.js';
import type { AuthenticatedContextService } from '../src/modules/auth/services/context.service.js';
import { createUpdateMeController } from '../src/modules/auth/v1/controllers/me.controller.js';

const principal = {
  sub: '11111111-1111-4111-8111-111111111111',
  sid: '22222222-2222-4222-8222-222222222222',
  jti: '33333333-3333-4333-8333-333333333333',
  exp: 1_900_000_000,
  revoked: false,
  mustChangePassword: false,
} satisfies Awaited<ReturnType<AccessAuthService['authenticate']>>;

function invoke(body: unknown, service: AuthenticatedContextService) {
  const request = {
    body,
    id: '44444444-4444-4444-8444-444444444444',
    ip: '127.0.0.1',
    get: () => 'profile-test',
  } as unknown as Request;
  const responseState = { statusCode: 0, body: undefined as unknown };
  const response = {
    locals: { authPrincipal: principal },
    status(code: number) {
      responseState.statusCode = code;
      return this;
    },
    json(value: unknown) {
      responseState.body = value;
      return this;
    },
  } as unknown as Response;
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };
  const result = {
    request,
    response,
    responseState,
    next,
    wasNextCalled: () => nextCalled,
    run: createUpdateMeController(service),
  };
  return result;
}

describe('PATCH /api/v1/me controller', () => {
  it('passes only authenticated identity and normalized display name, then returns fresh context', async () => {
    let received: unknown;
    const updateDisplayName = async (
      input: Parameters<AuthenticatedContextService['updateDisplayName']>[0],
    ) => {
      received = input;
      return 'updated' as const;
    };
    const context = {
      user: {
        id: principal.sub,
        email: 'user@example.test',
        displayName: 'Ada Lovelace',
        mustChangePassword: false,
      },
      roles: ['editor'],
      permissions: ['content.read'],
    };
    const getContext = async () => context;
    const service = { updateDisplayName, getContext } satisfies AuthenticatedContextService;
    const { request, response, next, responseState, wasNextCalled, run } = invoke(
      { displayName: '  Ada Lovelace  ' },
      service,
    );

    await run(request, response, next);

    expect(received).toEqual({
      userId: principal.sub,
      displayName: 'Ada Lovelace',
      requestId: request.id,
      sessionId: principal.sid,
      ipAddress: '127.0.0.1',
      userAgent: 'profile-test',
    });
    expect(responseState.statusCode).toBe(200);
    expect(responseState.body).toEqual(context);
    expect(wasNextCalled()).toBe(false);
  });

  it('rejects unsupported fields without calling the update service', async () => {
    let updateCalled = false;
    const updateDisplayName = async () => {
      updateCalled = true;
      return 'updated' as const;
    };
    const service: AuthenticatedContextService = {
      updateDisplayName,
      getContext: async () => null,
    };
    const { request, response, next, responseState, wasNextCalled, run } = invoke(
      { displayName: 'Ada', email: 'attacker@example.test' },
      service,
    );

    await run(request, response, next);

    expect(updateCalled).toBe(false);
    expect(responseState.statusCode).toBe(400);
    expect(responseState.body).toEqual({ message: 'Bad request' });
    expect(wasNextCalled()).toBe(false);
  });
});
