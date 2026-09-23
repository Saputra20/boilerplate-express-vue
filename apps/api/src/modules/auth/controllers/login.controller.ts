import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { LoginError, type LoginService } from '../services/login.service.js';

const loginRequestSchema = z
  .object({
    email: z.email().transform((email) => email.toLowerCase()),
    password: z.string(),
  })
  .strict();

export function createLoginController(loginService: LoginService): RequestHandler {
  return async (request, response, next) => {
    const parsedRequest = loginRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({ message: 'Bad request' });
      return;
    }

    try {
      const result = await loginService.login({
        ...parsedRequest.data,
        requestId: typeof request.id === 'string' ? request.id : randomUUID(),
      });
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof LoginError && error.code === 'invalidCredentials') {
        response.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      next(error);
    }
  };
}
