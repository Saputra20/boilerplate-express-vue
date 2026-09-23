import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const optionalRedisCredential = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);
const booleanValue = z.union([
  z.enum(['true', 'false']).transform((value) => value === 'true'),
  z.boolean(),
]);
const integerValue = (minimum: number) =>
  z.union([
    z
      .string()
      .trim()
      .regex(/^\d+$/, 'Expected an integer')
      .transform(Number)
      .pipe(z.number().int().min(minimum)),
    z.number().int().min(minimum),
  ]);

const redisConfigSchema = z.object({
  REDIS_HOST: nonEmptyString,
  REDIS_PORT: integerValue(1).pipe(z.number().max(65535)),
  REDIS_USERNAME: optionalRedisCredential,
  REDIS_PASSWORD: optionalRedisCredential,
  REDIS_DATABASE: integerValue(0),
  REDIS_TLS: booleanValue,
});

export type RedisConfig = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  tls: boolean;
};

export function loadRedisConfig(input: unknown = process.env): RedisConfig {
  const result = redisConfigSchema.safeParse(input);
  if (!result.success) {
    const invalidKeys = Array.from(
      new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    );
    throw new Error(`Invalid Redis configuration: ${invalidKeys.join(', ')}`);
  }

  const config = result.data;
  return {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    username: config.REDIS_USERNAME,
    password: config.REDIS_PASSWORD,
    db: config.REDIS_DATABASE,
    tls: config.REDIS_TLS,
  };
}
