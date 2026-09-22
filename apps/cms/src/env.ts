import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.url(),
});

export type CmsEnv = z.infer<typeof envSchema>;

export function loadEnv(input: unknown = import.meta.env): CmsEnv {
  const result = envSchema.safeParse(input);
  if (result.success) return result.data;

  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment: ${details}`);
}
