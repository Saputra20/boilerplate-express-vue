import type { PoolClient, QueryResult } from 'pg';
import { decryptRecipient, encryptRecipient } from './delivery-crypto.js';

const BATCH_SIZE = 100;

export async function backfillEmailDeliveryRecipients(
  client: PoolClient,
  encryptionKey: Buffer,
): Promise<{ migrated: number; verified: number }> {
  let migrated = 0;

  while (true) {
    await client.query('BEGIN');
    try {
      const result = await client.query<{ id: string; recipient: string }>(
        `SELECT id, recipient
         FROM email_deliveries
         WHERE recipient IS NOT NULL AND recipient_ciphertext IS NULL
         ORDER BY id
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [BATCH_SIZE],
      );

      if (result.rows.length === 0) {
        await client.query('COMMIT');
        break;
      }

      for (const row of result.rows) {
        const encrypted = encryptRecipient(row.recipient, encryptionKey, row.id);
        const updated = await client.query(
          `UPDATE email_deliveries
           SET recipient_ciphertext = $1,
               recipient_nonce = $2,
               recipient_auth_tag = $3,
               recipient_key_version = $4,
               updated_at = now()
           WHERE id = $5 AND recipient_ciphertext IS NULL`,
          [encrypted.ciphertext, encrypted.nonce, encrypted.authTag, encrypted.keyVersion, row.id],
        );
        if (updated.rowCount !== 1) throw new Error('Recipient backfill row changed concurrently');
        migrated += 1;
      }

      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK').catch(() => undefined);
      throw new Error('Email delivery recipient backfill failed');
    }
  }

  let verified = 0;
  let afterId: string | null = null;
  while (true) {
    const result: QueryResult<{
      id: string;
      recipient: string;
      recipient_ciphertext: Buffer;
      recipient_nonce: Buffer;
      recipient_auth_tag: Buffer;
      recipient_key_version: number;
    }> = await client.query(
      `SELECT id, recipient, recipient_ciphertext, recipient_nonce,
              recipient_auth_tag, recipient_key_version
       FROM email_deliveries
       WHERE recipient IS NOT NULL AND recipient_ciphertext IS NOT NULL
         AND ($1::uuid IS NULL OR id > $1::uuid)
       ORDER BY id
       LIMIT $2`,
      [afterId, BATCH_SIZE],
    );
    if (result.rows.length === 0) break;

    for (const row of result.rows) {
      const recipient = decryptRecipient(
        {
          ciphertext: row.recipient_ciphertext,
          nonce: row.recipient_nonce,
          authTag: row.recipient_auth_tag,
          keyVersion: row.recipient_key_version,
        },
        encryptionKey,
        row.id,
      );
      if (recipient !== row.recipient.toLowerCase())
        throw new Error('Email delivery recipient backfill verification failed');
      verified += 1;
    }
    afterId = result.rows.at(-1)!.id;
  }

  if (verified < migrated) throw new Error('Email delivery recipient backfill verification failed');
  const incomplete = await client.query(
    `SELECT 1 FROM email_deliveries
     WHERE recipient_ciphertext IS NULL OR recipient_nonce IS NULL
       OR recipient_auth_tag IS NULL OR recipient_key_version IS NULL
     LIMIT 1`,
  );
  if (incomplete.rowCount !== 0)
    throw new Error('Email delivery recipient backfill verification failed');
  return { migrated, verified };
}
