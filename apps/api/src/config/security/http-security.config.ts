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
