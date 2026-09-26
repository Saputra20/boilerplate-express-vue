import express from 'express';
import type { Router } from 'express';
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
  routers?: {
    authV1?: Router;
    meV1?: Router;
    categoryV1?: Router;
    roleV1?: Router;
    userV1?: Router;
    dashboardV1?: Router;
  };
  health?: HealthRouteOptions;
  queueMonitor?: QueueMonitorOptions;
};

export function createApp({ logging, security, routers, health, queueMonitor }: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');
  app.use(logging.requestLogger);
  installSecurityMiddleware(app, logging.logger, security);
  app.use(logging.accessLogger);
  if (health) installHealthRoutes(app, health, logging.logger);
  installOpenApiRoutes(app);
  if (routers?.authV1) app.use('/api/v1/auth', routers.authV1);
  if (routers?.meV1) app.use('/api/v1', routers.meV1);
  if (routers?.categoryV1) app.use('/api/v1/categories', routers.categoryV1);
  if (routers?.roleV1) app.use('/api/v1/roles', routers.roleV1);
  if (routers?.userV1) app.use('/api/v1/users', routers.userV1);
  if (routers?.dashboardV1) app.use('/api/v1/dashboard', routers.dashboardV1);
  if (queueMonitor) installQueueMonitor(app, queueMonitor, logging.logger);

  app.use((_request, response) => {
    response.status(404).json({ message: 'Not found' });
  });
  app.use(createErrorHandler(logging.logger));

  return app;
}
