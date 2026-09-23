import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  createLoginService,
  LoginError,
  type AuthenticatedSessionInput,
  type FailedLoginAuditInput,
  type LoginRepository,
  type LoginService,
  type LoginUser,
} from '../src/modules/auth/services/login.service.js';
import { createJwt, type JwtService } from '../src/config/jwt/jwt.js';
import { createLogging } from '../src/config/logger/logger.js';
import { hashPassword } from '../src/helpers/password.helper.js';

const password = 'correct horse battery staple';
const origin = 'http://localhost:5173';
const authenticationFailureCases: ReadonlyArray<
  [string, LoginUser['status'] | null, FailedLoginAuditInput['reason']]
> = [
  ['unknown user', null, 'INVALID_CREDENTIALS'],
  ['wrong password', 'active', 'INVALID_CREDENTIALS'],
  ['disabled user', 'disabled', 'ACCOUNT_DISABLED'],
  ['soft-deleted user', 'active', 'ACCOUNT_DELETED'],
];

type SuccessfulAudit = {
  eventType: 'auth.login.succeeded';
  userId: string;
  sessionId: string;
  requestId: string;
};

class MemoryLoginRepository implements LoginRepository {
  readonly sessions: AuthenticatedSessionInput[] = [];
  readonly successfulAudits: SuccessfulAudit[] = [];
  readonly failedAudits: FailedLoginAuditInput[] = [];
  failAuthenticatedSession = false;
  failFailedAudit = false;
  accountUnavailableDuringPersistence = false;

  constructor(private readonly user: LoginUser | null) {}

  async findUserByEmail(): Promise<LoginUser | null> {
    return this.user;
  }

  async createAuthenticatedSession(
    input: AuthenticatedSessionInput,
  ): Promise<'created' | 'accountUnavailable'> {
    if (this.failAuthenticatedSession) throw new Error('database failure');
    if (this.accountUnavailableDuringPersistence) return 'accountUnavailable';

    this.sessions.push(input);
    this.successfulAudits.push({
      eventType: 'auth.login.succeeded',
      userId: input.userId,
      sessionId: input.sessionId,
      requestId: input.requestId,
    });
    return 'created';
  }

