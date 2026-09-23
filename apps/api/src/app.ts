import express from 'express';
import type { AuthModule } from './modules/auth/auth.module.js';
import { installHealthRoutes, type HealthRouteOptions } from './modules/health/health.router.js';
import type { Logging } from './config/logger/logger.js';
import { installOpenApiRoutes } from './config/openapi/openapi.js';
import { installQueueMonitor, type QueueMonitorOptions } from './config/queue/queue-monitor.js';
import { type SecurityOptions } from './config/security/http-security.config.js';
import { createErrorHandler } from './middleware/error.middleware.js';
import { installSecurityMiddleware } from './middleware/security.middleware.js';

export type AppDependencies = {
  logging: Logging;
  security: SecurityOptions;
  auth?: Pick<AuthModule, 'router'>;
  health?: HealthRouteOptions;
  queueMonitor?: QueueMonitorOptions;
};

export function createApp({ logging, security, auth, health, queueMonitor }: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');
  app.use(logging.requestLogger);
  installSecurityMiddleware(app, logging.logger, security);
  app.use(logging.accessLogger);
  if (health) installHealthRoutes(app, health, logging.logger);
  installOpenApiRoutes(app);
  if (auth) app.use('/auth', auth.router);
  if (queueMonitor) installQueueMonitor(app, queueMonitor, logging.logger);

  app.use((_request, response) => {
    response.status(404).json({ message: 'Not found' });
  });
  app.use(createErrorHandler(logging.logger));

  return app;
}
