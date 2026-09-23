import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sign, type SignOptions } from 'jsonwebtoken';
import { createJwt, JwtError, type JwtConfig } from '../src/jwt/index.js';

const issuer = 'app-api';
const audience = 'app-cms';
const userId = randomUUID();
const sessionId = randomUUID();
let directory: string;
let privateKey: string;
let config: JwtConfig;

type TestTokenOptions = SignOptions & {
  omitSubject?: boolean;
  omitJti?: boolean;
  omitExpiration?: boolean;
};

function createSignedToken(
  payload: Record<string, unknown>,
  {
    omitSubject = false,
    omitJti = false,
    omitExpiration = false,
    ...options
  }: TestTokenOptions = {},
): string {
  const defaults: SignOptions = {
    algorithm: 'RS256',
    issuer,
    audience,
  };

  if (!omitSubject) defaults.subject = userId;
  if (!omitJti) defaults.jwtid = randomUUID();
  if (!omitExpiration) defaults.expiresIn = '1h';

  return sign(payload, privateKey, { ...defaults, ...options });
}

describe('JWT foundation', () => {
  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), 'api-jwt-test-'));
    const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
    privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const privateKeyPath = join(directory, 'private.pem');
    const publicKeyPath = join(directory, 'public.pem');

    writeFileSync(privateKeyPath, privateKey);
    writeFileSync(publicKeyPath, publicKey);
    config = {
      privateKeyPath,
      publicKeyPath,
      issuer,
      audience,
      accessTokenExpiresIn: '15m',
      refreshTokenExpiresIn: '7d',
    };
  });

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('issues and verifies typed access and refresh tokens with distinct JTIs', () => {
    const jwt = createJwt(config);
    const accessToken = jwt.issueToken({ sub: userId, typ: 'access', sid: sessionId });
    const refreshToken = jwt.issueToken({ sub: userId, typ: 'refresh' });
    const access = jwt.verifyToken(accessToken, 'access');
    const refresh = jwt.verifyToken(refreshToken, 'refresh');

    expect(access).toMatchObject({ sub: userId, typ: 'access', sid: sessionId });
    expect(refresh).toMatchObject({ sub: userId, typ: 'refresh' });
    expect(access.iat).toEqual(expect.any(Number));
    expect(access.exp).toEqual(expect.any(Number));
    expect(access.jti).toMatch(/^[0-9a-f-]{36}$/);
    expect(access.jti).not.toBe(refresh.jti);
  });

  it('rejects a token verified as the wrong token type', () => {
    const jwt = createJwt(config);
    const accessToken = jwt.issueToken({ sub: userId, typ: 'access' });
    const refreshToken = jwt.issueToken({ sub: userId, typ: 'refresh' });

    expect(() => jwt.verifyToken(accessToken, 'refresh')).toThrow(JwtError);
    expect(() => jwt.verifyToken(refreshToken, 'access')).toThrow(JwtError);
  });

  it.each([
    ['wrong algorithm', () => sign({ typ: 'access' }, 'test-secret', { algorithm: 'HS256' })],
    [
      'invalid signature',
      () => {
        const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;

        return sign({ typ: 'access' }, otherKey, {
          algorithm: 'RS256',
          issuer,
          audience,
          subject: userId,
          jwtid: randomUUID(),
          expiresIn: '1h',
        });
      },
    ],
    ['invalid issuer', () => createSignedToken({ typ: 'access' }, { issuer: 'other-issuer' })],
    [
      'invalid audience',
      () => createSignedToken({ typ: 'access' }, { audience: 'other-audience' }),
    ],
    ['expired token', () => createSignedToken({ typ: 'access' }, { expiresIn: '-1s' })],
    [
      'future nbf',
      () => createSignedToken({ typ: 'access', nbf: Math.floor(Date.now() / 1000) + 60 }),
    ],
  ])('rejects %s', (_scenario, createToken) => {
    const jwt = createJwt(config);

    expect(() => jwt.verifyToken(createToken(), 'access')).toThrow(JwtError);
  });

  it.each([
    ['missing sub', () => createSignedToken({ typ: 'access' }, { omitSubject: true })],
    ['malformed sub', () => createSignedToken({ typ: 'access' }, { subject: 'not-a-uuid' })],
    ['missing jti', () => createSignedToken({ typ: 'access' }, { omitJti: true })],
    ['malformed jti', () => createSignedToken({ typ: 'access' }, { jwtid: 'not-a-uuid' })],
    ['missing typ', () => createSignedToken({})],
    ['unknown typ', () => createSignedToken({ typ: 'other' })],
    ['invalid sid', () => createSignedToken({ typ: 'access', sid: 'not-a-uuid' })],
    ['unknown claim', () => createSignedToken({ typ: 'access', role: 'admin' })],
    ['missing iat', () => createSignedToken({ typ: 'access' }, { noTimestamp: true })],
    ['missing exp', () => createSignedToken({ typ: 'access' }, { omitExpiration: true })],
  ])('rejects %s', (_scenario, createToken) => {
    const jwt = createJwt(config);

    expect(() => jwt.verifyToken(createToken(), 'access')).toThrow(JwtError);
  });

  it('fails safely for invalid configured token lifetimes without leaking configuration', () => {
    const jwt = createJwt({ ...config, accessTokenExpiresIn: 'not-a-duration' });

    expect(() => jwt.issueToken({ sub: userId, typ: 'access' })).toThrow('JWT issuance failed');
    try {
      jwt.issueToken({ sub: userId, typ: 'access' });
    } catch (error) {
      expect(error instanceof Error ? error.message : '').not.toContain('not-a-duration');
    }
  });

  it('fails safely for missing and malformed key material without leaking it', () => {
    const malformedKeyPath = join(directory, 'malformed.pem');
    writeFileSync(malformedKeyPath, 'not-a-private-key');

    for (const privateKeyPath of [join(directory, 'missing.pem'), malformedKeyPath]) {
      expect(() => createJwt({ ...config, privateKeyPath })).toThrow('JWT initialization failed');

      try {
        createJwt({ ...config, privateKeyPath });
      } catch (error) {
        expect(error instanceof Error ? error.message : '').not.toContain(privateKeyPath);
      }
    }
  });

  it('does not leak raw tokens through verification errors', () => {
    const jwt = createJwt(config);
    const token = 'token-do-not-return';

    expect(() => jwt.verifyToken(token, 'access')).toThrow('JWT verification failed');
    try {
      jwt.verifyToken(token, 'access');
    } catch (error) {
      expect(error instanceof Error ? error.message : '').not.toContain(token);
    }
  });
});
