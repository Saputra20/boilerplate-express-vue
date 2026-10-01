import { Router } from 'express';
import { createAccessAuthMiddleware } from '../../../middleware/authentication.middleware.js';
import { createLoginController } from './controllers/login.controller.js';
import { createLogoutController } from './controllers/logout.controller.js';
import { createRefreshController } from './controllers/refresh.controller.js';
import {
  createEmailVerificationConsumeController,
  createEmailVerificationRequestController,
} from './controllers/email-verification.controller.js';
import {
  createEmailVerificationAttemptLimiter,
  createEmailVerificationRequestLimiters,
} from './email-verification-rate-limit.js';
import type { AccessAuthService } from '../services/access-auth.service.js';
import type { LoginService } from '../services/login.service.js';
import type { LogoutService } from '../services/logout.service.js';
import type { RefreshService } from '../services/refresh-token.service.js';
import type { EmailVerificationService } from '../services/email-verification.service.js';
import { createPasswordRecoveryRequestLimiters } from './password-recovery-rate-limit.js';
import { createPasswordAttemptLimiter } from './password-attempt-rate-limit.js';
import {
  createPasswordRecoveryRequestController,
  createPasswordResetConfirmController,
} from './controllers/password-recovery.controller.js';
import type { PasswordRecoveryService } from '../services/password-recovery.service.js';
import type { PasswordChangeService } from '../services/password-change.service.js';
import { createPasswordChangeController } from './controllers/password-change.controller.js';
import type { SelfServicePasswordChangeService } from '../services/self-service-password-change.service.js';
import { createSelfServicePasswordChangeController } from './controllers/self-service-password-change.controller.js';

export type AuthRouterDependencies = {
  loginService?: LoginService;
  refreshService?: RefreshService;
  accessAuthService?: AccessAuthService;
  logoutService?: LogoutService;
  emailVerificationService?: EmailVerificationService;
  passwordRecoveryService?: PasswordRecoveryService;
  passwordChangeService?: PasswordChangeService;
  selfServicePasswordChangeService?: SelfServicePasswordChangeService;
};

export function createAuthRouter({
  loginService,
  refreshService,
  accessAuthService,
  logoutService,
  emailVerificationService,
  passwordRecoveryService,
  passwordChangeService,
  selfServicePasswordChangeService,
}: AuthRouterDependencies) {
  const router = Router();

  if (loginService) router.post('/login', createLoginController(loginService));
  if (refreshService) router.post('/refresh', createRefreshController(refreshService));
  if (emailVerificationService) {
    router.post(
      '/email-verification/request',
      ...createEmailVerificationRequestLimiters(),
      createEmailVerificationRequestController(emailVerificationService),
    );
    router.post(
      '/email-verification/verify',
      createEmailVerificationAttemptLimiter(),
      createEmailVerificationConsumeController(emailVerificationService),
    );
  }
  if (passwordRecoveryService) {
    router.post(
      '/password-reset/request',
      ...createPasswordRecoveryRequestLimiters(),
      createPasswordRecoveryRequestController(passwordRecoveryService),
    );
    router.post(
      '/password-reset/confirm',
      createPasswordAttemptLimiter(),
      createPasswordResetConfirmController(passwordRecoveryService),
    );
  }
  if (accessAuthService && passwordChangeService) {
    router.post(
      '/change-password',
      createAccessAuthMiddleware(accessAuthService, { allowMustChangePassword: true }),
      createPasswordAttemptLimiter(),
      createPasswordChangeController(passwordChangeService),
    );
  }
  if (accessAuthService && selfServicePasswordChangeService) {
    router.post(
      '/change-password/self-service',
      createAccessAuthMiddleware(accessAuthService),
      createPasswordAttemptLimiter(),
      createSelfServicePasswordChangeController(selfServicePasswordChangeService),
    );
  }
  if (accessAuthService && logoutService) {
    const authenticateLogout = createAccessAuthMiddleware(accessAuthService, {
      allowRevoked: true,
      allowMustChangePassword: true,
    });
    router.post('/logout', authenticateLogout, createLogoutController(logoutService, 'current'));
    router.post('/logout-all', authenticateLogout, createLogoutController(logoutService, 'all'));
  }

  return router;
}
