import express from 'express';
import { installLoginRoute } from './modules/auth/auth.router.js';
import type { LoginService } from './modules/auth/services/login.service.js';
import { installLogoutRoutes } from './modules/auth/auth.router.js';
import type { AccessAuthService } from './modules/auth/services/access-auth.service.js';
import type { LogoutService } from './modules/auth/services/logout.service.js';
import { installRefreshRoute } from './modules/auth/auth.router.js';
import type { RefreshService } from './modules/auth/services/refresh-token.service.js';
import { installHealthRoutes, type HealthRouteOptions } from './modules/health/health.router.js';
import type { Logging } from './config/logger/logger.js';
import { installOpenApiRoutes } from './config/openapi/openapi.js';
import { installQueueMonitor, type QueueMonitorOptions } from './config/queue/queue-monitor.js';
import { type SecurityOptions } from './config/security/http-security.config.js';
import { createErrorHandler } from './middleware/error.middleware.js';
import { installSecurityMiddleware } from './middleware/security.middleware.js';

export function createApp(
  logging: Logging,
  securityOptions: SecurityOptions,
  loginService?: LoginService,
  refreshService?: RefreshService,
  accessAuthService?: AccessAuthService,
  logoutService?: LogoutService,
  queueMonitor?: QueueMonitorOptions,
  healthRoutes?: HealthRouteOptions,
) {
  const app = express();

  app.disable('x-powered-by');
  app.use(logging.requestLogger);
  installSecurityMiddleware(app, logging.logger, securityOptions);
  app.use(logging.accessLogger);
  if (healthRoutes) installHealthRoutes(app, healthRoutes, logging.logger);
  installOpenApiRoutes(app);

  if (loginService) installLoginRoute(app, loginService);
  if (refreshService) installRefreshRoute(app, refreshService);
  if (accessAuthService && logoutService) {
    installLogoutRoutes(app, accessAuthService, logoutService);
  }
  if (queueMonitor) installQueueMonitor(app, queueMonitor, logging.logger);

  app.use((_request, response) => {
    response.status(404).json({ message: 'Not found' });
  });
  app.use(createErrorHandler(logging.logger));

  return app;
}
