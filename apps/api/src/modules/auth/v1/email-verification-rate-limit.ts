import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { emailVerificationRequestSchema } from './validation/email-verification.validation.js';

const genericAccepted = {
  message: 'If the account is eligible for email verification, a verification email will be sent.',
};

export function createEmailVerificationRequestLimiters(): RequestHandler[] {
  const ipLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_request, response) {
      response.status(429).json({ message: 'Too many requests' });
    },
  });
  const accountLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skip(request) {
      return !emailVerificationRequestSchema.safeParse(request.body).success;
    },
    keyGenerator(request) {
      const email = emailVerificationRequestSchema.parse(request.body).email;
      return createHash('sha256').update(email).digest('hex');
    },
    handler(_request, response) {
      response.status(202).json(genericAccepted);
    },
  });
  return [ipLimit, accountLimit];
}

export function createEmailVerificationAttemptLimiter(): RequestHandler {
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
