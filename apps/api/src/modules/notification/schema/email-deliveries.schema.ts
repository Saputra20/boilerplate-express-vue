import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

export const emailDeliveries = pgTable(
  'email_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    template: text('template').notNull(),
    recipientCiphertext: bytea('recipient_ciphertext'),
    recipientNonce: bytea('recipient_nonce'),
    recipientAuthTag: bytea('recipient_auth_tag'),
    recipientKeyVersion: integer('recipient_key_version'),
    status: text('status').default('pending').notNull(),
    encryptedContext: bytea('encrypted_context'),
    nonce: bytea('nonce'),
    authTag: bytea('auth_tag'),
    keyVersion: integer('key_version'),
    attempts: integer('attempts').default(0).notNull(),
    providerMessageId: text('provider_message_id'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    sensitivePayloadExpiresAt: timestamp('sensitive_payload_expires_at', {
      withTimezone: true,
    }).notNull(),
    queuedAt: timestamp('queued_at', { withTimezone: true }),
    processingAt: timestamp('processing_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    uncertainAt: timestamp('uncertain_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'email_deliveries_template_check',
      sql`${table.template} IN ('auth.email-verification', 'auth.password-reset', 'auth.password-changed')`,
    ),
    check(
      'email_deliveries_status_check',
      sql`${table.status} IN ('pending', 'queued', 'processing', 'retrying', 'sent', 'failed', 'uncertain')`,
    ),
    check('email_deliveries_attempts_check', sql`${table.attempts} >= 0`),
    check(
      'email_deliveries_recipient_encryption_fields_check',
      sql`(${table.recipientCiphertext} IS NULL AND ${table.recipientNonce} IS NULL AND ${table.recipientAuthTag} IS NULL AND ${table.recipientKeyVersion} IS NULL) OR (${table.recipientCiphertext} IS NOT NULL AND ${table.recipientNonce} IS NOT NULL AND ${table.recipientAuthTag} IS NOT NULL AND ${table.recipientKeyVersion} IS NOT NULL)`,
    ),
    index('email_deliveries_status_created_index').on(table.status, table.createdAt),
    index('email_deliveries_payload_expiry_index').on(table.sensitivePayloadExpiresAt),
  ],
);
