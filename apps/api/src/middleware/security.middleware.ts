import express, { type Express } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import type { Logger } from 'pino';
import {
  CORS_ALLOWED_HEADERS,
  CORS_METHODS,
  JSON_BODY_LIMIT,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  type SecurityOptions,
} from '../config/security/http-security.config.js';

export function installSecurityMiddleware(
  app: Express,
  logger: Logger,
  {
    corsOrigins,
    rateLimit: rateLimitOptions = {
      limit: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
    },
    jsonBodyLimit = JSON_BODY_LIMIT,
  }: SecurityOptions,
): void {
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, origin === undefined || corsOrigins.includes(origin));
      },
      methods: CORS_METHODS,
      allowedHeaders: CORS_ALLOWED_HEADERS,
      credentials: false,
    }),
  );
  app.use(express.json({ limit: jsonBodyLimit }));
  app.use(
    rateLimit({
      windowMs: rateLimitOptions.windowMs,
      limit: rateLimitOptions.limit,
      standardHeaders: true,
      legacyHeaders: false,
      skip(request) {
        return request.path === '/health' || request.path === '/ready';
      },
      handler(request, response) {
        logger.warn({ requestId: request.id, statusCode: 429 }, 'Rate limit exceeded');
        response.status(429).json({ message: 'Too many requests' });
      },
    }),
  );
}
