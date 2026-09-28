import { randomBytes } from 'node:crypto';
import { fingerprintToken } from '../../../helpers/token-fingerprint.helper.js';
import { hashPassword, isValidPassword } from '../../../helpers/password.helper.js';
import type { EmailDeliveryService } from '../../notification/email/delivery.service.js';
import { buildAuthActionUrl } from './auth-action-url.js';

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
export type PasswordRecoveryRepository = {
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
    passwordHash: string;
    now: Date;
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<boolean>;
};

export type PasswordRecoveryService = {
  request(input: {
    email: string;
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void>;
  confirm(input: {
    token: string;
    password: string;
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<void>;
};

export class PasswordResetTokenError extends Error {
  constructor() {
    super('Invalid or expired password reset token');
    this.name = 'PasswordResetTokenError';
  }
}

export class PasswordResetPasswordError extends Error {
  constructor() {
    super('Invalid password');
    this.name = 'PasswordResetPasswordError';
  }
}

export function createPasswordRecoveryService(options: {
  repository: PasswordRecoveryRepository;
  delivery?: Pick<EmailDeliveryService, 'create'>;
  publicAppUrl?: URL;
  now?: () => Date;
  createToken?: () => string;
  onRequestFailure?: (requestId: string) => void;
}): PasswordRecoveryService {
  const now = options.now ?? (() => new Date());
  const createToken = options.createToken ?? (() => randomBytes(32).toString('base64url'));

  return {
    async request(input) {
      if (!options.delivery || !options.publicAppUrl) return;

      const issuedAt = now();
      const token = createToken();
      const expiresAt = new Date(issuedAt.getTime() + PASSWORD_RESET_TTL_MS);
      let challenge: Awaited<ReturnType<PasswordRecoveryRepository['issue']>>;
      try {
        challenge = await options.repository.issue({
          ...input,
          tokenHash: fingerprintToken(token),
          now: issuedAt,
          expiresAt,
          cooldownBefore: new Date(issuedAt.getTime() - PASSWORD_RESET_COOLDOWN_MS),
          requestLimitBefore: new Date(issuedAt.getTime() - 60 * 60 * 1000),
        });
      } catch {
        options.onRequestFailure?.(input.requestId);
        return;
      }
      if (!challenge) return;

      try {
        await options.delivery.create({
          template: 'auth.password-reset',
          recipient: challenge.email,
          context: {
            actionUrl: buildAuthActionUrl(options.publicAppUrl, 'reset-password', token),
            expiryDisplay: '1 hour',
          },
          sensitivePayloadExpiresAt: expiresAt,
        });
      } catch {
        options.onRequestFailure?.(input.requestId);
      }
    },

    async confirm(input) {
      if (!isResetToken(input.token)) throw new PasswordResetTokenError();
      if (!isValidPassword(input.password)) throw new PasswordResetPasswordError();

      const passwordHash = await hashPassword(input.password);
      const consumed = await options.repository.consume({
        tokenHash: fingerprintToken(input.token),
        passwordHash,
        now: now(),
        requestId: input.requestId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      if (!consumed) throw new PasswordResetTokenError();
    },
  };
}

function isResetToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
