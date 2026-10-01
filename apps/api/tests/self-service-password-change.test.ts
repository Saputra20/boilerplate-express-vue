import express from 'express';
import type { Express } from 'express';
import request from 'supertest';
import {
  AccessAuthError,
  type AccessAuthService,
} from '../src/modules/auth/services/access-auth.service.js';
import { createAuthRouter } from '../src/modules/auth/v1/auth.router.js';
import type { SelfServicePasswordChangeService } from '../src/modules/auth/services/self-service-password-change.service.js';
import {
  createSelfServicePasswordChangeService,
  type SelfServicePasswordChangeRepository,
} from '../src/modules/auth/services/self-service-password-change.service.js';
import { hashPassword, isValidPassword, verifyPassword } from '../src/helpers/password.helper.js';

async function withServer<T>(
  app: Express,
  run: (server: ReturnType<Express['listen']>) => Promise<T>,
) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  try {
    return await run(server);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function accessAuth(mustChangePassword = false): AccessAuthService {
  return {
    authenticate: async () => {
      if (mustChangePassword) {
        return {
          sub: 'user-id',
          sid: 'session-id',
          jti: 'jti-id',
          exp: Math.floor(Date.now() / 1000) + 900,
          revoked: false,
          mustChangePassword: true,
        };
      }
      return {
        sub: 'user-id',
        sid: 'session-id',
        jti: 'jti-id',
        exp: Math.floor(Date.now() / 1000) + 900,
        revoked: false,
        mustChangePassword: false,
      };
    },
  };
}

function appFor(
  service: SelfServicePasswordChangeService,
  auth: AccessAuthService = accessAuth(),
): Express {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/v1/auth',
    createAuthRouter({ accessAuthService: auth, selfServicePasswordChangeService: service }),
  );
  return app;
}

describe('authenticated self-service password change endpoint', () => {
  const input = {
    currentPassword: 'current password long enough',
    newPassword: 'replacement password long enough',
  };

  it('requires bearer authentication and returns a generic 401 for invalid authentication', async () => {
    const service: SelfServicePasswordChangeService = { change: async () => 'changed' };
    const auth: AccessAuthService = {
      authenticate: async () => {
        throw new AccessAuthError();
      },
    };

    await withServer(appFor(service, auth), async (server) => {
      const missing = await request(server)
        .post('/api/v1/auth/change-password/self-service')
        .send(input);
      const invalid = await request(server)
        .post('/api/v1/auth/change-password/self-service')
        .set('Authorization', 'Bearer invalid')
        .send(input);

      expect(missing.status).toBe(401);
      expect(missing.body).toEqual({ message: 'Invalid authentication' });
      expect(invalid.status).toBe(401);
      expect(invalid.body).toEqual({ message: 'Invalid authentication' });
    });
  });

  it('uses the authenticated principal and returns 204 without issuing tokens', async () => {
    let received: unknown;
    const service: SelfServicePasswordChangeService = {
      change: async (value) => {
        received = value;
        return 'changed';
      },
    };

    await withServer(appFor(service), async (server) => {
      const response = await request(server)
        .post('/api/v1/auth/change-password/self-service')
        .set('Authorization', 'Bearer valid')
        .send(input);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(received).toMatchObject({
        ...input,
        userId: 'user-id',
        sessionId: 'session-id',
      });
      expect(response.headers['content-type']).toBeUndefined();
    });
  });

  it('blocks a mandatory-change principal before the service runs', async () => {
    let calls = 0;
    const service: SelfServicePasswordChangeService = {
      change: async () => {
        calls += 1;
        return 'changed';
      },
    };

    await withServer(appFor(service, accessAuth(true)), async (server) => {
      const response = await request(server)
        .post('/api/v1/auth/change-password/self-service')
        .set('Authorization', 'Bearer valid')
        .send(input);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('password_change_required');
      expect(calls).toBe(0);
    });
  });

  it('rejects malformed and extra request fields', async () => {
    let calls = 0;
    const service: SelfServicePasswordChangeService = {
      change: async () => {
        calls += 1;
        return 'changed';
      },
    };

    await withServer(appFor(service), async (server) => {
      const extra = await request(server)
        .post('/api/v1/auth/change-password/self-service')
        .set('Authorization', 'Bearer valid')
        .send({ ...input, userId: 'attacker-id' });
      const missing = await request(server)
        .post('/api/v1/auth/change-password/self-service')
        .set('Authorization', 'Bearer valid')
        .send({ currentPassword: input.currentPassword });

      expect(extra.status).toBe(400);
      expect(extra.body).toEqual({ message: 'Bad request' });
      expect(missing.status).toBe(400);
      expect(missing.body).toEqual({ message: 'Bad request' });
      expect(calls).toBe(0);
    });
  });

  it.each([
    ['invalid_current_password', 400],
    ['password_policy_violation', 400],
    ['password_unchanged', 400],
    ['invalid_authentication', 401],
    ['password_change_required', 403],
  ] as const)('maps %s to its documented status and code', async (result, status) => {
    const service: SelfServicePasswordChangeService = { change: async () => result };

    await withServer(appFor(service), async (server) => {
      const response = await request(server)
        .post('/api/v1/auth/change-password/self-service')
        .set('Authorization', 'Bearer valid')
        .send(input);

      expect(response.status).toBe(status);
      if (result === 'invalid_authentication') {
        expect(response.body).toEqual({ message: 'Invalid authentication' });
      } else {
        expect(response.body.code).toBe(result);
      }
    });
  });

  it('limits attempts to twenty requests per IP in fifteen minutes', async () => {
    let calls = 0;
    const service: SelfServicePasswordChangeService = {
      change: async () => {
        calls += 1;
        return 'changed';
      },
    };

    await withServer(appFor(service), async (server) => {
      const responses = [];
      for (let index = 0; index < 21; index += 1) {
        responses.push(
          await request(server)
            .post('/api/v1/auth/change-password/self-service')
            .set('Authorization', 'Bearer valid')
            .send(input),
        );
      }

      expect(responses.slice(0, 20).every((response) => response.status === 204)).toBe(true);
      expect(responses[20]?.status).toBe(429);
      expect(responses[20]?.body).toEqual({ message: 'Too many requests' });
      expect(calls).toBe(20);
    });
  });
});

