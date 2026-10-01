import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .transform((value) => value.trim())
      .refine((value) => {
        const length = Array.from(value).length;
        return length >= 1 && length <= 80;
      }),
  })
  .strict();
