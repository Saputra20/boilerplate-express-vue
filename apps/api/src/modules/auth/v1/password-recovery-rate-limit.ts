import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { passwordRecoveryRequestSchema } from './validation/password-recovery.validation.js';

export const genericPasswordRecoveryResponse = {
  message: 'If the account is eligible for a password reset, a reset email will be sent.',
};

export function createPasswordRecoveryRequestLimiters(): RequestHandler[] {
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
      return !passwordRecoveryRequestSchema.safeParse(request.body).success;
    },
    keyGenerator(request) {
      const email = passwordRecoveryRequestSchema.parse(request.body).email;
      return createHash('sha256').update(email).digest('hex');
    },
    handler(_request, response) {
      response.status(202).json(genericPasswordRecoveryResponse);
    },
  });
  return [ipLimit, accountLimit];
}
