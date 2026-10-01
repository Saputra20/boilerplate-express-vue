import type { Server } from 'node:http';
import express from 'express';
import type { Express } from 'express';
import request from 'supertest';
import type { AccessAuthService } from '../src/modules/auth/services/access-auth.service.js';
import {
  createPasswordChangeService,
  type PasswordChangeResult,
  type PasswordChangeRepository,
} from '../src/modules/auth/services/password-change.service.js';
import { createAccessAuthMiddleware } from '../src/middleware/authentication.middleware.js';
import { createPasswordChangeController } from '../src/modules/auth/v1/controllers/password-change.controller.js';
import { passwordChangeSchema } from '../src/modules/auth/v1/validation/password-change.validation.js';
import { createAuthRouter } from '../src/modules/auth/v1/auth.router.js';
import { hashPassword, isValidPassword } from '../src/helpers/password.helper.js';

async function withServer<T>(app: Express, run: (server: Server) => Promise<T>): Promise<T> {
  const server = app.listen(0);
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

describe('authenticated first-login password change', () => {
  it('requires exactly currentPassword and newPassword strings', () => {
    expect(passwordChangeSchema.safeParse({ currentPassword: 'a', newPassword: 'b' }).success).toBe(
      true,
    );
    expect(
      passwordChangeSchema.safeParse({ currentPassword: 'a', newPassword: 'b', confirm: 'b' })
        .success,
    ).toBe(false);
    expect(passwordChangeSchema.safeParse({ currentPassword: 1, newPassword: 'b' }).success).toBe(
      false,
    );
  });

  it('rejects invalid-length passwords and verifies the current password before unchanged checks', async () => {
    const base = {
      userId: 'user-id',
      sessionId: 'session-id',
      currentPassword: '0123456789ab',
      requestId: 'request-id',
      ipAddress: null,
      userAgent: null,
    };
    const currentHash = await hashPassword(base.currentPassword);
    const repository: PasswordChangeRepository = {
      change: async (input) => {
        const result = await input.verifyAndHash(currentHash);
        return result.status === 'unchanged' ? 'password_unchanged' : 'invalid_current_password';
      },
      recordInvalidCurrentPassword: async () => undefined,
    };
    const service = createPasswordChangeService(repository);

    await expect(service.change({ ...base, newPassword: 'short' })).resolves.toBe(
      'password_policy_violation',
    );
    await expect(service.change({ ...base, newPassword: base.currentPassword })).resolves.toBe(
      'password_unchanged',
    );
    expect(isValidPassword(' 0123456789a')).toBe(true);
  });

  it('applies the shared 12–128 Unicode code-point policy without trimming', () => {
    expect(isValidPassword('a'.repeat(11))).toBe(false);
    expect(isValidPassword('a'.repeat(12))).toBe(true);
    expect(isValidPassword('a'.repeat(128))).toBe(true);
    expect(isValidPassword('a'.repeat(129))).toBe(false);
    expect(isValidPassword('😀'.repeat(12))).toBe(true);
    expect(isValidPassword('😀'.repeat(11))).toBe(false);
    expect(isValidPassword(' 0123456789a')).toBe(true);
  });

  it('verifies current password, hashes the new value, and records invalid-current attempts best-effort', async () => {
    const currentPassword = 'existing password with enough chars';
    const currentHash = await hashPassword(currentPassword);
    let newHash = '';
    let failures = 0;
    const repository: PasswordChangeRepository = {
      async change(input) {
        const result = await input.verifyAndHash(currentHash);
        if (result.status === 'unchanged') return 'password_unchanged';
        if (result.status !== 'valid') return 'invalid_current_password';
        newHash = result.passwordHash;
        return 'changed';
      },
      async recordInvalidCurrentPassword() {
        failures += 1;
        throw new Error('audit storage unavailable');
      },
    };
    const service = createPasswordChangeService(repository);
    const base = {
      userId: 'user-id',
      sessionId: 'session-id',
      currentPassword,
      requestId: 'request-id',
      ipAddress: null,
      userAgent: null,
    };

    await expect(
      service.change({ ...base, newPassword: 'new password with enough chars' }),
    ).resolves.toBe('changed');
    expect(newHash).not.toBe(currentHash);
    await expect(
      service.change({
        ...base,
        currentPassword: 'wrong password',
        newPassword: 'new password with enough chars',
      }),
    ).resolves.toBe('invalid_current_password');
    expect(failures).toBe(1);
  });

  it('allows change while blocking normal routes for the mandatory-change principal', async () => {
    const accessAuthService: AccessAuthService = {
      authenticate: async () => ({
        sub: 'user-id',
        sid: 'session-id',
        jti: 'jti-id',
        exp: Math.floor(Date.now() / 1000) + 900,
        revoked: false,
        mustChangePassword: true,
      }),
    };
    const service = {
      change: async () => 'changed' as const,
    };
    const router = createAuthRouter({ accessAuthService, passwordChangeService: service });
    const app = express();
    app.use(express.json());
    app.use('/api/v1/auth', router);
    app.post('/protected', createAccessAuthMiddleware(accessAuthService), (_request, response) =>
      response.status(204).end(),
    );

    await withServer(app, async (server) => {
      const change = await request(server)
        .post('/api/v1/auth/change-password')
        .set('Authorization', 'Bearer valid')
        .send({ currentPassword: 'current value', newPassword: 'new password value' });
      const blocked = await request(server).post('/protected').set('Authorization', 'Bearer valid');

      expect(change.status).toBe(204);
      expect(blocked.status).toBe(403);
      expect(blocked.body.code).toBe('password_change_required');
    });
  });

  it('maps stable service errors to their documented status and code', async () => {
    const accessAuthService: AccessAuthService = {
      authenticate: async () => ({
        sub: 'user-id',
        sid: 'session-id',
        jti: 'jti-id',
        exp: 1,
        revoked: false,
        mustChangePassword: true,
      }),
    };
    const createApp = (result: PasswordChangeResult) => {
      const app = express();
      app.use(express.json());
      app.post(
        '/change',
        createAccessAuthMiddleware(accessAuthService, { allowMustChangePassword: true }),
        createPasswordChangeController({ change: async () => result }),
      );
      return app;
    };
    await withServer(createApp('not_required'), async (server) => {
      const response = await request(server)
        .post('/change')
        .set('Authorization', 'Bearer valid')
        .send({ currentPassword: 'current value', newPassword: 'new password value' });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('password_change_not_required');
    });
  });

  it('limits authenticated change attempts to twenty per source IP in fifteen minutes', async () => {
    let calls = 0;
    const accessAuthService: AccessAuthService = {
      authenticate: async () => ({
        sub: 'user-id',
        sid: 'session-id',
        jti: 'jti-id',
        exp: 1,
        revoked: false,
        mustChangePassword: true,
      }),
    };
    const router = createAuthRouter({
      accessAuthService,
      passwordChangeService: {
        change: async () => {
          calls += 1;
          return 'changed';
        },
      },
    });
    const app = express();
    app.use(express.json());
    app.use('/api/v1/auth', router);
    await withServer(app, async (server) => {
      const results = [];
      for (let index = 0; index < 21; index += 1) {
        results.push(
          await request(server)
            .post('/api/v1/auth/change-password')
            .set('Authorization', 'Bearer valid')
            .send({ currentPassword: 'current value', newPassword: 'new password value' }),
        );
      }

      expect(results.slice(0, 20).every((response) => response.status === 204)).toBe(true);
      expect(results[20]?.status).toBe(429);
      expect(results[20]?.body).toEqual({ message: 'Too many requests' });
      expect(calls).toBe(20);
    });
  });
});
