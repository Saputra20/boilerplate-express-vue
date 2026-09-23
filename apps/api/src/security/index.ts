import express, { type ErrorRequestHandler, type Express } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import type { Logger } from 'pino';

export const CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
export const CORS_ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Request-Id'];
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const JSON_BODY_LIMIT = '1mb';

export type SecurityOptions = {
  corsOrigins: readonly string[];
  rateLimit?: {
    limit: number;
    windowMs: number;
  };
  jsonBodyLimit?: string;
};

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

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const statusCode = getErrorStatusCode(error);
    const message = getSafeErrorMessage(statusCode);

    logger.error(
      {
        requestId: request.id,
        statusCode,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      },
      'Request failed',
    );
    response.status(statusCode).json({ message });
  };
}

function getErrorStatusCode(error: unknown): 400 | 413 | 500 {
  if (!isErrorWithStatus(error)) return 500;
  if (error.status === 413 || error.statusCode === 413) return 413;
  if (error.type === 'entity.parse.failed' || error.status === 400 || error.statusCode === 400) {
    return 400;
  }

  return 500;
}

function getSafeErrorMessage(statusCode: 400 | 413 | 500): string {
  if (statusCode === 400) return 'Bad request';
  if (statusCode === 413) return 'Payload too large';
  return 'Internal server error';
}

function isErrorWithStatus(error: unknown): error is {
  status?: number;
  statusCode?: number;
  type?: string;
} {
  return typeof error === 'object' && error !== null;
}
