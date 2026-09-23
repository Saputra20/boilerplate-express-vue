import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { RefreshError, type RefreshService } from '../../services/refresh-token.service.js';

const refreshRequestSchema = z.object({ refreshToken: z.string().min(1) }).strict();

export function createRefreshController(refreshService: RefreshService): RequestHandler {
  return async (request, response, next) => {
    const parsedRequest = refreshRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({ message: 'Bad request' });
      return;
    }

    try {
      const result = await refreshService.refresh({
        refreshToken: parsedRequest.data.refreshToken,
        requestId: typeof request.id === 'string' ? request.id : randomUUID(),
      });
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof RefreshError && error.code === 'invalidRefreshToken') {
        response.status(401).json({ message: 'Invalid refresh token' });
        return;
      }

      next(error);
    }
  };
}
