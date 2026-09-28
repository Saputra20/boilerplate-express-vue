import { jest } from '@jest/globals';
import type { Request, Response } from 'express';
import { verifyPassword } from '../src/helpers/password.helper.js';
import { fingerprintToken } from '../src/helpers/token-fingerprint.helper.js';
import { buildAuthActionUrl } from '../src/modules/auth/services/auth-action-url.js';
import {
  createPasswordRecoveryService,
  PASSWORD_RESET_TTL_MS,
  PasswordResetPasswordError,
  PasswordResetTokenError,
  type PasswordRecoveryRepository,
  type PasswordRecoveryService,
} from '../src/modules/auth/services/password-recovery.service.js';
import type { EmailDeliveryService } from '../src/modules/notification/email/delivery.service.js';
import {
  createPasswordRecoveryRequestController,
  createPasswordResetConfirmController,
} from '../src/modules/auth/v1/controllers/password-recovery.controller.js';

const token = 'A'.repeat(43);
const generic = {
  message: 'If the account is eligible for a password reset, a reset email will be sent.',
};

function createRepository(
  overrides: Partial<PasswordRecoveryRepository> = {},
): PasswordRecoveryRepository {
  return {
    issue: jest.fn<PasswordRecoveryRepository['issue']>().mockResolvedValue(null),
    consume: jest.fn<PasswordRecoveryRepository['consume']>().mockResolvedValue(false),
    ...overrides,
  };
}

