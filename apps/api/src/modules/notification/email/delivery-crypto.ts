import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';

export type EncryptedContext = {
  ciphertext: Buffer;
  nonce: Buffer;
  authTag: Buffer;
  keyVersion: number;
};

export function encryptContext(context: unknown, key: Buffer, aad: string): EncryptedContext {
  if (key.length !== 32) throw new Error('Invalid email encryption key');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(context), 'utf8'),
    cipher.final(),
  ]);
  return { ciphertext, nonce, authTag: cipher.getAuthTag(), keyVersion: 1 };
}

export function decryptContext<T>(encrypted: EncryptedContext, key: Buffer, aad: string): T {
  if (key.length !== 32 || encrypted.keyVersion !== 1)
    throw new Error('Invalid email encryption key');
  const decipher = createDecipheriv('aes-256-gcm', key, encrypted.nonce);
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(encrypted.authTag);
  return JSON.parse(
    Buffer.concat([decipher.update(encrypted.ciphertext), decipher.final()]).toString('utf8'),
  ) as T;
}

export function encryptRecipient(
  recipient: string,
  key: Buffer,
  deliveryId: string,
): EncryptedContext {
  const parsed = z.email().safeParse(recipient);
  if (!parsed.success) throw new Error('Invalid email recipient');
  return encryptContext(
    { recipient: parsed.data.toLowerCase() },
    key,
    `email-delivery-recipient:${deliveryId}`,
  );
}

export function decryptRecipient(
  encrypted: EncryptedContext,
  key: Buffer,
  deliveryId: string,
): string {
  try {
    const payload = decryptContext<{ recipient?: unknown }>(
      encrypted,
      key,
      `email-delivery-recipient:${deliveryId}`,
    );
    const parsed = z.email().safeParse(payload.recipient);
    if (!parsed.success) throw new Error('Invalid recipient payload');
    return parsed.data.toLowerCase();
  } catch {
    throw new Error('Email recipient decryption failed');
  }
}
