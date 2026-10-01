import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { getAccessPrincipal } from '../../../../middleware/authentication.middleware.js';
import type { SelfServicePasswordChangeService } from '../../services/self-service-password-change.service.js';
import { passwordChangeSchema } from '../validation/password-change.validation.js';

export function createSelfServicePasswordChangeController(
  service: SelfServicePasswordChangeService,
): RequestHandler {
  return async (request, response, next) => {
    const parsed = passwordChangeSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Bad request' });
      return;
    }

    const principal = getAccessPrincipal(response);
    if (!principal) {
      response.status(401).json({ message: 'Invalid authentication' });
      return;
    }

    try {
      const result = await service.change({
        ...parsed.data,
        userId: principal.sub,
        sessionId: principal.sid,
        requestId: typeof request.id === 'string' ? request.id : randomUUID(),
        ipAddress: request.ip || null,
        userAgent: request.get('user-agent') ?? null,
      });
      if (result === 'changed') {
        response.status(204).end();
        return;
      }
      if (result === 'invalid_authentication') {
        response.status(401).json({ message: 'Invalid authentication' });
        return;
      }
      if (result === 'password_change_required') {
        response.status(403).json({
          message: 'Password change required',
          code: 'password_change_required',
        });
        return;
      }
      response.status(400).json({
        message:
          result === 'invalid_current_password'
            ? 'Current password is invalid'
            : result === 'password_unchanged'
              ? 'New password must differ from current password'
              : 'New password does not meet the password policy',
        code: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
