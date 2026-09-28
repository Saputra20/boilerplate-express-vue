import { inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from '../src/config/database/client.js';
import { emailDeliveries } from '../src/config/drizzle/schema/index.js';
import { createEmailDeliveryRepository } from '../src/modules/notification/repositories/email-delivery.repository.js';
import {
  decryptRecipient,
  encryptRecipient,
} from '../src/modules/notification/email/delivery-crypto.js';
import { API_INTEGRATION_ENABLED, testDatabaseConfig } from './helpers/integration.js';

const integrationDescribe = API_INTEGRATION_ENABLED ? describe : describe.skip;

integrationDescribe('email delivery PostgreSQL integration', () => {
  const ids: string[] = [];
  const database = createDatabase(testDatabaseConfig);
  const repository = createEmailDeliveryRepository(database.db);
  const now = new Date('2026-09-26T00:00:00Z');

  beforeAll(async () => {
    await database.initialize();
    await migrate(database.db, {
      migrationsFolder: resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle'),
    });
  });

  afterAll(async () => {
    if (ids.length > 0) {
      await database.db.delete(emailDeliveries).where(inArray(emailDeliveries.id, ids));
    }
    await database.close();
  });

  async function createRow(
    status: string,
    sensitivePayloadExpiresAt = new Date('2026-09-27T00:00:00Z'),
  ): Promise<string> {
    const id = randomUUID();
    const encryptedRecipient = encryptRecipient(
      'integration-only@example.test',
      Buffer.alloc(32, 3),
      id,
    );
    const row = await repository.create({
      id,
      template: 'auth.password-reset',
      recipientCiphertext: encryptedRecipient.ciphertext,
      recipientNonce: encryptedRecipient.nonce,
      recipientAuthTag: encryptedRecipient.authTag,
      recipientKeyVersion: encryptedRecipient.keyVersion,
      status,
      encryptedContext: Buffer.from('encrypted-fixture'),
      nonce: Buffer.alloc(12, 1),
      authTag: Buffer.alloc(16, 2),
      keyVersion: 1,
      sensitivePayloadExpiresAt,
    });
    ids.push(row.id);
    return row.id;
  }

  it('claims a delivery atomically and scrubs its context after successful send', async () => {
    const id = await createRow('queued');
    const claimed = await repository.claim(id, now);
    expect(claimed?.status).toBe('processing');
    expect(claimed?.attempts).toBe(1);

    await repository.markSent(id, now, 'provider-fixture-id');
    const sent = await repository.get(id);
    expect(sent).toMatchObject({ status: 'sent', providerMessageId: 'provider-fixture-id' });
    expect(sent).toMatchObject({
      encryptedContext: null,
      nonce: null,
      authTag: null,
      keyVersion: null,
      recipientCiphertext: null,
      recipientNonce: null,
      recipientAuthTag: null,
      recipientKeyVersion: null,
    });
  });

  it('persists recipient only as authenticated ciphertext', async () => {
    const id = await createRow('queued');
    const row = await repository.get(id);

    expect(row).toBeDefined();
    expect(row).not.toHaveProperty('recipient');
    expect(row?.recipientCiphertext?.toString('utf8')).not.toContain(
      'integration-only@example.test',
    );
    expect(
      decryptRecipient(
        {
          ciphertext: row?.recipientCiphertext as Buffer,
          nonce: row?.recipientNonce as Buffer,
          authTag: row?.recipientAuthTag as Buffer,
          keyVersion: row?.recipientKeyVersion as number,
        },
        Buffer.alloc(32, 3),
        id,
      ),
    ).toBe('integration-only@example.test');
  });

  it('scrubs expired encrypted payloads and retains valid failed rows for recovery', async () => {
    const expiredId = await createRow('failed', new Date('2026-09-25T00:00:00Z'));
    const validFailedId = await createRow('failed');
    const uncertainId = await createRow('uncertain');

    expect((await repository.scrubExpired(now)).map(({ id }) => id)).toContain(expiredId);
    const recoverable = await repository.recoverable(now, ['failed']);
    expect(recoverable.map(({ id }) => id)).toContain(validFailedId);
    expect(recoverable.map(({ id }) => id)).not.toContain(expiredId);
    expect(recoverable.map(({ id }) => id)).not.toContain(uncertainId);
  });

  it('cleans sent and failed metadata at their separate retention boundaries', async () => {
    const oldSentId = await createRow('sent');
    const recentSentId = await createRow('sent');
    const oldFailedId = await createRow('failed');
    const oldUncertainId = await createRow('uncertain');
    const recentFailedId = await createRow('failed');
    await database.db
      .update(emailDeliveries)
      .set({ sentAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000) })
      .where(inArray(emailDeliveries.id, [oldSentId]));
    await database.db
      .update(emailDeliveries)
      .set({ sentAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) })
      .where(inArray(emailDeliveries.id, [recentSentId]));
    await database.db
      .update(emailDeliveries)
      .set({ failedAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000) })
      .where(inArray(emailDeliveries.id, [oldFailedId]));
    await database.db
      .update(emailDeliveries)
      .set({ uncertainAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000) })
      .where(inArray(emailDeliveries.id, [oldUncertainId]));
    await database.db
      .update(emailDeliveries)
      .set({ failedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) })
      .where(inArray(emailDeliveries.id, [recentFailedId]));

    const deletedIds = (await repository.cleanupMetadata(now)).map(({ id }) => id);
    expect(deletedIds).toEqual(expect.arrayContaining([oldSentId, oldFailedId, oldUncertainId]));
    expect(deletedIds).not.toContain(recentSentId);
    expect(deletedIds).not.toContain(recentFailedId);
  });
});
