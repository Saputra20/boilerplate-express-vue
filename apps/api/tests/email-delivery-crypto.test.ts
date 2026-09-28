import {
  decryptContext,
  decryptRecipient,
  encryptContext,
  encryptRecipient,
} from '../src/modules/notification/email/delivery-crypto.js';

describe('email delivery context encryption', () => {
  const key = Buffer.alloc(32, 7);

  it('encrypts and decrypts context bound to the delivery and template', () => {
    const encrypted = encryptContext(
      { actionUrl: 'https://example.test/token/fixture' },
      key,
      'delivery-1:auth.password-reset',
    );
    expect(encrypted.ciphertext.toString()).not.toContain('https://example.test');
    expect(encrypted.nonce).toHaveLength(12);
    expect(encrypted.authTag).toHaveLength(16);
    expect(decryptContext(encrypted, key, 'delivery-1:auth.password-reset')).toEqual({
      actionUrl: 'https://example.test/token/fixture',
    });
    expect(() => decryptContext(encrypted, key, 'delivery-2:auth.password-reset')).toThrow();
  });

  it('rejects a key with an invalid size', () => {
    expect(() => encryptContext({}, Buffer.alloc(8), 'bound')).toThrow(
      'Invalid email encryption key',
    );
  });

  it('encrypts normalized recipients with delivery-specific authenticated context', () => {
    const encrypted = encryptRecipient('Private-Recipient@example.test', key, 'delivery-1');

    expect(encrypted.ciphertext.toString('utf8')).not.toContain('private-recipient@example.test');
    expect(decryptRecipient(encrypted, key, 'delivery-1')).toBe('private-recipient@example.test');
    expect(() => decryptRecipient(encrypted, Buffer.alloc(32, 8), 'delivery-1')).toThrow(
      'Email recipient decryption failed',
    );
    expect(() =>
      decryptRecipient({ ...encrypted, authTag: Buffer.alloc(16) }, key, 'delivery-1'),
    ).toThrow('Email recipient decryption failed');
    expect(() => decryptRecipient(encrypted, key, 'delivery-2')).toThrow(
      'Email recipient decryption failed',
    );
  });
});
