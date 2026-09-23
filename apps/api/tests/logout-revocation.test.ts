import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createAuthRouter } from '../src/modules/auth/v1/auth.router.js';
import { createAccessAuthMiddleware } from '../src/middleware/authentication.middleware.js';
import type { AccessAuthRepository } from '../src/modules/auth/services/access-auth.service.js';
import { createAccessAuthService } from '../src/modules/auth/services/access-auth.service.js';
import {
  createLogoutService,
  type LogoutRepository,
} from '../src/modules/auth/services/logout.service.js';
import { createJwt, type JwtService } from '../src/config/jwt/jwt.js';
import { createLogging } from '../src/config/logger/logger.js';

class MemoryAccessAuthRepository implements AccessAuthRepository {
  revoked = false;

  async findPrincipal({
    sub,
    sid,
    jti,
    allowRevoked,
  }: Parameters<AccessAuthRepository['findPrincipal']>[0]) {
    if (this.revoked && !allowRevoked) return null;
    return { sub, sid, jti, revoked: this.revoked };
  }
}

class MemoryLogoutRepository implements LogoutRepository {
  currentCalls: string[] = [];
  allCalls: string[] = [];
  failureScopes: Array<'current' | 'all'> = [];

  async logoutCurrent({
    principal,
  }: Parameters<LogoutRepository['logoutCurrent']>[0]): Promise<void> {
    this.currentCalls.push(principal.sid);
  }

  async logoutAll({ principal }: Parameters<LogoutRepository['logoutAll']>[0]): Promise<void> {
    this.allCalls.push(principal.sub);
  }

  async recordFailure({ scope }: Parameters<LogoutRepository['recordFailure']>[0]): Promise<void> {
    this.failureScopes.push(scope);
  }
}

function createJwtService(directory: string): JwtService {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKeyPath = join(directory, 'private.pem');
  const publicKeyPath = join(directory, 'public.pem');
  writeFileSync(privateKeyPath, privateKey.export({ format: 'pem', type: 'pkcs1' }));
  writeFileSync(publicKeyPath, publicKey.export({ format: 'pem', type: 'pkcs1' }));
  return createJwt({
    privateKeyPath,
    publicKeyPath,
    issuer: 'test-issuer',
    audience: 'test-audience',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
  });
}

describe('logout and revocation routes', () => {
  it('logs out only current session and permits idempotent repeated state transition', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-logout-test-'));
    const logging = createLogging({ directory, stderr: null });
    const jwt = createJwtService(directory);
    const authRepository = new MemoryAccessAuthRepository();
    const logoutRepository = new MemoryLogoutRepository();
    const sub = randomUUID();
    const sid = randomUUID();
    const token = jwt.issueToken({ sub, sid, typ: 'access' });
    const app = createApp({
      logging,
      security: { corsOrigins: ['http://localhost:5173'] },
      routers: {
        authV1: createAuthRouter({
          accessAuthService: createAccessAuthService(authRepository, jwt),
          logoutService: createLogoutService(logoutRepository),
        }),
      },
    });

    try {
      const first = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      authRepository.revoked = true;
      const repeated = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      const all = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${token}`);

      expect(first.status).toBe(204);
      expect(repeated.status).toBe(204);
      expect(all.status).toBe(204);
      expect(logoutRepository.currentCalls).toEqual([sid, sid]);
      expect(logoutRepository.allCalls).toEqual([sub]);
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects absent, malformed, refresh, and revoked access credentials outside logout scope', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-logout-auth-test-'));
    const logging = createLogging({ directory, stderr: null });
    const jwt = createJwtService(directory);
    const authRepository = new MemoryAccessAuthRepository();
    const logoutRepository = new MemoryLogoutRepository();
    const sub = randomUUID();
    const sid = randomUUID();
    const app = createApp({
      logging,
      security: { corsOrigins: ['http://localhost:5173'] },
      routers: {
        authV1: createAuthRouter({
          accessAuthService: createAccessAuthService(authRepository, jwt),
          logoutService: createLogoutService(logoutRepository),
        }),
      },
    });

    try {
      const missing = await request(app).post('/api/v1/auth/logout');
      const malformed = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer nope nope');
      const refresh = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${jwt.issueToken({ sub, sid, typ: 'refresh' })}`);

      expect(missing.status).toBe(401);
      expect(malformed.status).toBe(401);
      expect(refresh.status).toBe(401);
      expect(logoutRepository.currentCalls).toEqual([]);
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects revoked authentication through normal protected middleware', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-logout-protected-test-'));
    const jwt = createJwtService(directory);
    const authRepository = new MemoryAccessAuthRepository();
    const sub = randomUUID();
    const sid = randomUUID();
    const app = express();
    app.get(
      '/protected',
      createAccessAuthMiddleware(createAccessAuthService(authRepository, jwt)),
      (_request, response) => {
        response.status(204).send();
      },
    );

    try {
      const token = jwt.issueToken({ sub, sid, typ: 'access' });
      const active = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
      authRepository.revoked = true;
      const revoked = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);

      expect(active.status).toBe(204);
      expect(revoked.status).toBe(401);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
