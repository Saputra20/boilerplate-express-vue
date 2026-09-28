import type { Queue, Job } from 'bullmq';
import type { EmailTransport } from '../src/config/email/transport.js';
import {
  createEmailDeliveryService,
  type EmailJobName,
} from '../src/modules/notification/email/delivery.service.js';
import { EmailDeliveryError } from '../src/config/email/transport.js';
import {
  decryptContext,
  decryptRecipient,
} from '../src/modules/notification/email/delivery-crypto.js';

const key = Buffer.alloc(32, 4);
const template: EmailJobName = 'auth.password-reset';

function createHarness(
  send: EmailTransport['send'] = async () => ({ messageId: 'provider-id' }),
  allowLoopbackHttp = false,
  encryptionKey = key,
) {
  let row: Record<string, unknown> | undefined;
  let queued: { name: string; data: unknown; options: unknown } | undefined;
  let sendCount = 0;
  const repository = {
    async create(values: Record<string, unknown>) {
      row = { ...values };
      return row;
    },
    async prepareQueue() {
      if (row) row.status = 'queued';
    },
    async restorePending() {
      if (row) row.status = 'pending';
    },
    async get() {
      return row;
    },
    async claim() {
      if (!row) return undefined;
      row.status = 'processing';
      return row;
    },
    async markSent(_id: string, _now: Date, providerMessageId?: string) {
      if (row) {
        row.status = 'sent';
        row.providerMessageId = providerMessageId;
        row.encryptedContext = null;
        row.nonce = null;
        row.authTag = null;
        row.keyVersion = null;
        row.recipientCiphertext = null;
        row.recipientNonce = null;
        row.recipientAuthTag = null;
        row.recipientKeyVersion = null;
      }
    },
    async markFailure(_id: string, _now: Date, status: string, _code: string, scrub: boolean) {
      if (!row) return;
      row.status = status;
      if (scrub) {
        row.encryptedContext = null;
        row.nonce = null;
        row.authTag = null;
        row.keyVersion = null;
        row.recipientCiphertext = null;
        row.recipientNonce = null;
        row.recipientAuthTag = null;
        row.recipientKeyVersion = null;
      }
    },
    async markUncertain() {
      if (row) row.status = 'uncertain';
    },
    async markExpired() {
      if (row) {
        row.status = 'failed';
        row.encryptedContext = null;
        row.nonce = null;
        row.authTag = null;
        row.keyVersion = null;
        row.recipientCiphertext = null;
        row.recipientNonce = null;
        row.recipientAuthTag = null;
        row.recipientKeyVersion = null;
      }
    },
    async scrubExpired() {
      return [];
    },
    async cleanupMetadata() {
      return [];
    },
    async recoverable(_now: Date, statuses: string[]) {
      if (
        row &&
        statuses.includes(String(row.status)) &&
        row.encryptedContext &&
        row.sensitivePayloadExpiresAt instanceof Date &&
        row.sensitivePayloadExpiresAt > new Date('2026-09-26T00:00:00Z')
      ) {
        return [{ id: row.id as string, template: row.template as string }];
      }
      return [];
    },
  };
  const queue = {
    async add(name: string, data: unknown, options: unknown) {
      queued = { name, data, options };
    },
    async getJob() {
      return undefined;
    },
  };
  const transport: EmailTransport = {
    async send(message) {
      sendCount += 1;
      return send(message);
    },
    async close() {},
  };
  const service = createEmailDeliveryService({
    repository: repository as never,
    queue: queue as unknown as Queue,
    transport,
    encryptionKey,
    allowLoopbackHttp,
    now: () => new Date('2026-09-26T00:00:00Z'),
  });
  return {
    service,
    get row() {
      return row;
    },
    get queued() {
      return queued;
    },
    get sendCount() {
      return sendCount;
    },
    encryptionKey,
  };
}

