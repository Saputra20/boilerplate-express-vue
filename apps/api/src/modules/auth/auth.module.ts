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
import { createAuthenticatedUserRepository } from './repositories/context.repository.js';
import { createAuthenticatedContextService } from './services/context.service.js';
import { createPermissionRepository } from '../rbac/repositories/permission.repository.js';
import { createPermissionService } from '../rbac/services/permission.service.js';
import { createMeRouter } from './v1/me.router.js';

export type AuthModuleDependencies = {
  db: Database;
  jwt: JwtService;
};

export function createAuthModule({ db, jwt }: AuthModuleDependencies) {
  const loginService = createLoginService(createLoginRepository(db), jwt);
  const refreshService = createRefreshService(createRefreshRepository(db), jwt);
  const accessAuthService = createAccessAuthService(createAccessAuthRepository(db), jwt);
  const logoutService = createLogoutService(createLogoutRepository(db));
  const permissionService = createPermissionService(createPermissionRepository(db));
  const contextService = createAuthenticatedContextService(
    createAuthenticatedUserRepository(db),
    permissionService,
  );

  return {
    accessAuthService,
    permissionService,
    v1: {
      router: createAuthRouter({
        loginService,
        refreshService,
        accessAuthService,
        logoutService,
      }),
      meRouter: createMeRouter({ accessAuthService, contextService }),
    },
  };
}

export type AuthModule = ReturnType<typeof createAuthModule>;
