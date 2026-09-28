import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import {
  VerificationTokenError,
  type EmailVerificationService,
} from '../../services/email-verification.service.js';
import {
  emailVerificationConsumeSchema,
  emailVerificationRequestSchema,
} from '../validation/email-verification.validation.js';

const genericAccepted = {
  message: 'If the account is eligible for email verification, a verification email will be sent.',
};

export function createEmailVerificationRequestController(
  service: EmailVerificationService,
): RequestHandler {
  return async (request, response, next) => {
    const parsed = emailVerificationRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Bad request' });
      return;
    }

    try {
      await service.request({
        ...parsed.data,
        requestId: requestId(request.id),
        ipAddress: request.ip || null,
        userAgent: request.get('user-agent') ?? null,
      });
      response.status(202).json(genericAccepted);
    } catch (error) {
      next(error);
    }
  };
}

export function createEmailVerificationConsumeController(
  service: EmailVerificationService,
): RequestHandler {
  return async (request, response, next) => {
    const parsed = emailVerificationConsumeSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        message: 'Invalid verification token',
        code: 'invalid_or_used_verification_token',
      });
      return;
    }

    try {
      await service.verify({
        ...parsed.data,
        requestId: requestId(request.id),
        ipAddress: request.ip || null,
        userAgent: request.get('user-agent') ?? null,
      });
      response.status(200).json({ message: 'Email verified' });
    } catch (error) {
      if (error instanceof VerificationTokenError) {
        const expired = error.code === 'expired';
        response.status(400).json({
          message: expired ? 'Verification link expired' : 'Invalid verification token',
          code: expired ? 'verification_token_expired' : 'invalid_or_used_verification_token',
        });
        return;
      }
      next(error);
    }
  };
}

function requestId(id: unknown): string {
  return typeof id === 'string' ? id : randomUUID();
}
