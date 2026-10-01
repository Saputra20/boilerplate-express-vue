import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

export function createPasswordAttemptLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_request, response) {
      response.status(429).json({ message: 'Too many requests' });
    },
  });
}
