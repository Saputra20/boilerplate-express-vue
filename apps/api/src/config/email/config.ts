import { z } from 'zod';
import type { Env } from '../env.js';

export type SmtpEmailConfig = {
  enabled: true;
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromEmail: string;
  fromName: string;
};

export type EmailConfig = { enabled: false } | SmtpEmailConfig;

const smtpEmailConfigSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.number().int().min(1).max(65535),
  SMTP_SECURE: z.boolean(),
  SMTP_USERNAME: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email(),
  SMTP_FROM_NAME: z.string().min(1),
});

export function loadEmailConfig(env: Env): EmailConfig {
  if (!env.EMAIL_ENABLED) return { enabled: false };

  const result = smtpEmailConfigSchema.safeParse(env);
  if (!result.success) {
    const invalidKeys = Array.from(
      new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    );
    throw new Error(`Invalid environment: ${invalidKeys.join(', ')}`);
  }

  return {
    enabled: true,
    host: result.data.SMTP_HOST,
    port: result.data.SMTP_PORT,
    secure: result.data.SMTP_SECURE,
    username: result.data.SMTP_USERNAME,
    password: result.data.SMTP_PASSWORD,
    fromEmail: result.data.SMTP_FROM_EMAIL,
    fromName: result.data.SMTP_FROM_NAME,
  };
}
