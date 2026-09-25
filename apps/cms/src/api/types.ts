import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export const tokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().nonnegative(),
});

export const authenticatedContextSchema = z.object({
  user: z.object({
    id: z.uuid(),
    email: z.email(),
  }),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
export type AuthenticatedContext = z.infer<typeof authenticatedContextSchema>;
