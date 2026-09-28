import { and, eq, gt, inArray, isNotNull, lt, lte, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { emailDeliveries } from '../../../config/drizzle/schema/index.js';

type Database = NodePgDatabase<typeof import('../../../config/drizzle/schema/index.js')>;

export function createEmailDeliveryRepository(db: Database) {
  return {
    async create(values: typeof emailDeliveries.$inferInsert) {
      const [row] = await db.insert(emailDeliveries).values(values).returning();
      if (!row) throw new Error('Email delivery persistence failed');
      return row;
    },
    async get(id: string) {
      const [row] = await db
        .select()
        .from(emailDeliveries)
        .where(eq(emailDeliveries.id, id))
        .limit(1);
      return row;
    },
    async prepareQueue(id: string) {
      await db
        .update(emailDeliveries)
        .set({ status: 'queued', queuedAt: new Date(), updatedAt: new Date() })
        .where(
          and(eq(emailDeliveries.id, id), inArray(emailDeliveries.status, ['pending', 'failed'])),
        );
    },
    async restorePending(id: string) {
      await this.restoreStatus(id, 'pending');
    },
    async restoreStatus(id: string, status: string) {
      await db
        .update(emailDeliveries)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(emailDeliveries.id, id), eq(emailDeliveries.status, 'queued')));
    },
    async claim(id: string, now: Date) {
      const [row] = await db
        .update(emailDeliveries)
        .set({
          status: 'processing',
          processingAt: now,
          attempts: sql`${emailDeliveries.attempts} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(emailDeliveries.id, id),
            inArray(emailDeliveries.status, ['queued', 'retrying']),
            gt(emailDeliveries.sensitivePayloadExpiresAt, now),
            isNotNull(emailDeliveries.encryptedContext),
          ),
        )
        .returning();
      return row;
    },
    async markUncertain(id: string, now: Date, code: string) {
      await db
        .update(emailDeliveries)
        .set({
          status: 'uncertain',
          uncertainAt: now,
          errorCode: code,
          errorMessage: 'Delivery outcome is unknown',
          updatedAt: now,
        })
        .where(and(eq(emailDeliveries.id, id), eq(emailDeliveries.status, 'processing')));
    },
    async markSent(id: string, now: Date, providerMessageId?: string) {
      await db
        .update(emailDeliveries)
        .set({
          status: 'sent',
          sentAt: now,
          providerMessageId,
          encryptedContext: null,
          nonce: null,
          authTag: null,
          keyVersion: null,
          recipientCiphertext: null,
          recipientNonce: null,
          recipientAuthTag: null,
          recipientKeyVersion: null,
          updatedAt: now,
        })
        .where(and(eq(emailDeliveries.id, id), eq(emailDeliveries.status, 'processing')));
    },
    async markFailure(
      id: string,
      now: Date,
      status: 'retrying' | 'failed',
      code: string,
      scrub: boolean,
    ) {
      await db
        .update(emailDeliveries)
        .set({
          status,
          failedAt: status === 'failed' ? now : null,
          errorCode: code,
          errorMessage: status === 'failed' ? 'Email delivery failed' : null,
          ...(scrub
            ? {
                encryptedContext: null,
                nonce: null,
                authTag: null,
                keyVersion: null,
                recipientCiphertext: null,
                recipientNonce: null,
                recipientAuthTag: null,
                recipientKeyVersion: null,
              }
            : {}),
          updatedAt: now,
        })
        .where(and(eq(emailDeliveries.id, id), eq(emailDeliveries.status, 'processing')));
    },
    async recoverable(now: Date, statuses: string[]) {
      return db
        .select({ id: emailDeliveries.id, template: emailDeliveries.template })
        .from(emailDeliveries)
        .where(
          and(
            inArray(emailDeliveries.status, statuses),
            gt(emailDeliveries.sensitivePayloadExpiresAt, now),
            isNotNull(emailDeliveries.encryptedContext),
          ),
        );
    },
    async markExpired(id: string, now: Date) {
      await db
        .update(emailDeliveries)
        .set({
          status: 'failed',
          failedAt: now,
          errorCode: 'EXPIRED',
          errorMessage: 'Delivery context expired',
          encryptedContext: null,
          nonce: null,
          authTag: null,
          keyVersion: null,
          recipientCiphertext: null,
          recipientNonce: null,
          recipientAuthTag: null,
          recipientKeyVersion: null,
          updatedAt: now,
        })
        .where(eq(emailDeliveries.id, id));
    },
    async scrubExpired(now: Date) {
      return db
        .update(emailDeliveries)
        .set({
          encryptedContext: null,
          nonce: null,
          authTag: null,
          keyVersion: null,
          recipientCiphertext: null,
          recipientNonce: null,
          recipientAuthTag: null,
          recipientKeyVersion: null,
          updatedAt: now,
        })
        .where(
          and(
            lte(emailDeliveries.sensitivePayloadExpiresAt, now),
            isNotNull(emailDeliveries.encryptedContext),
          ),
        )
        .returning({ id: emailDeliveries.id });
    },
    async cleanupMetadata(now: Date) {
      const sentBefore = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const failedBefore = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return db
        .delete(emailDeliveries)
        .where(
          or(
            and(eq(emailDeliveries.status, 'sent'), lt(emailDeliveries.sentAt, sentBefore)),
            and(eq(emailDeliveries.status, 'failed'), lt(emailDeliveries.failedAt, failedBefore)),
            and(
              eq(emailDeliveries.status, 'uncertain'),
              lt(emailDeliveries.uncertainAt, failedBefore),
            ),
          ),
        )
        .returning({ id: emailDeliveries.id });
    },
  };
}
