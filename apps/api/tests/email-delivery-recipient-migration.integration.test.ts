import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool, type PoolClient } from 'pg';
import { API_INTEGRATION_ENABLED, testDatabaseConfig } from './helpers/integration.js';
import { backfillEmailDeliveryRecipients } from '../src/modules/notification/email/recipient-backfill.js';
import { decryptRecipient } from '../src/modules/notification/email/delivery-crypto.js';

const integrationDescribe = API_INTEGRATION_ENABLED ? describe : describe.skip;
const root = new URL('../', import.meta.url);

integrationDescribe('encrypted email delivery recipient migration', () => {
  const pool = new Pool(testDatabaseConfig);
  const key = Buffer.alloc(32, 11);
  let client: PoolClient;
  let schema: string;

  beforeAll(async () => {
    client = await pool.connect();
    schema = `recipient_migration_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`
      CREATE TABLE email_deliveries (
        id uuid PRIMARY KEY,
        recipient text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`INSERT INTO email_deliveries (id, recipient) VALUES ($1, $2), ($3, $4)`, [
      '10000000-0000-4000-8000-000000000001',
      'First.Recipient@example.test',
      '10000000-0000-4000-8000-000000000002',
      'second.recipient@example.test',
    ]);
  });

  afterAll(async () => {
    if (schema) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    client.release();
    await pool.end();
  });

  async function apply(file: string): Promise<void> {
    const source = await readFile(new URL(`drizzle/${file}`, root), 'utf8');
    for (const statement of source.split('--> statement-breakpoint').map((part) => part.trim())) {
      if (statement) await client.query(statement);
    }
  }

  it('backfills existing recipients before removing plaintext storage', async () => {
    await apply('0017_add-encrypted-email-recipient-fields.sql');
    expect(await backfillEmailDeliveryRecipients(client, key)).toEqual({
      migrated: 2,
      verified: 2,
    });

    const rows = await client.query<{
      id: string;
      recipient: string;
      recipient_ciphertext: Buffer;
      recipient_nonce: Buffer;
      recipient_auth_tag: Buffer;
      recipient_key_version: number;
    }>('SELECT * FROM email_deliveries ORDER BY id');
    expect(rows.rows[0]?.recipient).toBe('First.Recipient@example.test');
    expect(
      decryptRecipient(
        {
          ciphertext: rows.rows[0]!.recipient_ciphertext,
          nonce: rows.rows[0]!.recipient_nonce,
          authTag: rows.rows[0]!.recipient_auth_tag,
          keyVersion: rows.rows[0]!.recipient_key_version,
        },
        key,
        rows.rows[0]!.id,
      ),
    ).toBe('first.recipient@example.test');

    const unbackfilledId = '10000000-0000-4000-8000-000000000003';
    await client.query('INSERT INTO email_deliveries (id, recipient) VALUES ($1, $2)', [
      unbackfilledId,
      'third.recipient@example.test',
    ]);
    await expect(apply('0018_remove-plaintext-email-delivery-recipient.sql')).rejects.toThrow();
    expect(await backfillEmailDeliveryRecipients(client, key)).toEqual({
      migrated: 1,
      verified: 3,
    });
    await apply('0018_remove-plaintext-email-delivery-recipient.sql');

    const columns = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'email_deliveries'`,
      [schema],
    );
    expect(columns.rows.map(({ column_name }) => column_name)).not.toContain('recipient');
    expect(columns.rows.map(({ column_name }) => column_name)).toContain('recipient_ciphertext');

    await client.query('BEGIN');
    const down = await readFile(
      new URL('drizzle/0018_remove-plaintext-email-delivery-recipient.down.sql', root),
      'utf8',
    );
    await expect(client.query(down)).rejects.toThrow(
      'Migration 0018 is intentionally irreversible: reverting would restore plaintext recipient PII',
    );
    await client.query('ROLLBACK');

    const afterRejectedDown = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'email_deliveries'`,
      [schema],
    );
    expect(afterRejectedDown.rows.map(({ column_name }) => column_name)).not.toContain('recipient');
    expect(afterRejectedDown.rows.map(({ column_name }) => column_name)).toContain(
      'recipient_ciphertext',
    );
    const encryptedRows = await client.query<{ id: string; recipient_ciphertext: Buffer }>(
      'SELECT id, recipient_ciphertext FROM email_deliveries ORDER BY id',
    );
    expect(encryptedRows.rows).toHaveLength(3);
    expect(encryptedRows.rows.every(({ recipient_ciphertext }) => recipient_ciphertext)).toBe(true);
  });
});
