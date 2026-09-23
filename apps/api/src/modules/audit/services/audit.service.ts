import { Buffer } from 'node:buffer';
import { z } from 'zod';

const MAX_METADATA_BYTES = 8 * 1024;
const eventTypePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,2}$/;
const identifierPattern = /^[a-z][a-z0-9_]*$/;
const reasonCodePattern = /^[A-Z][A-Z0-9_]*$/;
const forbiddenMetadataKeys = [
  'password',
  'credential',
  'secret',
  'token',
  'authorization',
  'cookie',
  'privatekey',
  'connectionstring',
  'stack',
  'headers',
];

const metadataSchema = z
  .record(z.string(), z.unknown())
  .superRefine((metadata, context) => validateMetadata(metadata, context));

const auditEventSchema = z
  .object({
    eventType: z.string().regex(eventTypePattern),
    actorUserId: z.uuid().nullable().optional(),
    actorType: z.enum(['user', 'system']),
    resourceType: z.string().regex(identifierPattern).nullable().optional(),
    resourceId: z.string().min(1).max(255).nullable().optional(),
    outcome: z.enum(['success', 'failure']),
    reasonCode: z.string().regex(reasonCodePattern).max(128).nullable().optional(),
    requestId: z.uuid().nullable().optional(),
    sessionId: z.uuid().nullable().optional(),
    ipAddress: z.string().max(45).nullable().optional(),
    userAgent: z.string().max(512).nullable().optional(),
    metadata: metadataSchema.nullable().optional(),
  })
  .strict()
  .superRefine((event, context) => {
    if (
      event.actorType === 'user' &&
      (event.actorUserId === null || event.actorUserId === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'User audit actor requires actorUserId',
        path: ['actorUserId'],
      });
    }
    if (
      event.actorType === 'system' &&
      event.actorUserId !== null &&
      event.actorUserId !== undefined
    ) {
      context.addIssue({
        code: 'custom',
        message: 'System audit actor cannot include actorUserId',
        path: ['actorUserId'],
      });
    }
  });

export type AuditEvent = Omit<z.infer<typeof auditEventSchema>, 'metadata'> & {
  metadata: Record<string, unknown> | null;
};

export type AuditRepository<Executor = unknown> = {
  append(event: AuditEvent, executor?: Executor): Promise<void>;
  cleanupBefore(before: Date, executor?: Executor): Promise<number>;
};

export type AuditLogger = {
  error(context: { eventType: string; requestId: string | null }, message: string): void;
};

export type AuditService<Executor = unknown> = {
  recordRequired(input: unknown, executor: Executor): Promise<void>;
  recordInformational(input: unknown): Promise<void>;
  cleanupExpired(now: Date, executor?: Executor): Promise<number>;
};

export function createAuditService<Executor>(
  repository: AuditRepository<Executor>,
  logger: AuditLogger,
): AuditService<Executor> {
  return {
    async recordRequired(input, executor) {
      await repository.append(parseAuditEvent(input), executor);
    },

    async recordInformational(input) {
      const event = parseAuditEvent(input);
      try {
        await repository.append(event);
      } catch {
        logger.error(
          { eventType: event.eventType, requestId: event.requestId ?? null },
          'Audit event write failed',
        );
      }
    },

    cleanupExpired(now, executor) {
      const before = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return repository.cleanupBefore(before, executor);
    },
  };
}

export function parseAuditEvent(input: unknown): AuditEvent {
  const event = auditEventSchema.parse(input);
  return {
    ...event,
    actorUserId: event.actorUserId ?? null,
    resourceType: event.resourceType ?? null,
    resourceId: event.resourceId ?? null,
    reasonCode: event.reasonCode ?? null,
    requestId: event.requestId ?? null,
    sessionId: event.sessionId ?? null,
    ipAddress: event.ipAddress ?? null,
    userAgent: event.userAgent ?? null,
    metadata: event.metadata ?? null,
  };
}

function validateMetadata(metadata: Record<string, unknown>, context: z.RefinementCtx): void {
  const seen = new Set<unknown>();
  if (!isSafeJsonValue(metadata, seen)) {
    context.addIssue({ code: 'custom', message: 'Audit metadata must be JSON-serializable' });
    return;
  }

  const serialized = JSON.stringify(metadata);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_METADATA_BYTES) {
    context.addIssue({ code: 'custom', message: 'Audit metadata exceeds 8 KiB' });
  }
}

function isSafeJsonValue(value: unknown, seen: Set<unknown>): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (seen.has(value)) return false;

  seen.add(value);
  const safe = Array.isArray(value)
    ? value.every((entry) => isSafeJsonValue(entry, seen))
    : isSafeMetadataObject(value, seen);
  seen.delete(value);
  return safe;
}

function isSafeMetadataObject(value: object, seen: Set<unknown>): boolean {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;

  return Object.entries(value).every(([key, entry]) => {
    const normalizedKey = key.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
    if (forbiddenMetadataKeys.some((forbiddenKey) => normalizedKey.includes(forbiddenKey))) {
      return false;
    }
    return isSafeJsonValue(entry, seen);
  });
}
