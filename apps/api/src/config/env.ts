import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const optionalRedisCredential = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);
const queueMonitorPassword = z
  .string()
  .min(16)
  .refine((value) => value.trim().length > 0, 'Expected a non-empty password');
const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');
const optionalBooleanFromString = booleanFromString.optional().transform((value) => value ?? false);
const optionalSmtpUsername = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);
const optionalSmtpPassword = z
  .string()
  .optional()
  .transform((value) => (value === '' ? undefined : value));
const corsOriginsFromString = z.string().transform((value, context) => {
  const origins = value.split(',').map((origin) => origin.trim());

  if (origins.length === 0 || origins.some((origin) => origin.length === 0)) {
    context.addIssue({ code: 'custom', message: 'Expected one or more origins' });
    return z.NEVER;
  }

  const uniqueOrigins = new Set<string>();
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
        context.addIssue({ code: 'custom', message: 'Expected an origin' });
        return z.NEVER;
      }
    } catch {
      context.addIssue({ code: 'custom', message: 'Expected an origin' });
      return z.NEVER;
    }

    if (uniqueOrigins.has(origin)) {
      context.addIssue({ code: 'custom', message: 'Origins must be unique' });
      return z.NEVER;
    }

    uniqueOrigins.add(origin);
  }

  return origins;
});
const integerFromString = (minimum: number, maximum?: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, 'Expected an integer')
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(minimum)
        .max(maximum ?? Number.MAX_SAFE_INTEGER),
    );
const optionalPortFromString = integerFromString(1, 65535).optional();
const publicAppUrl = z
  .string()
  .trim()
  .url()
  .transform((value) => {
    const url = new URL(value);
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url;
  })
  .refine((url) => !url.username && !url.password && !url.search && !url.hash)
  .optional();

const envSchema = z
  .object({
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
    REDIS_USERNAME: optionalRedisCredential,
    REDIS_PASSWORD: optionalRedisCredential,
    REDIS_DATABASE: integerFromString(0),
    REDIS_TLS: booleanFromString,
    JWT_PRIVATE_KEY_PATH: nonEmptyString,
    JWT_PUBLIC_KEY_PATH: nonEmptyString,
    JWT_ISSUER: nonEmptyString,
    JWT_AUDIENCE: nonEmptyString,
    JWT_ACCESS_TOKEN_EXPIRES_IN: nonEmptyString,
    JWT_REFRESH_TOKEN_EXPIRES_IN: nonEmptyString,
    QUEUE_MONITOR_USERNAME: nonEmptyString,
    QUEUE_MONITOR_PASSWORD: queueMonitorPassword,
    DEFAULT_USER_PASSWORD: z.string().superRefine((value, context) => {
      if (Array.from(value).length < 12 || Array.from(value).length > 128)
        context.addIssue({ code: 'custom', message: 'Invalid password length' });
    }),
    CORS_ORIGINS: corsOriginsFromString,
    PUBLIC_APP_URL: publicAppUrl,
    EMAIL_ENABLED: optionalBooleanFromString,
    EMAIL_DELIVERY_ENCRYPTION_KEY: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/)
      .optional(),
    SMTP_HOST: z
      .string()
      .trim()
      .min(1)
      .refine((value) => !/\s/.test(value))
      .optional(),
    SMTP_PORT: optionalPortFromString,
    SMTP_SECURE: booleanFromString.optional(),
    SMTP_USERNAME: optionalSmtpUsername,
    SMTP_PASSWORD: optionalSmtpPassword,
    SMTP_FROM_EMAIL: z.string().trim().email().optional(),
    SMTP_FROM_NAME: z.string().trim().min(1).optional(),
  })
  .superRefine((env, context) => {
    const fieldsRequiredWhenEnabled = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_SECURE',
      'SMTP_FROM_EMAIL',
      'SMTP_FROM_NAME',
    ] as const;

    if (env.EMAIL_ENABLED) {
      if (env.PUBLIC_APP_URL === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['PUBLIC_APP_URL'],
          message: 'Required when email is enabled',
        });
      } else if (
        env.NODE_ENV === 'production'
          ? env.PUBLIC_APP_URL.protocol !== 'https:'
          : env.PUBLIC_APP_URL.protocol !== 'https:' &&
            (env.PUBLIC_APP_URL.protocol !== 'http:' ||
              !['localhost', '127.0.0.1', '::1'].includes(env.PUBLIC_APP_URL.hostname))
      ) {
        context.addIssue({
          code: 'custom',
          path: ['PUBLIC_APP_URL'],
          message: 'Expected HTTPS, or a loopback HTTP URL outside production',
        });
      }
      for (const key of fieldsRequiredWhenEnabled) {
        if (env[key] === undefined) {
          context.addIssue({
            code: 'custom',
            path: [key],
            message: 'Required when email is enabled',
          });
        }
      }
      if (env.NODE_ENV === 'production' && !env.EMAIL_DELIVERY_ENCRYPTION_KEY) {
        context.addIssue({
          code: 'custom',
          path: ['EMAIL_DELIVERY_ENCRYPTION_KEY'],
          message: 'Required when email is enabled in production',
        });
      }
    }

    if ((env.SMTP_USERNAME === undefined) !== (env.SMTP_PASSWORD === undefined)) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_USERNAME'],
        message: 'SMTP username and password must be configured together',
      });
      context.addIssue({
        code: 'custom',
        path: ['SMTP_PASSWORD'],
        message: 'SMTP username and password must be configured together',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(input);
  if (result.success) return result.data;

  const invalidKeys = Array.from(new Set(result.error.issues.map((issue) => issue.path.join('.'))));
  throw new Error(`Invalid environment: ${invalidKeys.join(', ')}`);
}
