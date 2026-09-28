import { z } from 'zod';

export const passwordRecoveryRequestSchema = z
  .object({ email: z.email().transform((email) => email.toLowerCase()) })
  .strict();

export const passwordResetConfirmSchema = z
  .object({ token: z.string(), password: z.string() })
  .strict();
