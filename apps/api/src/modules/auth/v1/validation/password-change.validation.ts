import { z } from 'zod';

export const passwordChangeSchema = z
  .object({ currentPassword: z.string(), newPassword: z.string() })
  .strict();