describe('password recovery service', () => {
  it('creates a one-hour hashed challenge and delivers the raw token through encrypted email handoff', async () => {
    const issuedAt = new Date('2026-09-27T00:00:00Z');
    const issue = jest.fn<PasswordRecoveryRepository['issue']>().mockResolvedValue({
      challengeId: 'challenge-fixture',
      userId: 'user-fixture',
      email: 'person@example.test',
    });
    const delivery = {
      create: jest
        .fn<EmailDeliveryService['create']>()
        .mockResolvedValue({ emailDeliveryId: 'delivery-fixture' }),
    };
    const repository = createRepository({ issue });
    const service = createPasswordRecoveryService({
      repository,
      delivery,
      publicAppUrl: new URL('https://cms.example.test/admin'),
      now: () => issuedAt,
      createToken: () => token,
    });

    await service.request({
      email: 'person@example.test',
      requestId: '00000000-0000-4000-8000-000000000001',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    expect(issue).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: fingerprintToken(token),
        expiresAt: new Date(issuedAt.getTime() + PASSWORD_RESET_TTL_MS),
        cooldownBefore: new Date(issuedAt.getTime() - 60_000),
        requestLimitBefore: new Date(issuedAt.getTime() - 60 * 60 * 1000),
      }),
    );
    const deliveryInput = delivery.create.mock.calls[0]?.[0];
    expect(deliveryInput.template).toBe('auth.password-reset');
    expect(deliveryInput.recipient).toBe('person@example.test');
    expect(deliveryInput.context).toEqual({
      actionUrl: `https://cms.example.test/admin/reset-password?token=${token}`,
      expiryDisplay: '1 hour',
    });
    expect(deliveryInput.sensitivePayloadExpiresAt).toEqual(
      new Date(issuedAt.getTime() + PASSWORD_RESET_TTL_MS),
    );
    expect(JSON.stringify(issue.mock.calls)).not.toContain(token);
  });

  it('encodes auth action token query values with URLSearchParams', () => {
    expect(
      buildAuthActionUrl(new URL('https://cms.example.test/base/'), 'reset-password', 'a+/='),
    ).toBe('https://cms.example.test/base/reset-password?token=a%2B%2F%3D');
  });

  it('does not issue a challenge for ineligible users or expose delivery failures', async () => {
    const issue = jest.fn<PasswordRecoveryRepository['issue']>().mockResolvedValue(null);
    const delivery = {
      create: jest
        .fn<EmailDeliveryService['create']>()
        .mockRejectedValue(new Error('provider secret must remain private')),
    };
    const repository = createRepository({ issue });
    const service = createPasswordRecoveryService({
      repository,
      delivery,
      publicAppUrl: new URL('https://cms.example.test'),
      createToken: () => token,
    });

    await expect(
      service.request({
        email: 'unknown@example.test',
        requestId: 'id',
        ipAddress: null,
        userAgent: null,
      }),
    ).resolves.toBeUndefined();
    expect(delivery.create).not.toHaveBeenCalled();

    issue.mockResolvedValue({ challengeId: 'c', userId: 'u', email: 'person@example.test' });
    await expect(
      service.request({
        email: 'person@example.test',
        requestId: 'id',
        ipAddress: null,
        userAgent: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('keeps repository failures generic and reports only the request ID to diagnostics', async () => {
    const onRequestFailure = jest.fn<(requestId: string) => void>();
    const service = createPasswordRecoveryService({
      repository: createRepository({
        issue: jest
          .fn<PasswordRecoveryRepository['issue']>()
          .mockRejectedValue(new Error('database details include sensitive values')),
      }),
      delivery: { create: jest.fn<EmailDeliveryService['create']>() },
      publicAppUrl: new URL('https://cms.example.test'),
      onRequestFailure,
      createToken: () => token,
    });

    await expect(
      service.request({
        email: 'private-person@example.test',
        requestId: 'request-fixture',
        ipAddress: null,
        userAgent: null,
      }),
    ).resolves.toBeUndefined();
    expect(onRequestFailure).toHaveBeenCalledWith('request-fixture');
    expect(JSON.stringify(onRequestFailure.mock.calls)).not.toContain(
      'private-person@example.test',
    );
    expect(JSON.stringify(onRequestFailure.mock.calls)).not.toContain(token);
  });

  it('changes no state for malformed token or invalid password and maps replay to one token error', async () => {
    const consume = jest.fn<PasswordRecoveryRepository['consume']>().mockResolvedValue(false);
    const service = createPasswordRecoveryService({ repository: createRepository({ consume }) });

    await expect(
      service.confirm({
        token: 'invalid',
        password: 'valid password 123',
        requestId: 'id',
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toBeInstanceOf(PasswordResetTokenError);
    await expect(
      service.confirm({
        token,
        password: 'short',
        requestId: 'id',
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toBeInstanceOf(PasswordResetPasswordError);
    expect(consume).not.toHaveBeenCalled();
    await expect(
      service.confirm({
        token,
        password: 'a sufficiently long password',
        requestId: 'id',
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toBeInstanceOf(PasswordResetTokenError);
    expect(consume).toHaveBeenCalledTimes(1);
  });

  it('passes only an Argon2id hash to the atomic reset repository', async () => {
    const password = 'new secure password 2026';
    const consume = jest.fn<PasswordRecoveryRepository['consume']>().mockResolvedValue(true);
    const service = createPasswordRecoveryService({ repository: createRepository({ consume }) });

    await service.confirm({
      token,
      password,
      requestId: 'request-id',
      ipAddress: null,
      userAgent: null,
    });

    const input = consume.mock.calls[0]?.[0];
    expect(input?.passwordHash).not.toBe(password);
    expect(input?.passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(input!.passwordHash, password)).resolves.toBe(true);
    expect(JSON.stringify(consume.mock.calls)).not.toContain(password);
    expect(JSON.stringify(consume.mock.calls)).not.toContain(token);
  });
});

describe('password recovery API handlers', () => {
  const app = { get: () => false };

  function requestMock(body: unknown, ip = '127.0.0.1') {
    return {
      body,
      id: '00000000-0000-4000-8000-000000000001',
      ip,
      method: 'POST',
      path: '/api/v1/auth/password-reset/request',
      originalUrl: '/api/v1/auth/password-reset/request',
      headers: {},
      socket: { remoteAddress: ip },
      app,
      get: () => 'test-agent',
    } as unknown as Request;
  }

  function responseMock() {
    const response = {
      statusCode: 200,
      body: undefined as unknown,
      ended: false,
      status(code: number) {
        response.statusCode = code;
        return response;
      },
      json(body: unknown) {
        response.body = body;
        return response;
      },
      end() {
        response.ended = true;
        return response;
      },
    };
    return response as unknown as Response & typeof response;
  }

  async function invoke(
    handler: (request: Request, response: Response, next: (error?: unknown) => void) => unknown,
    body: unknown,
  ) {
    const response = responseMock();
    let nextError: unknown;
    await handler(requestMock(body), response, (error) => {
      nextError = error;
    });
    if (nextError) throw nextError;
    return response;
  }

  it('returns identical generic 202 responses regardless of account eligibility', async () => {
    const service: PasswordRecoveryService = {
      request: async () => undefined,
      confirm: async () => undefined,
    };
    const controller = createPasswordRecoveryRequestController(service);
    const responses = await Promise.all(
      ['known@example.test', 'unknown@example.test', 'disabled@example.test'].map((email) =>
        invoke(controller, { email }),
      ),
    );
    expect(responses.map(({ statusCode, body }) => ({ status: statusCode, body }))).toEqual(
      Array(3).fill({ status: 202, body: generic }),
    );
  });

  it('returns no content on success and the same safe error for every invalid token state', async () => {
    const service: PasswordRecoveryService = {
      request: async () => undefined,
      confirm: async ({ token }) => {
        if (token !== 'valid-token') throw new PasswordResetTokenError();
      },
    };
    const controller = createPasswordResetConfirmController(service);
    const success = await invoke(controller, {
      token: 'valid-token',
      password: 'long enough password',
    });
    expect(success.statusCode).toBe(204);
    expect(success.ended).toBe(true);
    for (const invalidToken of ['unknown-token', 'expired-token', 'used-token']) {
      const response = await invoke(controller, {
        token: invalidToken,
        password: 'long enough password',
      });
      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({
        message: 'Invalid or expired password reset token',
        code: 'invalid_or_expired_password_reset_token',
      });
    }
  });

  it('returns standard bad request for malformed input and password policy failures', async () => {
    const service: PasswordRecoveryService = {
      request: async () => undefined,
      confirm: async () => {
        throw new PasswordResetPasswordError();
      },
    };
    const controller = createPasswordResetConfirmController(service);
    expect((await invoke(controller, { token: 1, password: 'long enough password' })).body).toEqual(
      {
        message: 'Bad request',
      },
    );
    expect((await invoke(controller, { token, password: 'short' })).body).toEqual({
      message: 'Bad request',
    });
  });
});
