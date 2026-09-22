import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');
const integerFromString = (minimum: number, maximum?: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, 'Expected an integer')
    .transform(Number)
    .pipe(z.number().int().min(minimum).max(maximum ?? Number.MAX_SAFE_INTEGER));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: integerFromString(1, 65535),
  DATABASE_HOST: nonEmptyString,
  DATABASE_PORT: integerFromString(1, 65535),
  DATABASE_NAME: nonEmptyString,
  DATABASE_USERNAME: nonEmptyString,
  DATABASE_PASSWORD: nonEmptyString,
  DATABASE_SSL: booleanFromString,
  REDIS_HOST: nonEmptyString,
  REDIS_PORT: integerFromString(1, 65535),
  REDIS_USERNAME: nonEmptyString,
  REDIS_PASSWORD: nonEmptyString,
  REDIS_DATABASE: integerFromString(0),
  REDIS_TLS: booleanFromString,
  JWT_PRIVATE_KEY_PATH: nonEmptyString,
  JWT_PUBLIC_KEY_PATH: nonEmptyString,
  JWT_ISSUER: nonEmptyString,
  JWT_AUDIENCE: nonEmptyString,
  JWT_ACCESS_TOKEN_EXPIRES_IN: nonEmptyString,
  JWT_REFRESH_TOKEN_EXPIRES_IN: nonEmptyString,
  QUEUE_MONITOR_USERNAME: nonEmptyString,
  QUEUE_MONITOR_PASSWORD: nonEmptyString,
  CORS_ORIGIN: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(input);
  if (result.success) return result.data;

  const invalidKeys = Array.from(new Set(result.error.issues.map((issue) => issue.path.join('.'))));
  throw new Error(`Invalid environment: ${invalidKeys.join(', ')}`);
}
