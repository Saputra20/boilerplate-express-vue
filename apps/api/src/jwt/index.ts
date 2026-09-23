import { createPrivateKey, createPublicKey, randomUUID, type KeyObject } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { sign, verify, type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

export const TOKEN_TYPES = ['access', 'refresh'] as const;

const algorithm = 'RS256' as const;
const tokenTypeSchema = z.enum(TOKEN_TYPES);
const uuidSchema = z.uuid();
const numericDateSchema = z.number().int().nonnegative();
const tokenDurationSchema = z.custom<Exclude<SignOptions['expiresIn'], undefined>>(
  (value) => typeof value === 'string' && value.trim().length > 0,
);
const issueTokenSchema = z
  .object({
    sub: uuidSchema,
    typ: tokenTypeSchema,
    sid: uuidSchema.optional(),
    nbf: numericDateSchema.optional(),
  })
  .strict();

export type TokenType = z.infer<typeof tokenTypeSchema>;
export type IssueTokenInput = z.infer<typeof issueTokenSchema>;
export type JwtConfig = {
  privateKeyPath: string;
  publicKeyPath: string;
  issuer: string;
  audience: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
};
export type VerifiedToken = {
  sub: string;
  jti: string;
  typ: TokenType;
  sid?: string;
  iat: number;
  exp: number;
};
export type JwtService = {
  issueToken(input: IssueTokenInput): string;
  verifyToken(token: string, expectedType: TokenType): VerifiedToken;
};

export class JwtError extends Error {
  constructor(code: 'initialization' | 'issuance' | 'verification') {
    super(`JWT ${code} failed`);
    this.name = 'JwtError';
  }
}

export function createJwt(config: JwtConfig): JwtService {
  const privateKey = loadPrivateKey(config.privateKeyPath);
  const publicKey = loadPublicKey(config.publicKeyPath);

  if (!isRsaKey(privateKey) || !isRsaKey(publicKey) || !keysMatch(privateKey, publicKey)) {
    throw new JwtError('initialization');
  }

  return {
    issueToken(input): string {
      const parsedInput = issueTokenSchema.safeParse(input);
      if (!parsedInput.success) throw new JwtError('issuance');

      try {
        return sign(createPayload(parsedInput.data), privateKey, {
          algorithm,
          issuer: config.issuer,
          audience: config.audience,
          subject: parsedInput.data.sub,
          jwtid: randomUUID(),
          expiresIn: expirationFor(parsedInput.data.typ, config),
        });
      } catch {
        throw new JwtError('issuance');
      }
    },

    verifyToken(token, expectedType): VerifiedToken {
      if (!tokenTypeSchema.safeParse(expectedType).success || typeof token !== 'string') {
        throw new JwtError('verification');
      }

      try {
        const payload = verify(token, publicKey, {
          algorithms: [algorithm],
          issuer: config.issuer,
          audience: config.audience,
        });
        const parsedPayload = verifiedPayloadSchema(config).safeParse(payload);

        if (!parsedPayload.success || parsedPayload.data.typ !== expectedType) {
          throw new JwtError('verification');
        }

        const { sub, jti, typ, sid, iat, exp } = parsedPayload.data;
        return { sub, jti, typ, sid, iat, exp };
      } catch (error) {
        if (error instanceof JwtError) throw error;
        throw new JwtError('verification');
      }
    },
  };
}

function createPayload(input: IssueTokenInput): { typ: TokenType; sid?: string; nbf?: number } {
  return {
    typ: input.typ,
    ...(input.sid === undefined ? {} : { sid: input.sid }),
    ...(input.nbf === undefined ? {} : { nbf: input.nbf }),
  };
}

function expirationFor(type: TokenType, config: JwtConfig): SignOptions['expiresIn'] {
  const parsedDuration = tokenDurationSchema.safeParse(
    type === 'access' ? config.accessTokenExpiresIn : config.refreshTokenExpiresIn,
  );

  if (!parsedDuration.success) throw new JwtError('issuance');

  return parsedDuration.data;
}

function verifiedPayloadSchema(config: JwtConfig) {
  return z
    .object({
      sub: uuidSchema,
      iss: z.literal(config.issuer),
      aud: z.literal(config.audience),
      iat: numericDateSchema,
      exp: numericDateSchema,
      jti: uuidSchema,
      typ: tokenTypeSchema,
      nbf: numericDateSchema.optional(),
      sid: uuidSchema.optional(),
    })
    .strict();
}

function loadPrivateKey(path: string): KeyObject {
  try {
    return createPrivateKey(readFileSync(path, 'utf8'));
  } catch {
    throw new JwtError('initialization');
  }
}

function loadPublicKey(path: string): KeyObject {
  try {
    return createPublicKey(readFileSync(path, 'utf8'));
  } catch {
    throw new JwtError('initialization');
  }
}

function isRsaKey(key: KeyObject): boolean {
  return key.asymmetricKeyType === 'rsa';
}

function keysMatch(privateKey: KeyObject, publicKey: KeyObject): boolean {
  const derivedPublicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
  const configuredPublicKey = publicKey.export({ format: 'der', type: 'spki' });

  return Buffer.compare(derivedPublicKey, configuredPublicKey) === 0;
}
