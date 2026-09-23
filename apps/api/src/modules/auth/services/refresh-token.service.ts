import type { JwtService } from '../../../config/jwt/jwt.js';
import { fingerprintToken } from '../../../helpers/token-fingerprint.helper.js';

export type RefreshFailureReason =
  | 'INVALID_REFRESH_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'TOKEN_REUSED'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_DELETED';

export type IssuedRefreshRotation = {
  accessToken: string;
  refreshToken: string;
  refreshJti: string;
  refreshExpiresAt: Date;
  expiresIn: number;
};

export type RefreshRotationRepository = {
  rotate(
    input: { sub: string; sid: string; jti: string; tokenHash: string; requestId: string },
    issue: (sessionExpiresAt: Date) => IssuedRefreshRotation,
  ): Promise<
    { status: 'rotated'; result: IssuedRefreshRotation } | { status: 'invalid' | 'reused' }
  >;
  recordInvalidRefresh(input: { requestId: string; reason: RefreshFailureReason }): Promise<void>;
};

export type RefreshService = {
  refresh(input: { refreshToken: string; requestId: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
  }>;
};

export class RefreshError extends Error {
  constructor(readonly code: 'invalidRefreshToken' | 'internal') {
    super(code === 'invalidRefreshToken' ? 'Invalid refresh token' : 'Refresh failed');
    this.name = 'RefreshError';
  }
}

export function createRefreshService(
  repository: RefreshRotationRepository,
  jwt: JwtService,
): RefreshService {
  return {
    async refresh({ refreshToken, requestId }) {
      let claims: { sub: string; sid: string; jti: string };

      try {
        const verifiedRefreshToken = jwt.verifyToken(refreshToken, 'refresh');
        if (verifiedRefreshToken.sid === undefined) throw new Error('Missing session ID');
        claims = {
          sub: verifiedRefreshToken.sub,
          sid: verifiedRefreshToken.sid,
          jti: verifiedRefreshToken.jti,
        };
      } catch {
        return rejectInvalidRefresh(repository, requestId, 'INVALID_REFRESH_TOKEN');
      }

      try {
        const rotation = await repository.rotate(
          {
            sub: claims.sub,
            sid: claims.sid,
            jti: claims.jti,
            tokenHash: fingerprintToken(refreshToken),
            requestId,
          },
          (sessionExpiresAt) => issueRotation(jwt, claims.sub, claims.sid, sessionExpiresAt),
        );

        if (rotation.status !== 'rotated') {
          throw new RefreshError('invalidRefreshToken');
        }

        return {
          accessToken: rotation.result.accessToken,
          refreshToken: rotation.result.refreshToken,
          tokenType: 'Bearer',
          expiresIn: rotation.result.expiresIn,
        };
      } catch (error) {
        if (error instanceof RefreshError) throw error;
        throw new RefreshError('internal');
      }
    },
  };
}

function issueRotation(
  jwt: JwtService,
  sub: string,
  sid: string,
  sessionExpiresAt: Date,
): IssuedRefreshRotation {
  const accessToken = jwt.issueToken({ sub, sid, typ: 'access' });
  let refreshToken = jwt.issueToken({ sub, sid, typ: 'refresh' });
  let verifiedRefreshToken = jwt.verifyToken(refreshToken, 'refresh');
  const sessionExpiresAtSeconds = Math.floor(sessionExpiresAt.getTime() / 1000);

  if (verifiedRefreshToken.exp > sessionExpiresAtSeconds) {
    refreshToken = jwt.issueToken({ sub, sid, typ: 'refresh', expiresAt: sessionExpiresAtSeconds });
    verifiedRefreshToken = jwt.verifyToken(refreshToken, 'refresh');
  }

  const verifiedAccessToken = jwt.verifyToken(accessToken, 'access');
  return {
    accessToken,
    refreshToken,
    refreshJti: verifiedRefreshToken.jti,
    refreshExpiresAt: new Date(verifiedRefreshToken.exp * 1000),
    expiresIn: verifiedAccessToken.exp - verifiedAccessToken.iat,
  };
}

async function rejectInvalidRefresh(
  repository: RefreshRotationRepository,
  requestId: string,
  reason: RefreshFailureReason,
): Promise<never> {
  try {
    await repository.recordInvalidRefresh({ requestId, reason });
  } catch {
    throw new RefreshError('internal');
  }

  throw new RefreshError('invalidRefreshToken');
}
