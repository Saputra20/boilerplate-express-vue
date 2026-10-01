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
import { createAuditRepository } from '../audit/repositories/audit.repository.js';
import { createAuditService } from '../audit/services/audit.service.js';
import { createEmailVerificationRepository } from './repositories/email-verification.repository.js';
import { createEmailVerificationService } from './services/email-verification.service.js';
import { createPasswordRecoveryRepository } from './repositories/password-recovery.repository.js';
import { createPasswordRecoveryService } from './services/password-recovery.service.js';
import type { EmailDeliveryService } from '../notification/email/delivery.service.js';
import type { Logger } from 'pino';
import { createPasswordChangeRepository } from './repositories/password-change.repository.js';
import { createPasswordChangeService } from './services/password-change.service.js';
import { createSelfServicePasswordChangeRepository } from './repositories/self-service-password-change.repository.js';
import { createSelfServicePasswordChangeService } from './services/self-service-password-change.service.js';

export type AuthModuleDependencies = {
  db: Database;
  jwt: JwtService;
  logger: Logger;
  emailDeliveryService?: Pick<EmailDeliveryService, 'create'>;
  publicAppUrl?: URL;
};

export function createAuthModule({
  db,
  jwt,
  logger,
  emailDeliveryService,
  publicAppUrl,
}: AuthModuleDependencies) {
  const loginService = createLoginService(createLoginRepository(db), jwt);
  const refreshService = createRefreshService(createRefreshRepository(db), jwt);
  const accessAuthService = createAccessAuthService(createAccessAuthRepository(db), jwt);
  const logoutService = createLogoutService(createLogoutRepository(db));
  const permissionService = createPermissionService(createPermissionRepository(db));
  const contextService = createAuthenticatedContextService(
    createAuthenticatedUserRepository(db),
    permissionService,
  );
  const auditService = createAuditService(createAuditRepository(db), logger);
  const passwordChangeService = createPasswordChangeService(
    createPasswordChangeRepository(db, auditService),
  );
  const selfServicePasswordChangeService = createSelfServicePasswordChangeService(
    createSelfServicePasswordChangeRepository(db, auditService),
  );
  const emailVerificationService = createEmailVerificationService({
    repository: createEmailVerificationRepository(db, auditService),
    delivery: emailDeliveryService,
    publicAppUrl,
  });
  const passwordRecoveryService = createPasswordRecoveryService({
    repository: createPasswordRecoveryRepository(db, auditService),
    delivery: emailDeliveryService,
    publicAppUrl,
    onRequestFailure: (requestId) =>
      logger.error(
        { eventType: 'auth.password_reset.request_failed', requestId },
        'Password recovery request processing failed',
      ),
  });

  return {
    accessAuthService,
    permissionService,
    v1: {
      router: createAuthRouter({
        loginService,
        refreshService,
        accessAuthService,
        logoutService,
        emailVerificationService,
        passwordRecoveryService,
        passwordChangeService,
        selfServicePasswordChangeService,
      }),
      meRouter: createMeRouter({ accessAuthService, contextService }),
    },
  };
}

export type AuthModule = ReturnType<typeof createAuthModule>;