describe('self-service password change service', () => {
  it('reuses the canonical password policy and does not call storage for invalid new passwords', async () => {
    let calls = 0;
    const repository: SelfServicePasswordChangeRepository = {
      change: async () => {
        calls += 1;
        return 'changed';
      },
      recordInvalidCurrentPassword: async () => undefined,
    };
    const service = createSelfServicePasswordChangeService(repository);

    await expect(
      service.change({
        userId: 'user-id',
        sessionId: 'session-id',
        currentPassword: 'current password',
        newPassword: 'short',
        requestId: 'request-id',
        ipAddress: null,
        userAgent: null,
      }),
    ).resolves.toBe('password_policy_violation');
    expect(calls).toBe(0);
    expect(isValidPassword('😀'.repeat(12))).toBe(true);
    expect(isValidPassword('😀'.repeat(11))).toBe(false);
  });

  it('verifies current password before hashing and treats failed-attempt audit as best-effort', async () => {
    const currentPassword = 'current password for the service';
    const currentHash = await hashPassword(currentPassword);
    let newHash = '';
    const repository: SelfServicePasswordChangeRepository = {
      async change(input) {
        const result = await input.verifyAndHash(currentHash);
        if (result.status !== 'valid') return 'invalid_current_password';
        newHash = result.passwordHash;
        return 'changed';
      },
      recordInvalidCurrentPassword: async () => {
        throw new Error('audit unavailable');
      },
    };
    const service = createSelfServicePasswordChangeService(repository);
    const input = {
      userId: 'user-id',
      sessionId: 'session-id',
      currentPassword,
      newPassword: 'replacement password for the service',
      requestId: 'request-id',
      ipAddress: null,
      userAgent: null,
    };

    await expect(service.change(input)).resolves.toBe('changed');
    expect(newHash).not.toBe(currentHash);
    expect(await verifyPassword(newHash, input.newPassword)).toBe(true);
    await expect(
      service.change({ ...input, currentPassword: 'wrong current password' }),
    ).resolves.toBe('invalid_current_password');
  });
});
