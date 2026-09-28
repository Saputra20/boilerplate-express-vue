import { randomBytes } from 'node:crypto';
import type { EmailDeliveryService } from '../../notification/email/delivery.service.js';
import { fingerprintToken } from '../../../helpers/token-fingerprint.helper.js';
import { buildAuthActionUrl } from './auth-action-url.js';

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_COOLDOWN_MS = 60 * 1000;
export const EMAIL_VERIFICATION_REQUESTS_PER_HOUR = 5;

export type VerificationRepository = {
  issue(input: {
    email: string;
    tokenHash: string;
    now: Date;
    expiresAt: Date;
    cooldownBefore: Date;
    requestLimitBefore: Date;
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<{ challengeId: string; userId: string; email: string } | null>;
  consume(input: {
    tokenHash: string;
    now: Date;
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<'verified' | 'expired' | 'invalid'>;
  recordDeliveryQueued(input: {
    challengeId: string;
    emailDeliveryId: string;
    requestId: string;
  }): Promise<void>;
};

export type EmailVerificationService = {
  request(input: {
    email: string;
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void>;
  verify(input: {
    token: string;
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void>;
};

export class VerificationTokenError extends Error {
  constructor(readonly code: 'invalid' | 'expired') {
    super(code === 'expired' ? 'Verification token expired' : 'Verification token invalid');
    this.name = 'VerificationTokenError';
  }
}

export function createEmailVerificationService(options: {
  repository: VerificationRepository;
  delivery?: Pick<EmailDeliveryService, 'create'>;
  publicAppUrl?: URL;
  now?: () => Date;
  createToken?: () => string;
}): EmailVerificationService {
  const now = options.now ?? (() => new Date());
  const createToken = options.createToken ?? (() => randomBytes(32).toString('base64url'));

  return {
    async request(input) {
      if (!options.delivery || !options.publicAppUrl) return;

      const issuedAt = now();
      const token = createToken();
      const expiresAt = new Date(issuedAt.getTime() + EMAIL_VERIFICATION_TTL_MS);
      const challenge = await options.repository.issue({
        ...input,
        tokenHash: hashVerificationToken(token),
        now: issuedAt,
        expiresAt,
        cooldownBefore: new Date(issuedAt.getTime() - EMAIL_VERIFICATION_COOLDOWN_MS),
        requestLimitBefore: new Date(issuedAt.getTime() - 60 * 60 * 1000),
      });
      if (!challenge) return;

      const actionUrl = buildEmailVerificationUrl(options.publicAppUrl, token);
      try {
        const delivery = await options.delivery.create({
          template: 'auth.email-verification',
          recipient: challenge.email,
          context: {
            actionUrl,
            expiryDisplay: formatVerificationExpiry(EMAIL_VERIFICATION_TTL_MS),
          },
          sensitivePayloadExpiresAt: expiresAt,
        });
        await options.repository.recordDeliveryQueued({
          challengeId: challenge.challengeId,
          emailDeliveryId: delivery.emailDeliveryId,
          requestId: input.requestId,
        });
      } catch {
        // be/33 retains the pending delivery for recovery; the public response stays generic.
      }
    },

    async verify(input) {
      if (!isVerificationToken(input.token)) throw new VerificationTokenError('invalid');
      const result = await options.repository.consume({
        ...input,
        tokenHash: hashVerificationToken(input.token),
        now: now(),
      });
      if (result === 'invalid') throw new VerificationTokenError('invalid');
      if (result === 'expired') throw new VerificationTokenError('expired');
    },
  };
}

export function hashVerificationToken(token: string): string {
  return fingerprintToken(token);
}

export function buildEmailVerificationUrl(baseUrl: URL, token: string): string {
  return buildAuthActionUrl(baseUrl, 'verify-email', token);
}

function isVerificationToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

function formatVerificationExpiry(durationMs: number): string {
  const hours = durationMs / (60 * 60 * 1000);
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}
