import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import {
  PasswordResetPasswordError,
  PasswordResetTokenError,
  type PasswordRecoveryService,
} from '../../services/password-recovery.service.js';
import { genericPasswordRecoveryResponse } from '../password-recovery-rate-limit.js';
import {
  passwordRecoveryRequestSchema,
  passwordResetConfirmSchema,
} from '../validation/password-recovery.validation.js';

export function createPasswordRecoveryRequestController(
  service: PasswordRecoveryService,
): RequestHandler {
  return async (request, response, next) => {
    const parsed = passwordRecoveryRequestSchema.safeParse(request.body);
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
      response.status(202).json(genericPasswordRecoveryResponse);
    } catch (error) {
      next(error);
    }
  };
}

export function createPasswordResetConfirmController(
  service: PasswordRecoveryService,
): RequestHandler {
  return async (request, response, next) => {
    const parsed = passwordResetConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Bad request' });
      return;
    }

    try {
      await service.confirm({
        ...parsed.data,
        requestId: requestId(request.id),
        ipAddress: request.ip || null,
        userAgent: request.get('user-agent') ?? null,
      });
      response.status(204).end();
    } catch (error) {
      if (error instanceof PasswordResetTokenError) {
        response.status(400).json({
          message: 'Invalid or expired password reset token',
          code: 'invalid_or_expired_password_reset_token',
        });
        return;
      }
      if (error instanceof PasswordResetPasswordError) {
        response.status(400).json({ message: 'Bad request' });
        return;
      }
      next(error);
    }
  };
}

function requestId(id: unknown): string {
  return typeof id === 'string' ? id : randomUUID();
}
