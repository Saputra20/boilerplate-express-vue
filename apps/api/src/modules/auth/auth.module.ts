import type { Database } from '../../config/database/client.js';
import type { JwtService } from '../../config/jwt/jwt.js';
import { createAuthRouter } from './v1/auth.router.js';
import { createAccessAuthRepository } from './repositories/access-auth.repository.js';
import { createLoginRepository } from './repositories/login.repository.js';
import { createLogoutRepository } from './repositories/logout.repository.js';
import { createRefreshRepository } from './repositories/refresh-token.repository.js';
import { createAccessAuthService } from './services/access-auth.service.js';
import { createLoginService } from './services/login.service.js';
import { createLogoutService } from './services/logout.service.js';
import { createRefreshService } from './services/refresh-token.service.js';

export type AuthModuleDependencies = {
  db: Database;
  jwt: JwtService;
};

export function createAuthModule({ db, jwt }: AuthModuleDependencies) {
  const loginService = createLoginService(createLoginRepository(db), jwt);
  const refreshService = createRefreshService(createRefreshRepository(db), jwt);
  const accessAuthService = createAccessAuthService(createAccessAuthRepository(db), jwt);
  const logoutService = createLogoutService(createLogoutRepository(db));

  return {
    v1: {
      router: createAuthRouter({
        loginService,
        refreshService,
        accessAuthService,
        logoutService,
      }),
    },
  };
}

export type AuthModule = ReturnType<typeof createAuthModule>;
