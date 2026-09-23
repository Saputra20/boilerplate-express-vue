import express from 'express';
import type { Logging } from './logging/index.js';

export function createApp(logging: Logging) {
  const app = express();

  app.disable('x-powered-by');
  app.use(logging.requestLogger);
  app.use(express.json({ limit: '1mb' }));
  app.use(logging.accessLogger);

  app.use((_request, response) => {
    response.status(404).json({ message: 'Not found' });
  });

  return app;
}
