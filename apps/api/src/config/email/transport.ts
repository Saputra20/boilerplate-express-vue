import nodemailer, { type SendMailOptions } from 'nodemailer';
import { z } from 'zod';
import type { SmtpEmailConfig } from './config.js';

const emailMessageSchema = z.object({
  to: z.string().email(),
  subject: z.string().trim().min(1),
  html: z.string().min(1),
  text: z.string().min(1),
});

export type EmailMessage = z.infer<typeof emailMessageSchema>;
export type EmailFailureKind = 'retryable' | 'permanent' | 'uncertain';
export const EMAIL_DELIVERY_FAILURE_CATEGORIES = [
  'TRANSIENT_PROVIDER_FAILURE',
  'PERMANENT_DELIVERY_FAILURE',
  'PROVIDER_OUTCOME_UNKNOWN',
  'INTERRUPTED_PROCESSING',
  'EXPIRED',
  'UNCLASSIFIED_FAILURE',
] as const;
export type EmailDeliveryFailureCategory = (typeof EMAIL_DELIVERY_FAILURE_CATEGORIES)[number];

export type EmailTransport = {
  send(message: EmailMessage): Promise<{ messageId?: string }>;
  close(): Promise<void>;
};

type SmtpMailer = {
  sendMail(message: SendMailOptions): Promise<unknown>;
  close(): void;
};

type SmtpTransportOptions = {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
  auth?: { user: string; pass: string };
};

type SmtpMailerFactory = (options: SmtpTransportOptions) => SmtpMailer;

export class EmailDeliveryError extends Error {
  readonly failureCategory: EmailDeliveryFailureCategory;

  constructor(readonly kind: EmailFailureKind) {
    const failureCategory = failureCategoryForKind(kind);
    super('Email delivery failed');
    this.name = 'EmailDeliveryError';
    this.failureCategory = failureCategory;
  }
}

export function isEmailDeliveryFailureCategory(
  value: unknown,
): value is EmailDeliveryFailureCategory {
  return EMAIL_DELIVERY_FAILURE_CATEGORIES.some((category) => category === value);
}

function failureCategoryForKind(kind: EmailFailureKind): EmailDeliveryFailureCategory {
  if (kind === 'retryable') return 'TRANSIENT_PROVIDER_FAILURE';
  if (kind === 'uncertain') return 'PROVIDER_OUTCOME_UNKNOWN';
  return 'PERMANENT_DELIVERY_FAILURE';
}

export function createSmtpEmailTransport(
  config: SmtpEmailConfig,
  createMailer: SmtpMailerFactory = (options) => nodemailer.createTransport(options),
): EmailTransport {
  const mailer = createMailer({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 30_000,
    ...(config.username === undefined || config.password === undefined
      ? {}
      : { auth: { user: config.username, pass: config.password } }),
  });
  let closed = false;

  return {
    async send(message: EmailMessage): Promise<{ messageId?: string }> {
      if (closed) throw new EmailDeliveryError('permanent');

      const parsed = emailMessageSchema.safeParse(message);
      if (!parsed.success) throw new EmailDeliveryError('permanent');

      try {
        const result = (await mailer.sendMail({
          from: { name: config.fromName, address: config.fromEmail },
          to: parsed.data.to,
          subject: parsed.data.subject,
          html: parsed.data.html,
          text: parsed.data.text,
        })) as { messageId?: string };
        return { messageId: result?.messageId };
      } catch (error) {
        throw new EmailDeliveryError(classifySmtpFailure(error));
      }
    },
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      try {
        mailer.close();
      } catch {
        throw new Error('Email transport shutdown failed');
      }
    },
  };
}

export function classifySmtpFailure(error: unknown): EmailFailureKind {
  if (typeof error !== 'object' || error === null) return 'permanent';

  if ('responseCode' in error && typeof error.responseCode === 'number') {
    if (error.responseCode >= 400 && error.responseCode < 500) return 'retryable';
    if (error.responseCode >= 500 && error.responseCode < 600) return 'permanent';
  }

  if (
    'command' in error &&
    typeof error.command === 'string' &&
    error.command.toUpperCase() === 'DATA'
  ) {
    return 'uncertain';
  }

  if (
    'code' in error &&
    typeof error.code === 'string' &&
    [
      'ECONNECTION',
      'ECONNREFUSED',
      'ECONNRESET',
      'EDNS',
      'EHOSTUNREACH',
      'EPIPE',
      'ESOCKET',
      'ETIMEDOUT',
    ].includes(error.code)
  ) {
    return 'retryable';
  }

  return 'permanent';
}
