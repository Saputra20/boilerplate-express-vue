import express from 'express';
import { installLoginRoute } from './auth/login-route.js';
import type { LoginService } from './auth/login-service.js';
import { installRefreshRoute } from './auth/refresh-route.js';
import type { RefreshService } from './auth/refresh-service.js';
import type { Logging } from './logging/index.js';
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
) {
  const app = express();

  app.disable('x-powered-by');
  app.use(logging.requestLogger);
  installSecurityMiddleware(app, logging.logger, securityOptions);
  app.use(logging.accessLogger);

  if (loginService) installLoginRoute(app, loginService);
  if (refreshService) installRefreshRoute(app, refreshService);

  app.use((_request, response) => {
    response.status(404).json({ message: 'Not found' });
  });
  app.use(createErrorHandler(logging.logger));

  return app;
}
