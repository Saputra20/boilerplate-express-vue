import { randomUUID } from 'node:crypto';
import { UnrecoverableError, type Job, type Queue } from 'bullmq';
import {
  renderEmailVerification,
  renderPasswordChanged,
  renderPasswordReset,
} from './templates.js';
import type {
  EmailDeliveryFailureCategory,
  EmailTransport,
} from '../../../config/email/transport.js';
import { EmailDeliveryError } from '../../../config/email/transport.js';
import type { ActionEmailInput, PasswordChangedEmailInput } from './templates.js';
import {
  decryptContext,
  decryptRecipient,
  encryptContext,
  encryptRecipient,
  type EncryptedContext,
} from './delivery-crypto.js';
import { createEmailDeliveryRepository } from '../repositories/email-delivery.repository.js';

export const EMAIL_JOB_NAMES = [
  'auth.email-verification',
  'auth.password-reset',
  'auth.password-changed',
] as const;
export type EmailJobName = (typeof EMAIL_JOB_NAMES)[number];
export type DeliveryInput =
  | {
      template: 'auth.email-verification' | 'auth.password-reset';
      context: ActionEmailInput;
      recipient: string;
      sensitivePayloadExpiresAt: Date;
    }
  | {
      template: 'auth.password-changed';
      context: PasswordChangedEmailInput;
      recipient: string;
      sensitivePayloadExpiresAt: Date;
    };

type Repository = ReturnType<typeof createEmailDeliveryRepository>;

export function createEmailDeliveryService(options: {
  repository: Repository;
  queue: Queue;
  transport: EmailTransport;
  encryptionKey: Buffer;
  allowLoopbackHttp?: boolean;
  now?: () => Date;
}) {
  const now = options.now ?? (() => new Date());
  async function enqueue(id: string, template: EmailJobName): Promise<void> {
    await options.repository.prepareQueue(id);
    try {
      await options.queue.add(template, { emailDeliveryId: id }, { jobId: id });
    } catch (error) {
      await options.repository.restorePending(id);
      throw error;
    }
  }

  return {
    async create(input: DeliveryInput): Promise<{ emailDeliveryId: string }> {
      const id = randomUUID();
      const encrypted: EncryptedContext = encryptContext(
        input.context,
        options.encryptionKey,
        `${id}:${input.template}`,
      );
      const encryptedRecipient = encryptRecipient(input.recipient, options.encryptionKey, id);
      await options.repository.create({
        id,
        template: input.template,
        recipientCiphertext: encryptedRecipient.ciphertext,
        recipientNonce: encryptedRecipient.nonce,
        recipientAuthTag: encryptedRecipient.authTag,
        recipientKeyVersion: encryptedRecipient.keyVersion,
        status: 'pending',
        encryptedContext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        authTag: encrypted.authTag,
        keyVersion: encrypted.keyVersion,
        sensitivePayloadExpiresAt: input.sensitivePayloadExpiresAt,
      });
      await enqueue(id, input.template);
      return { emailDeliveryId: id };
    },
    async recoverPending(): Promise<number> {
      return recoverDeliveries(options.repository, options.queue, now(), ['pending']);
    },
    async recoverFailed(): Promise<number> {
      return recoverDeliveries(options.repository, options.queue, now(), ['failed']);
    },
    async cleanup(): Promise<{ scrubbed: number; deleted: number }> {
      const scrubbed = await options.repository.scrubExpired(now());
      const deleted = await options.repository.cleanupMetadata(now());
      return { scrubbed: scrubbed.length, deleted: deleted.length };
    },
    async process(job: Job): Promise<{ emailDeliveryId: string; status: string }> {
      const id = (job.data as { emailDeliveryId?: unknown })?.emailDeliveryId;
      if (typeof id !== 'string' || Object.keys(job.data).length !== 1)
        throw new UnrecoverableError('Invalid email job');
      const row = await options.repository.get(id);
      if (!row || row.status === 'sent' || row.status === 'uncertain' || row.status === 'failed')
        return { emailDeliveryId: id, status: row?.status ?? 'missing' };
      const time = now();
      if (
        row.sensitivePayloadExpiresAt <= time ||
        !row.encryptedContext ||
        !row.nonce ||
        !row.authTag ||
        row.keyVersion === null ||
        !row.recipientCiphertext ||
        !row.recipientNonce ||
        !row.recipientAuthTag ||
        row.recipientKeyVersion === null
      ) {
        await options.repository.markExpired(id, time);
        throw terminalFailure('EXPIRED');
      }
      if (row.status === 'processing') {
        await options.repository.markUncertain(id, time, 'INTERRUPTED_PROCESSING');
        throw new UnrecoverableError('Email delivery outcome is unknown');
      }
      const claimed = await options.repository.claim(id, time);
      if (!claimed) return { emailDeliveryId: id, status: 'not-claimable' };
      if (
        !claimed.encryptedContext ||
        !claimed.nonce ||
        !claimed.authTag ||
        claimed.keyVersion === null ||
        !claimed.recipientCiphertext ||
        !claimed.recipientNonce ||
        !claimed.recipientAuthTag ||
        claimed.recipientKeyVersion === null
      ) {
        await options.repository.markExpired(id, now());
        throw terminalFailure('EXPIRED');
      }
      const encryptedContext: EncryptedContext = {
        ciphertext: claimed.encryptedContext,
        nonce: claimed.nonce,
        authTag: claimed.authTag,
        keyVersion: claimed.keyVersion,
      };
      try {
        const context = decryptContext<Record<string, unknown>>(
          encryptedContext,
          options.encryptionKey,
          `${id}:${claimed.template}`,
        );
        const recipient = decryptRecipient(
          {
            ciphertext: claimed.recipientCiphertext,
            nonce: claimed.recipientNonce,
            authTag: claimed.recipientAuthTag,
            keyVersion: claimed.recipientKeyVersion,
          },
          options.encryptionKey,
          id,
        );
        const rendered = render(claimed.template, context, options.allowLoopbackHttp ?? false);
        const result = await options.transport.send({ to: recipient, ...rendered });
        await options.repository.markSent(id, now(), result.messageId);
        return { emailDeliveryId: id, status: 'sent' };
      } catch (error) {
        if (error instanceof EmailDeliveryError && error.kind === 'uncertain') {
          await options.repository.markUncertain(id, now(), 'PROVIDER_OUTCOME_UNKNOWN');
          throw terminalFailure('PROVIDER_OUTCOME_UNKNOWN');
        }
        if (error instanceof EmailDeliveryError && error.kind === 'retryable') {
          const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 5);
          await options.repository.markFailure(
            id,
            now(),
            finalAttempt ? 'failed' : 'retrying',
            'TRANSIENT_PROVIDER_FAILURE',
            false,
          );
          if (!finalAttempt) {
            throw error;
          }
          throw terminalFailure('TRANSIENT_PROVIDER_FAILURE');
        }
        await options.repository.markFailure(
          id,
          now(),
          'failed',
          'PERMANENT_DELIVERY_FAILURE',
          true,
        );
        throw terminalFailure('PERMANENT_DELIVERY_FAILURE');
      }
    },
  };
}