describe('email delivery service', () => {
  it('passes the explicitly configured local URL policy to the renderer', async () => {
    const harness = createHarness(undefined, true);
    const { emailDeliveryId } = await harness.service.create({
      template: 'auth.email-verification',
      recipient: 'private-recipient@example.test',
      context: {
        actionUrl: 'http://localhost:5173/verify-email?token=fixture-token',
        expiryDisplay: '24 hours',
      },
      sensitivePayloadExpiresAt: new Date('2026-09-27T00:00:00Z'),
    });

    await harness.service.process({
      data: { emailDeliveryId },
      attemptsMade: 0,
      opts: { attempts: 5 },
    } as Job);
    expect(harness.row?.status).toBe('sent');
    expect(harness.sendCount).toBe(1);
  });

  it('fails safely when encrypted recipient data is corrupted or the key is wrong', async () => {
    const malformed = createHarness();
    const malformedDelivery = await malformed.service.create({
      template,
      recipient: 'private-recipient@example.test',
      context: { actionUrl: 'https://example.test/reset/fixture-token', expiryDisplay: 'one hour' },
      sensitivePayloadExpiresAt: new Date('2026-09-27T00:00:00Z'),
    });
    malformed.row!.recipientCiphertext = Buffer.from('malformed');

    await expect(
      malformed.service.process({
        data: { emailDeliveryId: malformedDelivery.emailDeliveryId },
        attemptsMade: 0,
        opts: { attempts: 5 },
      } as Job),
    ).rejects.toMatchObject({ name: 'UnrecoverableError' });
    expect(malformed.sendCount).toBe(0);
    expect(malformed.row?.recipientCiphertext).toBeNull();

    const wrongKeyBytes = Buffer.alloc(32, 8);
    const wrongKey = createHarness(undefined, false, wrongKeyBytes);
    const wrongKeyDelivery = await wrongKey.service.create({
      template,
      recipient: 'private-recipient@example.test',
      context: { actionUrl: 'https://example.test/reset/fixture-token', expiryDisplay: 'one hour' },
      sensitivePayloadExpiresAt: new Date('2026-09-27T00:00:00Z'),
    });
    wrongKeyBytes.fill(9);

    await expect(
      wrongKey.service.process({
        data: { emailDeliveryId: wrongKeyDelivery.emailDeliveryId },
        attemptsMade: 0,
        opts: { attempts: 5 },
      } as Job),
    ).rejects.toMatchObject({ name: 'UnrecoverableError' });
    expect(wrongKey.sendCount).toBe(0);
    expect(wrongKey.row?.recipientCiphertext).toBeNull();
  });

  it('queues only an opaque ID and decrypts context only in the worker path', async () => {
    const harness = createHarness();
    const context = {
      actionUrl: 'https://example.test/reset/fixture-token',
      expiryDisplay: 'one hour',
    };
    const { emailDeliveryId } = await harness.service.create({
      template,
      recipient: 'private-recipient@example.test',
      context,
      sensitivePayloadExpiresAt: new Date('2026-09-27T00:00:00Z'),
    });

    expect(harness.queued).toEqual({
      name: template,
      data: { emailDeliveryId },
      options: { jobId: emailDeliveryId },
    });
    expect(JSON.stringify(harness.queued)).not.toContain('fixture-token');
    expect(JSON.stringify(harness.queued)).not.toContain('private-recipient@example.test');
    expect(harness.row?.recipient).toBeUndefined();
    expect((harness.row?.recipientCiphertext as Buffer).toString('utf8')).not.toContain(
      'private-recipient@example.test',
    );
    expect(
      decryptRecipient(
        {
          ciphertext: harness.row?.recipientCiphertext as Buffer,
          nonce: harness.row?.recipientNonce as Buffer,
          authTag: harness.row?.recipientAuthTag as Buffer,
          keyVersion: harness.row?.recipientKeyVersion as number,
        },
        key,
        emailDeliveryId,
      ),
    ).toBe('private-recipient@example.test');
    expect(harness.row?.encryptedContext).not.toBeNull();
    const restored = decryptContext(
      {
        ciphertext: harness.row!.encryptedContext as Buffer,
        nonce: harness.row!.nonce as Buffer,
        authTag: harness.row!.authTag as Buffer,
        keyVersion: harness.row!.keyVersion as number,
      },
      key,
      `${emailDeliveryId}:${template}`,
    );
    expect(restored).toEqual(context);

    await harness.service.process({
      data: { emailDeliveryId },
      attemptsMade: 0,
      opts: { attempts: 5 },
    } as Job);
    expect(harness.row?.status).toBe('sent');
    expect(harness.row?.encryptedContext).toBeNull();
    expect(harness.row?.recipientCiphertext).toBeNull();
    await harness.service.process({
      data: { emailDeliveryId },
      attemptsMade: 0,
      opts: { attempts: 5 },
    } as Job);
    expect(harness.sendCount).toBe(1);
  });

  it('exposes only a bounded failure category for operator inspection', async () => {
    const harness = createHarness(async () => {
      throw new EmailDeliveryError('retryable');
    });
    const { emailDeliveryId } = await harness.service.create({
      template,
      recipient: 'private-recipient@example.test',
      context: {
        actionUrl: 'https://example.test/reset?token=fixture-secret',
        expiryDisplay: '1 hour',
      },
      sensitivePayloadExpiresAt: new Date('2026-09-27T00:00:00Z'),
    });

    await expect(
      harness.service.process({
        data: { emailDeliveryId },
        attemptsMade: 0,
        opts: { attempts: 5 },
      } as Job),
    ).rejects.toMatchObject({
      message: 'Email delivery failed',
      failureCategory: 'TRANSIENT_PROVIDER_FAILURE',
    });
    expect(JSON.stringify(harness.queued)).not.toContain('private-recipient@example.test');
    expect(JSON.stringify(harness.queued)).not.toContain('fixture-secret');
  });

  it('marks an ambiguous provider result uncertain and does not retry', async () => {
    const harness = createHarness(async () => {
      throw new EmailDeliveryError('uncertain');
    });
    const { emailDeliveryId } = await harness.service.create({
      template,
      recipient: 'private-recipient@example.test',
      context: { actionUrl: 'https://example.test/reset/fixture-token', expiryDisplay: 'one hour' },
      sensitivePayloadExpiresAt: new Date('2026-09-27T00:00:00Z'),
    });
    await expect(
      harness.service.process({
        data: { emailDeliveryId },
        attemptsMade: 0,
        opts: { attempts: 5 },
      } as Job),
    ).rejects.toMatchObject({ name: 'UnrecoverableError' });
    expect(harness.row?.status).toBe('uncertain');
    expect(harness.sendCount).toBe(1);
  });

  it('retries definite transient failures and retains valid context after exhaustion', async () => {
    const harness = createHarness(async () => {
      throw new EmailDeliveryError('retryable');
    });
    const { emailDeliveryId } = await harness.service.create({
      template,
      recipient: 'private-recipient@example.test',
      context: { actionUrl: 'https://example.test/reset/fixture-token', expiryDisplay: 'one hour' },
      sensitivePayloadExpiresAt: new Date('2026-09-27T00:00:00Z'),
    });
    const job = (attemptsMade: number) =>
      ({ data: { emailDeliveryId }, attemptsMade, opts: { attempts: 5 } }) as Job;

    await expect(harness.service.process(job(0))).rejects.toMatchObject({ kind: 'retryable' });
    expect(harness.row?.status).toBe('retrying');
    await expect(harness.service.process(job(4))).rejects.toMatchObject({
      name: 'UnrecoverableError',
    });
    expect(harness.row?.status).toBe('failed');
    expect(harness.row?.encryptedContext).toBeDefined();
  });

  it('marks permanent provider failures unrecoverable and scrubs sensitive context', async () => {
    const harness = createHarness(async () => {
      throw new EmailDeliveryError('permanent');
    });
    const { emailDeliveryId } = await harness.service.create({
      template,
      recipient: 'private-recipient@example.test',
      context: { actionUrl: 'https://example.test/reset/fixture-token', expiryDisplay: 'one hour' },
      sensitivePayloadExpiresAt: new Date('2026-09-27T00:00:00Z'),
    });

    await expect(
      harness.service.process({
        data: { emailDeliveryId },
        attemptsMade: 0,
        opts: { attempts: 5 },
      } as Job),
    ).rejects.toMatchObject({ name: 'UnrecoverableError' });
    expect(harness.row).toMatchObject({
      status: 'failed',
      encryptedContext: null,
      nonce: null,
      authTag: null,
      keyVersion: null,
    });
  });

  it('recovers pending and valid failed rows with the same opaque ID', async () => {
    const harness = createHarness();
    const { emailDeliveryId } = await harness.service.create({
      template,
      recipient: 'private-recipient@example.test',
      context: { actionUrl: 'https://example.test/reset/fixture-token', expiryDisplay: 'one hour' },
      sensitivePayloadExpiresAt: new Date('2026-09-27T00:00:00Z'),
    });
    if (!harness.row) throw new Error('Expected test delivery row');

    harness.row.status = 'pending';
    expect(await harness.service.recoverPending()).toBe(1);
    expect(harness.queued?.data).toEqual({ emailDeliveryId });
    harness.row.status = 'failed';
    expect(await harness.service.recoverFailed()).toBe(1);
    harness.row.status = 'uncertain';
    expect(await harness.service.recoverFailed()).toBe(0);
    harness.row.status = 'failed';
    harness.row.sensitivePayloadExpiresAt = new Date('2026-09-25T00:00:00Z');
    expect(await harness.service.recoverFailed()).toBe(0);
  });

  it('does not send expired context and scrubs all encryption fields', async () => {
    const harness = createHarness();
    const { emailDeliveryId } = await harness.service.create({
      template,
      recipient: 'private-recipient@example.test',
      context: { actionUrl: 'https://example.test/reset/fixture-token', expiryDisplay: 'one hour' },
      sensitivePayloadExpiresAt: new Date('2026-09-25T00:00:00Z'),
    });
    await expect(
      harness.service.process({
        data: { emailDeliveryId },
        attemptsMade: 0,
        opts: { attempts: 5 },
      } as Job),
    ).rejects.toMatchObject({ name: 'UnrecoverableError' });
    expect(harness.row).toMatchObject({
      status: 'failed',
      encryptedContext: null,
      nonce: null,
      authTag: null,
      keyVersion: null,
    });
    expect(harness.sendCount).toBe(0);
  });
});
