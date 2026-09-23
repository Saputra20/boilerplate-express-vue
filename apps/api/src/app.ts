import express from 'express';
import { installLoginRoute } from './auth/login-route.js';
import type { LoginService } from './auth/login-service.js';
import { installLogoutRoutes } from './auth/logout-route.js';
import type { AccessAuthService } from './auth/access-auth-service.js';
import type { LogoutService } from './auth/logout-service.js';
import { installRefreshRoute } from './auth/refresh-route.js';
import type { RefreshService } from './auth/refresh-service.js';
import type { Logging } from './logging/index.js';
import { installOpenApiRoutes } from './openapi/index.js';
import { installQueueMonitor, type QueueMonitorOptions } from './queue/monitor.js';
import {
  createErrorHandler,
  installSecurityMiddleware,
  type SecurityOptions,
} from './security/index.js';

export function createApp(
  logging: Logging,
  securityOptions: SecurityOptions,
  loginService?: LoginService,
  refreshService?: RefreshService,
  accessAuthService?: AccessAuthService,
  logoutService?: LogoutService,
  queueMonitor?: QueueMonitorOptions,
) {
  const app = express();

  app.disable('x-powered-by');
  app.use(logging.requestLogger);
  installSecurityMiddleware(app, logging.logger, securityOptions);
  app.use(logging.accessLogger);
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
