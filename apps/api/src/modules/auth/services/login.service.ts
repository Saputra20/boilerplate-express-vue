import { randomUUID } from 'node:crypto';
import type { JwtService } from '../../../config/jwt/jwt.js';
import { verifyPassword } from '../../../helpers/password.helper.js';
import { fingerprintToken } from '../../../helpers/token-fingerprint.helper.js';

export type LoginUser = {
  id: string;
  passwordHash: string;
  status: 'active' | 'disabled';
  deletedAt: Date | null;
};

export type LoginFailureReason = 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED' | 'ACCOUNT_DELETED';

export type AuthenticatedSessionInput = {
  sessionId: string;
  userId: string;
  refreshJti: string;
  refreshTokenHash: string;
  expiresAt: Date;
  requestId: string;
};

export type FailedLoginAuditInput = {
  userId: string | null;
  requestId: string;
  reason: LoginFailureReason;
};

export type LoginRepository = {
  findUserByEmail(email: string): Promise<LoginUser | null>;
  createAuthenticatedSession(
    input: AuthenticatedSessionInput,
  ): Promise<'created' | 'accountUnavailable'>;
  createFailedLoginAuditEvent(input: FailedLoginAuditInput): Promise<void>;
};

export type LoginService = {
  login(input: { email: string; password: string; requestId: string }): Promise<LoginResult>;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export class LoginError extends Error {
  constructor(readonly code: 'invalidCredentials' | 'internal') {
    super(code === 'invalidCredentials' ? 'Invalid credentials' : 'Login failed');
    this.name = 'LoginError';
  }
}

export function createLoginService(repository: LoginRepository, jwt: JwtService): LoginService {
  return {
    async login({ email, password, requestId }): Promise<LoginResult> {
      const user = await repository.findUserByEmail(email);

      if (user === null) {
        return rejectLogin(repository, { userId: null, requestId, reason: 'INVALID_CREDENTIALS' });
      }

      const passwordMatches = await verifyPassword(user.passwordHash, password);
      if (!passwordMatches) {
        await rejectLogin(repository, {
          userId: user.id,
          requestId,
          reason: 'INVALID_CREDENTIALS',
        });
      }

      if (user.status !== 'active') {
        await rejectLogin(repository, { userId: user.id, requestId, reason: 'ACCOUNT_DISABLED' });
      }

      if (user.deletedAt !== null) {
        await rejectLogin(repository, { userId: user.id, requestId, reason: 'ACCOUNT_DELETED' });
      }

      const sessionId = randomUUID();
      let accessToken: string;
      let refreshToken: string;
      let accessTokenExpiresAt: number;
      let accessTokenIssuedAt: number;
      let refreshTokenJti: string;
      let refreshTokenExpiresAt: number;

      try {
        accessToken = jwt.issueToken({ sub: user.id, sid: sessionId, typ: 'access' });
        refreshToken = jwt.issueToken({ sub: user.id, sid: sessionId, typ: 'refresh' });
        const verifiedAccessToken = jwt.verifyToken(accessToken, 'access');
        const verifiedRefreshToken = jwt.verifyToken(refreshToken, 'refresh');

        accessTokenExpiresAt = verifiedAccessToken.exp;
        accessTokenIssuedAt = verifiedAccessToken.iat;
        refreshTokenJti = verifiedRefreshToken.jti;
        refreshTokenExpiresAt = verifiedRefreshToken.exp;
      } catch {
        throw new LoginError('internal');
      }

      let persistenceResult: 'created' | 'accountUnavailable';

      try {
        persistenceResult = await repository.createAuthenticatedSession({
          sessionId,
          userId: user.id,
          refreshJti: refreshTokenJti,
          refreshTokenHash: fingerprintToken(refreshToken),
          expiresAt: new Date(refreshTokenExpiresAt * 1000),
          requestId,
        });
      } catch {
        throw new LoginError('internal');
      }

      if (persistenceResult === 'accountUnavailable') {
        return rejectLogin(repository, {
          userId: user.id,
          requestId,
          reason: 'INVALID_CREDENTIALS',
        });
      }

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: accessTokenExpiresAt - accessTokenIssuedAt,
      };
    },
  };
}

async function rejectLogin(
  repository: LoginRepository,
  input: FailedLoginAuditInput,
): Promise<never> {
  try {
    await repository.createFailedLoginAuditEvent(input);
  } catch {
    throw new LoginError('internal');
  }

  throw new LoginError('invalidCredentials');
}
