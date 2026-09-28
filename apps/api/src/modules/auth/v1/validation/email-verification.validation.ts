import { z } from 'zod';

export const emailVerificationRequestSchema = z
  .object({ email: z.email().transform((email) => email.toLowerCase()) })
  .strict();

export const emailVerificationConsumeSchema = z
  .object({ token: z.string().min(1).max(128) })
  .strict();
