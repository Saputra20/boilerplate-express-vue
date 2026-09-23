import * as argon2 from 'argon2';
import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
export const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} satisfies argon2.Options;

const passwordSchema = z.string().superRefine((value, context) => {
  const length = Array.from(value).length;

  if (length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
    context.addIssue({ code: 'custom', message: 'Invalid password length' });
  }
});

export class PasswordError extends Error {
  constructor(code: 'validation' | 'hashing' | 'verification') {
    super(`Password ${code} failed`);
    this.name = 'PasswordError';
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (!passwordSchema.safeParse(password).success) {
    throw new PasswordError('validation');
  }

  try {
    return await argon2.hash(password, PASSWORD_HASH_OPTIONS);
  } catch {
    throw new PasswordError('hashing');
  }
}

export async function verifyPassword(
  encodedHash: string,
  candidatePassword: string,
): Promise<boolean> {
  if (!passwordSchema.safeParse(candidatePassword).success || !isEncodedArgon2idHash(encodedHash)) {
    return false;
  }

  try {
    return await argon2.verify(encodedHash, candidatePassword);
  } catch {
    throw new PasswordError('verification');
  }
}

function isEncodedArgon2idHash(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/.test(value)
  );
}