  async createFailedLoginAuditEvent(input: FailedLoginAuditInput): Promise<void> {
    if (this.failFailedAudit) throw new Error('audit failure');

    this.failedAudits.push(input);
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

async function createActiveUser(): Promise<LoginUser> {
  return {
    id: randomUUID(),
    passwordHash: await hashPassword(password),
    status: 'active',
    deletedAt: null,
  };
}

function createTestApp(loginService: LoginService) {
  const directory = mkdtempSync(join(tmpdir(), 'api-login-test-'));
  const logging = createLogging({ directory, stderr: null });
  const app = createApp(logging, { corsOrigins: [origin] }, loginService);

  return { app, directory, logging };
}

describe('login and session', () => {
  it('issues typed tokens and persists only session, refresh digest, and audit metadata', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-login-jwt-'));
    const jwt = createJwtService(directory);
    const user = await createActiveUser();
    const repository = new MemoryLoginRepository(user);
    const loginService = createLoginService(repository, jwt);
    const requestId = randomUUID();

    try {
      const result = await loginService.login({
        email: 'USER@example.com'.toLowerCase(),
        password,
        requestId,
      });
      const accessToken = jwt.verifyToken(result.accessToken, 'access');
      const refreshToken = jwt.verifyToken(result.refreshToken, 'refresh');

      expect(Object.keys(result)).toEqual([
        'accessToken',
        'refreshToken',
        'tokenType',
        'expiresIn',
      ]);
      expect(result).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
      expect(accessToken.sub).toBe(user.id);
      expect(accessToken.sid).toBeDefined();
      expect(refreshToken.sub).toBe(user.id);
      expect(refreshToken.sid).toBe(accessToken.sid);
      expect(refreshToken.jti).not.toBe(accessToken.jti);
      expect(repository.sessions).toHaveLength(1);
      expect(repository.sessions[0]).toMatchObject({
        sessionId: accessToken.sid,
        userId: user.id,
        refreshJti: refreshToken.jti,
        requestId,
      });
      expect(repository.sessions[0].expiresAt.getTime()).toBe(refreshToken.exp * 1000);
      expect(repository.sessions[0].refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(repository.sessions[0].refreshTokenHash).not.toBe(result.refreshToken);
      expect(JSON.stringify(repository)).not.toContain(password);
      expect(JSON.stringify(repository)).not.toContain(result.refreshToken);
      expect(JSON.stringify(repository)).not.toContain(result.accessToken);
      expect(repository.successfulAudits).toEqual([
        {
          eventType: 'auth.login.succeeded',
          userId: user.id,
          sessionId: accessToken.sid,
          requestId,
        },
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it.each(authenticationFailureCases)(
    'returns the same public 401 for %s',
    async (_scenario, status, reason) => {
      const directory = mkdtempSync(join(tmpdir(), 'api-login-failure-'));
      const jwt = createJwtService(directory);
      const user = await createActiveUser();
      const subject =
        status === null
          ? null
          : { ...user, status, deletedAt: reason === 'ACCOUNT_DELETED' ? new Date() : null };
      const repository = new MemoryLoginRepository(subject);
      const {
        app,
        logging,
        directory: loggingDirectory,
      } = createTestApp(createLoginService(repository, jwt));

      try {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'user@example.com',
            password:
              reason === 'INVALID_CREDENTIALS' && status ? 'wrong password value' : password,
          });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Invalid credentials' });
        expect(repository.sessions).toHaveLength(0);
        expect(repository.failedAudits).toHaveLength(1);
        expect(repository.failedAudits[0].reason).toBe(reason);
      } finally {
        logging.close();
        rmSync(loggingDirectory, { recursive: true, force: true });
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it('validates strict request input, lowercases email, and preserves password whitespace', async () => {
    let received: { email: string; password: string; requestId: string } | undefined;
    const loginService: LoginService = {
      async login(input) {
        received = input;
        return {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenType: 'Bearer',
          expiresIn: 900,
        };
      },
    };
    const { app, logging, directory } = createTestApp(loginService);

    try {
      const success = await request(app).post('/auth/login').send({
        email: 'USER@example.com',
        password: '  unchanged password  ',
      });
      const malformed = await request(app).post('/auth/login').send({
        email: 'user@example.com',
        password,
        extra: true,
      });

      expect(success.status).toBe(200);
      expect(received).toMatchObject({
        email: 'user@example.com',
        password: '  unchanged password  ',
      });
      expect(received?.requestId).toMatch(/^[0-9a-f-]{36}$/);
      expect(malformed.status).toBe(400);
      expect(malformed.body).toEqual({ message: 'Bad request' });
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('returns no token response or partial state when persistence or failed-audit writes fail', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-login-atomic-'));
    const jwt = createJwtService(directory);
    const user = await createActiveUser();
    const repository = new MemoryLoginRepository(user);
    repository.failAuthenticatedSession = true;
    const {
      app,
      logging,
      directory: loggingDirectory,
    } = createTestApp(createLoginService(repository, jwt));

    try {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Internal server error' });
      expect(repository.sessions).toHaveLength(0);
      expect(repository.successfulAudits).toHaveLength(0);
      expect(JSON.stringify(response.body)).not.toContain('token');

      repository.failAuthenticatedSession = false;
      repository.failFailedAudit = true;
      const failedAuditResponse = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'wrong password value' });

      expect(failedAuditResponse.status).toBe(500);
      expect(failedAuditResponse.body).toEqual({ message: 'Internal server error' });
    } finally {
      logging.close();
      rmSync(loggingDirectory, { recursive: true, force: true });
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects login when account eligibility changes before session persistence', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-login-eligibility-'));
    const jwt = createJwtService(directory);
    const repository = new MemoryLoginRepository(await createActiveUser());
    repository.accountUnavailableDuringPersistence = true;
    const {
      app,
      logging,
      directory: loggingDirectory,
    } = createTestApp(createLoginService(repository, jwt));

    try {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Invalid credentials' });
      expect(repository.sessions).toHaveLength(0);
      expect(repository.successfulAudits).toHaveLength(0);
      expect(repository.failedAudits).toEqual([
        expect.objectContaining({ reason: 'INVALID_CREDENTIALS' }),
      ]);
    } finally {
      logging.close();
      rmSync(loggingDirectory, { recursive: true, force: true });
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('does not write supplied credentials or tokens to application logs', async () => {
    const loginService: LoginService = {
      async login() {
        return {
          accessToken: 'access-token-not-loggable',
          refreshToken: 'refresh-token-not-loggable',
          tokenType: 'Bearer',
          expiresIn: 900,
        };
      },
    };
    const { app, logging, directory } = createTestApp(loginService);
    const suppliedPassword = 'password-not-loggable';

    try {
      await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password: suppliedPassword });
      const log = readFileSync(join(directory, 'application.log'), 'utf8');

      expect(log).not.toContain(suppliedPassword);
      expect(log).not.toContain('access-token-not-loggable');
      expect(log).not.toContain('refresh-token-not-loggable');
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('sanitizes internal login errors', async () => {
    const loginService: LoginService = {
      async login() {
        throw new LoginError('internal');
      },
    };
    const { app, logging, directory } = createTestApp(loginService);

    try {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Internal server error' });
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