export type EmailDeliveryService = ReturnType<typeof createEmailDeliveryService>;

function terminalFailure(
  failureCategory: EmailDeliveryFailureCategory,
): UnrecoverableError & { failureCategory: EmailDeliveryFailureCategory } {
  const error = new UnrecoverableError(failureCategory);
  return Object.assign(error, { failureCategory });
}

function render(template: string, context: Record<string, unknown>, allowLoopbackHttp: boolean) {
  if (template === 'auth.email-verification')
    return renderEmailVerification(context as Parameters<typeof renderEmailVerification>[0], {
      allowLoopbackHttp,
    });
  if (template === 'auth.password-reset')
    return renderPasswordReset(context as Parameters<typeof renderPasswordReset>[0], {
      allowLoopbackHttp,
    });
  if (template === 'auth.password-changed')
    return renderPasswordChanged(context as Parameters<typeof renderPasswordChanged>[0]);
  throw new UnrecoverableError('Unsupported email template');
}

async function recoverDeliveries(
  repository: Repository,
  queue: Queue,
  now: Date,
  allowedStatuses: string[],
): Promise<number> {
  const rows = await repository.recoverable(now, allowedStatuses);
  let count = 0;
  for (const row of rows) {
    if (!EMAIL_JOB_NAMES.includes(row.template as EmailJobName)) continue;
    await repository.prepareQueue(row.id);
    try {
      const existingJob = await queue.getJob(row.id);
      if (existingJob && (await existingJob.getState()) === 'failed') {
        await existingJob.retry('failed');
      } else if (!existingJob) {
        await queue.add(row.template, { emailDeliveryId: row.id }, { jobId: row.id });
      }
      count += 1;
    } catch (error) {
      await repository.restoreStatus(row.id, allowedStatuses[0]!);
      throw error;
    }
  }
  return count;
}
