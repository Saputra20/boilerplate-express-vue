import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { loadDatabaseConfig } from '../src/config/database/config.js';
import { loadEnv } from '../src/config/env.js';
import { backfillEmailDeliveryRecipients } from '../src/modules/notification/email/recipient-backfill.js';

export async function runEmailDeliveryRecipientBackfill(): Promise<{
  migrated: number;
  verified: number;
}> {
  const env = loadEnv();
  if (!env.EMAIL_DELIVERY_ENCRYPTION_KEY)
    throw new Error('EMAIL_DELIVERY_ENCRYPTION_KEY is required for recipient backfill');

  const pool = new Pool(loadDatabaseConfig(env));
  try {
    const client = await pool.connect();
    try {
      return await backfillEmailDeliveryRecipients(
        client,
        Buffer.from(env.EMAIL_DELIVERY_ENCRYPTION_KEY, 'hex'),
      );
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  runEmailDeliveryRecipientBackfill()
    .then(({ migrated, verified }) =>
      console.log(`Encrypted and verified ${verified} recipients; newly encrypted ${migrated}`),
    )
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'Recipient backfill failed');
      process.exitCode = 1;
    });
}
