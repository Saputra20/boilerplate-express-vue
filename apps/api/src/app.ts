import express from 'express';
import type { Logging } from './logging/index.js';
import {
  createErrorHandler,
  installSecurityMiddleware,
  type SecurityOptions,
} from './security/index.js';

export function createApp(logging: Logging, securityOptions: SecurityOptions) {
  const app = express();

  app.disable('x-powered-by');
  app.use(logging.requestLogger);
  installSecurityMiddleware(app, logging.logger, securityOptions);
  app.use(logging.accessLogger);

  app.use((_request, response) => {
    response.status(404).json({ message: 'Not found' });
  });
  app.use(createErrorHandler(logging.logger));

  return app;
}
