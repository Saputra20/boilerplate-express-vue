import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  createRefreshService,
  type IssuedRefreshRotation,
  type RefreshFailureReason,
  type RefreshRotationRepository,
  type RefreshService,
} from '../src/auth/refresh-service.js';
import { createJwt, type JwtService } from '../src/jwt/index.js';
import { createLogging } from '../src/logging/index.js';

const origin = 'http://localhost:5173';

class MemoryRefreshRepository implements RefreshRotationRepository {
  readonly invalidReasons: RefreshFailureReason[] = [];
  readonly rotations: Array<
    Pick<IssuedRefreshRotation, 'refreshJti' | 'refreshExpiresAt' | 'expiresIn'>
  > = [];
  readonly reuseSessions: string[] = [];
  private consumed = false;

  constructor(
    private readonly sessionExpiresAt: Date,
    private readonly expected: { sub: string; sid: string; jti: string },
  ) {}

  async rotate(
    input: { sub: string; sid: string; jti: string },
    issue: (expiresAt: Date) => IssuedRefreshRotation,
  ) {
    if (
      input.sub !== this.expected.sub ||
      input.sid !== this.expected.sid ||
      input.jti !== this.expected.jti
    ) {
      return { status: 'invalid' } as const;
    }

    if (this.consumed) {
      this.reuseSessions.push(input.sid);
      return { status: 'reused' } as const;
    }

    this.consumed = true;
    const result = issue(this.sessionExpiresAt);
    this.rotations.push({
      refreshJti: result.refreshJti,
      refreshExpiresAt: result.refreshExpiresAt,
      expiresIn: result.expiresIn,
    });
    return { status: 'rotated', result } as const;
  }

  async recordInvalidRefresh(input: {
    requestId: string;
    reason: RefreshFailureReason;
  }): Promise<void> {
    this.invalidReasons.push(input.reason);
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
    issuer: 'api-test',
    audience: 'cms-test',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '30d',
  });
}

function createTestApp(refreshService: RefreshService) {
  const directory = mkdtempSync(join(tmpdir(), 'api-refresh-test-'));
  const logging = createLogging({ directory, stderr: null });
  return {
    app: createApp(logging, { corsOrigins: [origin] }, undefined, refreshService),
    directory,
    logging,
  };
}

describe('refresh token rotation', () => {
  it('rotates once with same principal/session, fresh JTIs, and capped refresh expiry', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-refresh-jwt-'));
    const jwt = createJwtService(directory);
    const sub = randomUUID();
    const sid = randomUUID();
    const oldRefreshToken = jwt.issueToken({ sub, sid, typ: 'refresh' });
    const oldClaims = jwt.verifyToken(oldRefreshToken, 'refresh');
    const sessionExpiresAt = new Date((oldClaims.iat + 300) * 1000);
    const repository = new MemoryRefreshRepository(sessionExpiresAt, {
      sub,
      sid,
      jti: oldClaims.jti,
    });
    const refreshService = createRefreshService(repository, jwt);

    try {
      const result = await refreshService.refresh({
        refreshToken: oldRefreshToken,
        requestId: randomUUID(),
      });
      const accessClaims = jwt.verifyToken(result.accessToken, 'access');
      const refreshClaims = jwt.verifyToken(result.refreshToken, 'refresh');

      expect(result).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
      expect(accessClaims).toMatchObject({ sub, sid, typ: 'access' });
      expect(refreshClaims).toMatchObject({ sub, sid, typ: 'refresh' });
      expect(accessClaims.jti).not.toBe(oldClaims.jti);
      expect(refreshClaims.jti).not.toBe(oldClaims.jti);
      expect(refreshClaims.exp).toBeLessThanOrEqual(Math.floor(sessionExpiresAt.getTime() / 1000));
      expect(repository.rotations).toHaveLength(1);
      expect(JSON.stringify(repository)).not.toContain(oldRefreshToken);
      expect(JSON.stringify(repository)).not.toContain(result.refreshToken);
      expect(JSON.stringify(repository)).not.toContain(result.accessToken);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects second and concurrent use without minting another replacement', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-refresh-reuse-'));
    const jwt = createJwtService(directory);
    const sub = randomUUID();
    const sid = randomUUID();
    const token = jwt.issueToken({ sub, sid, typ: 'refresh' });
    const claims = jwt.verifyToken(token, 'refresh');
    const repository = new MemoryRefreshRepository(new Date((claims.iat + 600) * 1000), {
      sub,
      sid,
      jti: claims.jti,
    });
    const refreshService = createRefreshService(repository, jwt);

    try {
      const [first, second] = await Promise.allSettled([
        refreshService.refresh({ refreshToken: token, requestId: randomUUID() }),
        refreshService.refresh({ refreshToken: token, requestId: randomUUID() }),
      ]);

      expect([first, second].filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect([first, second].filter((result) => result.status === 'rejected')).toHaveLength(1);
      expect(repository.rotations).toHaveLength(1);
      expect(repository.reuseSessions).toEqual([sid]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('returns generic route failures for malformed, access, and reused tokens', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-refresh-route-'));
    const jwt = createJwtService(directory);
    const sub = randomUUID();
    const sid = randomUUID();
    const refreshToken = jwt.issueToken({ sub, sid, typ: 'refresh' });
    const refreshClaims = jwt.verifyToken(refreshToken, 'refresh');
    const repository = new MemoryRefreshRepository(new Date((refreshClaims.iat + 600) * 1000), {
      sub,
      sid,
      jti: refreshClaims.jti,
    });
    const {
      app,
      logging,
      directory: loggingDirectory,
    } = createTestApp(createRefreshService(repository, jwt));

    try {
      const malformed = await request(app).post('/auth/refresh').send({});
      const access = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: jwt.issueToken({ sub, sid, typ: 'access' }) });
      const success = await request(app).post('/auth/refresh').send({ refreshToken });
      const reused = await request(app).post('/auth/refresh').send({ refreshToken });

      expect(malformed.status).toBe(400);
      expect(malformed.body).toEqual({ message: 'Bad request' });
      expect(access.status).toBe(401);
      expect(access.body).toEqual({ message: 'Invalid refresh token' });
      expect(success.status).toBe(200);
      expect(Object.keys(success.body)).toEqual([
        'accessToken',
        'refreshToken',
        'tokenType',
        'expiresIn',
      ]);
      expect(reused.status).toBe(401);
      expect(reused.body).toEqual({ message: 'Invalid refresh token' });
    } finally {
      logging.close();
      rmSync(loggingDirectory, { recursive: true, force: true });
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
