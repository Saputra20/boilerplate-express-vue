import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const booleanValue = z.union([
  z.enum(['true', 'false']).transform((value) => value === 'true'),
  z.boolean(),
]);
const portValue = z.union([
  z
    .string()
    .trim()
    .regex(/^\d+$/, 'Expected an integer')
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535)),
  z.number().int().min(1).max(65535),
]);

const databaseConfigSchema = z.object({
  DATABASE_HOST: nonEmptyString,
  DATABASE_PORT: portValue,
  DATABASE_NAME: nonEmptyString,
  DATABASE_USERNAME: nonEmptyString,
  DATABASE_PASSWORD: nonEmptyString,
  DATABASE_SSL: booleanValue,
});

export type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
};

export function loadDatabaseConfig(input: unknown = process.env): DatabaseConfig {
  const result = databaseConfigSchema.safeParse(input);
  if (!result.success) {
    const invalidKeys = Array.from(
      new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    );
    throw new Error(`Invalid database configuration: ${invalidKeys.join(', ')}`);
  }

  const config = result.data;
  return {
    host: config.DATABASE_HOST,
    port: config.DATABASE_PORT,
    database: config.DATABASE_NAME,
    user: config.DATABASE_USERNAME,
    password: config.DATABASE_PASSWORD,
    ssl: config.DATABASE_SSL,
  };
}
