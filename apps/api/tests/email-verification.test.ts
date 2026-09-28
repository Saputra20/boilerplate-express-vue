import { jest } from '@jest/globals';
import type { Request, Response } from 'express';
import {
  createEmailVerificationConsumeController,
  createEmailVerificationRequestController,
} from '../src/modules/auth/v1/controllers/email-verification.controller.js';
import {
  createEmailVerificationAttemptLimiter,
  createEmailVerificationRequestLimiters,
} from '../src/modules/auth/v1/email-verification-rate-limit.js';
import {
  buildEmailVerificationUrl,
  createEmailVerificationService,
  hashVerificationToken,
  VerificationTokenError,
  type EmailVerificationService,
  type VerificationRepository,
} from '../src/modules/auth/services/email-verification.service.js';
import type { EmailDeliveryService } from '../src/modules/notification/email/delivery.service.js';

const token = 'A'.repeat(43);
const generic = {
  message: 'If the account is eligible for email verification, a verification email will be sent.',
};

function createRepository(overrides: Partial<VerificationRepository> = {}): VerificationRepository {
  return {
    issue: jest.fn<VerificationRepository['issue']>().mockResolvedValue(null),
    consume: jest.fn<VerificationRepository['consume']>().mockResolvedValue('invalid'),
    recordDeliveryQueued: jest
      .fn<VerificationRepository['recordDeliveryQueued']>()
      .mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('email verification service', () => {
  it('hashes raw tokens with SHA-256 and safely encodes URL query values', () => {
    expect(hashVerificationToken('fixture-token')).toBe(
      'd07f963c2bb7a3cc74a910e51ca0075b194da412a93737881f105a55156a988f',
    );
    expect(buildEmailVerificationUrl(new URL('https://cms.example.test/admin/'), 'a+/=')).toBe(
      'https://cms.example.test/admin/verify-email?token=a%2B%2F%3D',
    );
  });

  it('creates a 24-hour challenge and delivers its raw token only through notification input', async () => {
    const issue = jest.fn<VerificationRepository['issue']>().mockResolvedValue({
      challengeId: 'challenge-fixture',
      userId: 'user-fixture',
      email: 'person@example.test',
    });
    const delivery = {
      create: jest
        .fn<EmailDeliveryService['create']>()
        .mockResolvedValue({ emailDeliveryId: 'delivery-fixture' }),
    };
    const recordDeliveryQueued = jest.fn<VerificationRepository['recordDeliveryQueued']>();
    const repository = createRepository({
      issue,
      consume: jest.fn<VerificationRepository['consume']>().mockResolvedValue('verified'),
      recordDeliveryQueued,
    });
    const issuedAt = new Date('2026-09-27T00:00:00Z');
    const service = createEmailVerificationService({
      repository,
      delivery,
      publicAppUrl: new URL('https://cms.example.test'),
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
        tokenHash: hashVerificationToken(token),
        expiresAt: new Date('2026-09-28T00:00:00Z'),
        cooldownBefore: new Date('2026-09-26T23:59:00Z'),
        requestLimitBefore: new Date('2026-09-26T23:00:00Z'),
      }),
    );
    const deliveryInput = delivery.create.mock.calls[0]?.[0];
    expect(deliveryInput.template).toBe('auth.email-verification');
    expect(deliveryInput.recipient).toBe('person@example.test');
    expect(deliveryInput.context).toEqual({
      actionUrl: `https://cms.example.test/verify-email?token=${token}`,
      expiryDisplay: '24 hours',
    });
    expect(deliveryInput.sensitivePayloadExpiresAt).toEqual(new Date('2026-09-28T00:00:00Z'));
    expect(recordDeliveryQueued).toHaveBeenCalledWith({
      challengeId: 'challenge-fixture',
      emailDeliveryId: 'delivery-fixture',
      requestId: '00000000-0000-4000-8000-000000000001',
    });
    expect(JSON.stringify(issue.mock.calls)).not.toContain(token);
  });

  it('does not issue for ineligible accounts and keeps delivery failure out of the public service result', async () => {
    const issue = jest.fn<VerificationRepository['issue']>().mockResolvedValue(null);
    const delivery = {
      create: jest
        .fn<EmailDeliveryService['create']>()
        .mockRejectedValue(new Error('provider secret')),
    };
    const repository = createRepository({ issue });
    const service = createEmailVerificationService({
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

  it.each([
    ['expired', 'expired'],
    ['invalid or replayed', 'invalid'],
  ] as const)(
    'maps %s challenge results to deterministic domain errors',
    async (_scenario, result) => {
      const repository = createRepository({
        consume: jest.fn<VerificationRepository['consume']>().mockResolvedValue(result),
      });
      const service = createEmailVerificationService({ repository });

      await expect(
        service.verify({ token, requestId: 'id', ipAddress: null, userAgent: null }),
      ).rejects.toEqual(new VerificationTokenError(result));
      expect(repository.consume).toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash: hashVerificationToken(token) }),
      );
    },
  );
});

describe('email verification API handlers and limits', () => {
  const app = { get: () => false };

  function requestMock(body: unknown, ip = '127.0.0.1') {
    return {
      body,
      id: '00000000-0000-4000-8000-000000000001',
      ip,
      method: 'POST',
      path: '/api/v1/auth/email-verification/request',
      originalUrl: '/api/v1/auth/email-verification/request',
      headers: {},
      socket: { remoteAddress: ip },
      app,
      get: () => 'test-agent',
    } as unknown as Request;
  }

  function responseMock() {
    const headers = new Map<string, string>();
    const response = {
      statusCode: 200,
      headersSent: false,
      writableEnded: false,
      body: undefined as unknown,
      setHeader(name: string, value: string) {
        headers.set(name.toLowerCase(), value);
        return response;
      },
      getHeader(name: string) {
        return headers.get(name.toLowerCase());
      },
      status(code: number) {
        response.statusCode = code;
        return response;
      },
      json(body: unknown) {
        response.body = body;
        response.headersSent = true;
        response.writableEnded = true;
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

  it('returns an identical generic 202 for all account eligibility outcomes', async () => {
    const service = createEmailVerificationService({ repository: createRepository() });
    const controller = createEmailVerificationRequestController(service);
    const responses = await Promise.all(
      ['unknown@example.test', 'verified@example.test', 'disabled@example.test'].map((email) =>
        invoke(controller, { email }),
      ),
    );
    expect(responses.map(({ statusCode, body }) => ({ status: statusCode, body }))).toEqual(
      Array(3).fill({ status: 202, body: generic }),
    );
  });

  it('returns deterministic success and invalid/used token responses without exposing tokens', async () => {
    const consume = jest
      .fn<VerificationRepository['consume']>()
      .mockResolvedValueOnce('verified')
      .mockResolvedValueOnce('invalid');
    const service = createEmailVerificationService({
      repository: createRepository({ consume }),
    });
    const controller = createEmailVerificationConsumeController(service);
    const success = await invoke(controller, { token });
    const invalid = await invoke(controller, { token });

    expect(success.statusCode).toBe(200);
    expect(success.body).toEqual({ message: 'Email verified' });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.body).toEqual({
      message: 'Invalid verification token',
      code: 'invalid_or_used_verification_token',
    });
    expect(JSON.stringify([success.body, invalid.body])).not.toContain(token);
  });

  it('enforces per-account request limits with the same generic response', async () => {
    const requestService = jest
      .fn<EmailVerificationService['request']>()
      .mockResolvedValue(undefined);
    const service = createEmailVerificationService({ repository: createRepository() });
    service.request = requestService;
    const controller = createEmailVerificationRequestController(service);
    const [, accountLimit] = createEmailVerificationRequestLimiters();
    const responses = [];
    for (let index = 0; index < 6; index += 1) {
      const req = requestMock({ email: 'same@example.test' });
      const response = responseMock();
      let allowed = false;
      await accountLimit(req, response, () => {
        allowed = true;
      });
      if (allowed) await controller(req, response, () => undefined);
      responses.push(response);
    }
    expect(responses.map((response) => response.statusCode)).toEqual(Array(6).fill(202));
    expect(responses.at(-1)?.body).toEqual(generic);
    expect(requestService).toHaveBeenCalledTimes(5);
  });

  it('enforces per-IP request and verify attempt limits', async () => {
    const [requestIpLimit] = createEmailVerificationRequestLimiters();
    const verifyIpLimit = createEmailVerificationAttemptLimiter();
    for (const limiter of [requestIpLimit, verifyIpLimit]) {
      const responses = [];
      for (let index = 0; index <= 20; index += 1) {
        const response = responseMock();
        let allowed = false;
        await limiter(requestMock({ email: 'person@example.test' }), response, () => {
          allowed = true;
        });
        responses.push({ response, allowed });
      }
      expect(responses.slice(0, 20).every(({ allowed }) => allowed)).toBe(true);
      expect(responses.at(-1)?.allowed).toBe(false);
      expect(responses.at(-1)?.response.statusCode).toBe(429);
    }
  });
});
