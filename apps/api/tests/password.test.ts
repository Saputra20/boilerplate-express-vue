import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PasswordError,
  hashPassword,
  verifyPassword,
} from '../src/helpers/password.helper.js';

const validPassword = 'lowercase passphrase';

describe('password hashing', () => {
  it.each([
    ['11 code points', 'a'.repeat(MIN_PASSWORD_LENGTH - 1)],
    ['129 code points', 'a'.repeat(MAX_PASSWORD_LENGTH + 1)],
  ])('rejects %s before hashing without exposing the password', async (_scenario, password) => {
    await expect(hashPassword(password)).rejects.toThrow(PasswordError);

    try {
      await hashPassword(password);
    } catch (error) {
      expect(error instanceof Error ? error.message : '').not.toContain(password);
    }
  });

  it.each([
    ['12 code points', 'a'.repeat(MIN_PASSWORD_LENGTH)],
    ['12 Unicode code points', '😀'.repeat(MIN_PASSWORD_LENGTH)],
    ['128 code points', 'a'.repeat(MAX_PASSWORD_LENGTH)],
    ['lowercase-only passphrase', validPassword],
    ['no-symbol password', 'lettersandnumbers123'],
    ['no-number password', 'onlyletterspassphrase'],
  ])('hashes a valid %s without composition requirements', async (_scenario, password) => {
    const encodedHash = await hashPassword(password);

    expect(encodedHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    await expect(verifyPassword(encodedHash, password)).resolves.toBe(true);
  });

  it('preserves leading and trailing whitespace', async () => {
    const password = '  whitespace passphrase  ';
    const encodedHash = await hashPassword(password);

    await expect(verifyPassword(encodedHash, password)).resolves.toBe(true);
    await expect(verifyPassword(encodedHash, password.trim())).resolves.toBe(false);
  });

  it('uses random salts without returning plaintext', async () => {
    const firstHash = await hashPassword(validPassword);
    const secondHash = await hashPassword(validPassword);

    expect(firstHash).not.toBe(validPassword);
    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword(firstHash, validPassword)).resolves.toBe(true);
    await expect(verifyPassword(secondHash, validPassword)).resolves.toBe(true);
  });

  it('fails safely for wrong passwords, invalid-length candidates, and malformed hashes', async () => {
    const encodedHash = await hashPassword(validPassword);

    await expect(verifyPassword(encodedHash, 'wrong password value')).resolves.toBe(false);
    await expect(verifyPassword(encodedHash, 'a'.repeat(MIN_PASSWORD_LENGTH - 1))).resolves.toBe(
      false,
    );
    await expect(verifyPassword('not-an-argon2-hash', validPassword)).resolves.toBe(false);
  });
});
