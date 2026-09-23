import type { JwtService } from '../jwt/index.js';

export type AccessPrincipal = {
  sub: string;
  sid: string;
  jti: string;
  exp: number;
  revoked: boolean;
};

type StoredAccessPrincipal = Omit<AccessPrincipal, 'exp'>;

export type AccessAuthRepository = {
  findPrincipal(input: {
    sub: string;
    sid: string;
    jti: string;
    allowRevoked: boolean;
  }): Promise<StoredAccessPrincipal | null>;
};

export type AccessAuthService = {
  authenticate(token: string, options?: { allowRevoked?: boolean }): Promise<AccessPrincipal>;
};

export class AccessAuthError extends Error {
  constructor() {
    super('Invalid authentication');
    this.name = 'AccessAuthError';
  }
}

export function createAccessAuthService(
  repository: AccessAuthRepository,
  jwt: JwtService,
): AccessAuthService {
  return {
    async authenticate(token, { allowRevoked = false } = {}) {
      try {
        const claims = jwt.verifyToken(token, 'access');
        if (claims.sid === undefined) throw new AccessAuthError();

        const principal = await repository.findPrincipal({
          sub: claims.sub,
          sid: claims.sid,
          jti: claims.jti,
          allowRevoked,
        });
        if (principal === null) throw new AccessAuthError();
        return { ...principal, exp: claims.exp };
      } catch {
        throw new AccessAuthError();
      }
    },
  };
}
