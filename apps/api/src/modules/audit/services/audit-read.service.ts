import { z } from 'zod';
import type { AuditLogger } from './audit.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LIST_RANGE_DAYS = 90;
const MAX_EXPORT_RANGE_DAYS = 31;
const MAX_EXPORT_ROWS = 10_000;
const SEARCH_PATTERN = /^[\s\S]{2,120}$/;
const identifierPattern = /^[a-z][a-z0-9_]*$/;

export const AUDIT_EVENT_CATALOG = {
  'category.created': { label: 'Category created', resourceType: 'category', change: 'category' },
  'category.updated': { label: 'Category updated', resourceType: 'category', change: 'category' },
  'category.deleted': { label: 'Category deleted', resourceType: 'category', change: 'category' },
  'role.created': { label: 'Role created', resourceType: 'role', change: 'role' },
  'role.updated': { label: 'Role updated', resourceType: 'role', change: 'role' },
  'role.deleted': { label: 'Role deleted', resourceType: 'role', change: 'role' },
  'user.created': { label: 'User created', resourceType: 'user', change: 'user' },
  'user.updated': { label: 'User updated', resourceType: 'user', change: 'user' },
  'user.deleted': { label: 'User deleted', resourceType: 'user', change: 'user' },
  'user.profile_updated': { label: 'Profile updated', resourceType: 'user', change: 'profile' },
  'audit.exported': { label: 'Audit trail exported', resourceType: null, change: null },
} as const;

export type AuditEventType = keyof typeof AUDIT_EVENT_CATALOG;
export type AuditEventRow = {
  id: string;
  eventType: string;
  actorSnapshotId: string | null;
  actorSnapshotDisplayName: string | null;
  actorSnapshotEmail: string | null;
  actorType: string;
  resourceType: string | null;
  resourceId: string | null;
  outcome: string;
  requestId: string | null;
  metadata: unknown;
  createdAt: Date;
};

export type AuditReadFilters = {
  from: Date;
  to: Date;
  actorId?: string;
  eventType?: AuditEventType;
  resourceType?: string;
  resourceId?: string;
  outcome?: 'success' | 'failure';
  search?: string;
  limit: number;
  page?: number;
};

export type AuditExportFilters = Omit<AuditReadFilters, 'limit' | 'page'>;

export type AuditReadRepository = {
  list(filters: AuditReadFilters): Promise<{ rows: AuditEventRow[]; hasMore: boolean }>;
  listPage(filters: AuditReadFilters): Promise<{ rows: AuditEventRow[]; total: number }>;
  findVisible(id: string): Promise<AuditEventRow | null>;
  findActor(id: string): Promise<{
    id: string;
    displayName: string | null;
    email: string;
  } | null>;
};

export type AuditWriter = {
  recordInformational(input: unknown): Promise<void>;
};

export type AuditActorContext = {
  actorUserId: string;
  sessionId: string;
  requestId: string;
};

export type AuditListItem = {
  id: string;
  eventType: AuditEventType;
  label: string;
  actor: AuditActor;
  resource: { type: string | null; id: string | null };
  outcome: 'success' | 'failure';
  createdAt: string;
};

export type AuditDetail = AuditListItem & {
  requestId: string | null;
  changes?: AuditChanges;
  exportSummary?: AuditExportSummary;
};

type AuditActor = {
  type: 'user' | 'system';
  available: boolean;
  id: string | null;
  displayName: string | null;
  email: string | null;
};

type AuditChanges = {
  available: boolean;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

type AuditExportSummary = {
  rowCount: number;
  from: string;
  to: string;
  filters: {
    action: AuditEventType | null;
    actorId: string | null;
    resourceType: string | null;
    resourceId: string | null;
    outcome: 'success' | 'failure' | null;
  };
  searchApplied: boolean;
};

const instantSchema = z
  .string()
  .refine((value) => ISO_INSTANT_PATTERN.test(value) && !Number.isNaN(Date.parse(value)), {
    message: 'Expected a timezone-qualified ISO-8601 instant',
  });
const querySchema = z
  .object({
    from: instantSchema.optional(),
    to: instantSchema.optional(),
    actorId: z.uuid().optional(),
    action: z
      .enum(Object.keys(AUDIT_EVENT_CATALOG) as [AuditEventType, ...AuditEventType[]])
      .optional(),
    resourceType: z.string().regex(identifierPattern).max(64).optional(),
    resourceId: z.string().min(1).max(255).optional(),
    outcome: z.enum(['success', 'failure']).optional(),
    q: z.string().trim().regex(SEARCH_PATTERN).optional(),
  })
  .strict();
const listQuerySchema = querySchema.extend({
  limit: z.coerce
    .number()
    .int()
    .refine((value) => value === 10 || value === 20 || value === 50 || value === 100, {
      message: 'Limit must be 10, 20, 50, or 100',
    })
    .default(10),
  page: z.coerce.number().int().min(1).default(1),
});
const exportQuerySchema = querySchema;

const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export class AuditQueryValidationError extends Error {
  constructor() {
    super('Invalid audit query');
    this.name = 'AuditQueryValidationError';
  }
}

export class AuditEventNotFoundError extends Error {
  constructor() {
    super('Audit event not found');
    this.name = 'AuditEventNotFoundError';
  }
}

export function createAuditReadService(
  repository: AuditReadRepository,
  auditWriter?: AuditWriter,
  logger?: AuditLogger,
) {
  return {
    async list(input: unknown, now = new Date()) {
      const filters = parseListQuery(input, now);
      const result = await repository.listPage(filters);
      const items = result.rows.map(toListItem);
      return {
        items,
        pagination: {
          page: filters.page ?? 1,
          limit: filters.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limit),
        },
      };
    },

    async get(id: string) {
      const parsedId = z.uuid().safeParse(id);
      if (!parsedId.success) throw new AuditEventNotFoundError();
      const row = await repository.findVisible(parsedId.data);
      return row ? toDetail(row) : null;
    },

    async export(input: unknown, actor: AuditActorContext, now = new Date()) {
      const filters = parseExportQuery(input, now);
      const result = await repository.list({ ...filters, limit: MAX_EXPORT_ROWS });
      if (result.hasMore) throw new AuditQueryValidationError();
      const details = result.rows.map(toDetail);
      const csv = createCsv(details);
      await recordExport(auditWriter, logger, repository, actor, filters, details.length);
      return csv;
    },
  };
}

export type AuditReadService = ReturnType<typeof createAuditReadService>;

export function parseListQuery(input: unknown, now: Date): AuditReadFilters {
  let parsed: z.infer<typeof listQuerySchema>;
  try {
    parsed = listQuerySchema.parse(input);
  } catch {
    throw new AuditQueryValidationError();
  }
  return normalizeFilters(parsed, now, MAX_LIST_RANGE_DAYS, true);
}

export function parseExportQuery(input: unknown, now: Date): AuditExportFilters {
  let parsed: z.infer<typeof exportQuerySchema>;
  try {
    parsed = exportQuerySchema.parse(input);
  } catch {
    throw new AuditQueryValidationError();
  }
  return normalizeFilters(parsed, now, MAX_EXPORT_RANGE_DAYS, false);
}

function normalizeFilters(
  parsed: {
    from?: string;
    to?: string;
    actorId?: string;
    action?: AuditEventType;
    resourceType?: string;
    resourceId?: string;
    outcome?: 'success' | 'failure';
    q?: string;
    limit?: number;
    page?: number;
  },
  now: Date,
  maxRangeDays: number,
  withPagination: boolean,
): AuditReadFilters {
  const safeNow = new Date(now);
  const to = parsed.to ? new Date(parsed.to) : safeNow;
  const from = parsed.from ? new Date(parsed.from) : new Date(to.getTime() - 30 * DAY_MS);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) {
    throw new AuditQueryValidationError();
  }
  if (to.getTime() - from.getTime() > maxRangeDays * DAY_MS) {
    throw new AuditQueryValidationError();
  }

  const filters: AuditReadFilters = {
    from,
    to,
    actorId: parsed.actorId,
    eventType: parsed.action,
    resourceType: parsed.resourceType,
    resourceId: parsed.resourceId,
    outcome: parsed.outcome,
    search: parsed.q,
    limit: withPagination ? (parsed.limit ?? 20) : MAX_EXPORT_ROWS,
    page: withPagination ? (parsed.page ?? 1) : undefined,
  };
  return filters;
}

function toListItem(row: AuditEventRow): AuditListItem {
  const catalog = catalogFor(row);
  return {
    id: row.id,
    eventType: row.eventType as AuditEventType,
    label: catalog.label,
    actor: toActor(row),
    resource: {
      type: row.eventType === 'audit.exported' ? null : row.resourceType,
      id: row.eventType === 'audit.exported' ? null : row.resourceId,
    },
    outcome: row.outcome === 'failure' ? 'failure' : 'success',
    createdAt: row.createdAt.toISOString(),
  };
}

function toDetail(row: AuditEventRow): AuditDetail {
  const item = toListItem(row);
  const detail: AuditDetail = {
    ...item,
    requestId: row.requestId,
  };
  const catalog = catalogFor(row);
  if (catalog.change !== null) detail.changes = projectChanges(row.metadata, catalog.change);
  if (row.eventType === 'audit.exported') {
    const summary = projectExportSummary(row.metadata);
    if (summary) detail.exportSummary = summary;
  }
  return detail;
}

function catalogFor(row: AuditEventRow) {
  if (!isAuditEventType(row.eventType)) throw new AuditEventNotFoundError();
  return AUDIT_EVENT_CATALOG[row.eventType];
}

function toActor(row: AuditEventRow): AuditActor {
  if (row.actorType === 'system') {
    return { type: 'system', available: true, id: null, displayName: null, email: null };
  }
  const available = row.actorSnapshotId !== null && row.actorSnapshotEmail !== null;
  return {
    type: 'user',
    available,
    id: available ? row.actorSnapshotId : null,
    displayName: available ? row.actorSnapshotDisplayName : null,
    email: available ? row.actorSnapshotEmail : null,
  };
}

const changeFields = {
  category: ['name', 'slug', 'description', 'isActive'],
  role: ['code', 'name', 'description', 'permissionCodes'],
  user: ['email', 'roleId', 'status'],
  profile: ['displayName'],
} as const;

function projectChanges(metadata: unknown, profile: keyof typeof changeFields): AuditChanges {
  if (!isRecord(metadata) || !('before' in metadata) || !('after' in metadata)) {
    return { available: false, before: null, after: null };
  }
  const before = projectChangeSide(metadata.before, changeFields[profile]);
  const after = projectChangeSide(metadata.after, changeFields[profile]);
  if (before === undefined || after === undefined || (before === null && after === null)) {
    return { available: false, before: null, after: null };
  }
  if (before === null && isEmptyChangeSide(after)) {
    return { available: false, before: null, after: null };
  }
  if (after === null && isEmptyChangeSide(before)) {
    return { available: false, before: null, after: null };
  }
  if (before !== null && after !== null) {
    const beforeFields = Object.keys(before).sort();
    const afterFields = Object.keys(after).sort();
    if (beforeFields.length === 0 || afterFields.length === 0) {
      if (beforeFields.length !== afterFields.length) {
        return { available: false, before: null, after: null };
      }
    } else if (beforeFields.join('|') !== afterFields.join('|')) {
      return { available: false, before: null, after: null };
    }
  }
  return { available: true, before, after };
}

function projectChangeSide(
  value: unknown,
  fields: readonly string[],
): Record<string, unknown> | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const projected: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in value && isSafeChangeValue(value[field])) projected[field] = value[field];
  }
  if (Object.keys(value).length > 0 && Object.keys(projected).length === 0) return undefined;
  return projected;
}

function isEmptyChangeSide(value: Record<string, unknown> | null): boolean {
  return value !== null && Object.keys(value).length === 0;
}

function isSafeChangeValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function projectExportSummary(metadata: unknown): AuditExportSummary | null {
  if (!isRecord(metadata)) return null;
  const rowCount = metadata.rowCount;
  const from = metadata.from;
  const to = metadata.to;
  const searchApplied = metadata.searchApplied;
  const rawFilters = metadata.filters;
  if (
    typeof rowCount !== 'number' ||
    !Number.isInteger(rowCount) ||
    rowCount < 0 ||
    rowCount > MAX_EXPORT_ROWS ||
    typeof from !== 'string' ||
    !ISO_INSTANT_PATTERN.test(from) ||
    typeof to !== 'string' ||
    !ISO_INSTANT_PATTERN.test(to) ||
    typeof searchApplied !== 'boolean' ||
    !isRecord(rawFilters)
  ) {
    return null;
  }
  const fromTime = Date.parse(from);
  const toTime = Date.parse(to);
  if (
    !Number.isFinite(fromTime) ||
    !Number.isFinite(toTime) ||
    fromTime > toTime ||
    toTime - fromTime > MAX_EXPORT_RANGE_DAYS * DAY_MS
  ) {
    return null;
  }
  const action = parseNullableAuditEventType(rawFilters.action);
  const actorId = parseNullableUuid(rawFilters.actorId);
  const resourceType = parseNullableResourceType(rawFilters.resourceType);
  const resourceId = parseNullableResourceId(rawFilters.resourceId);
  const outcome = parseNullableOutcome(rawFilters.outcome);
  if (
    action === undefined ||
    actorId === undefined ||
    resourceType === undefined ||
    resourceId === undefined ||
    outcome === undefined
  ) {
    return null;
  }
  const filters = { action, actorId, resourceType, resourceId, outcome };
  return {
    rowCount,
    from: new Date(fromTime).toISOString(),
    to: new Date(toTime).toISOString(),
    filters,
    searchApplied,
  };
}

function createCsv(rows: AuditDetail[]): string {
  const columns = [
    'id',
    'eventType',
    'label',
    'actorType',
    'actorId',
    'actorDisplayName',
    'actorEmail',
    'resourceType',
    'resourceId',
    'outcome',
    'occurredAtWib',
    'requestId',
    'changeDetailsAvailable',
    'before',
    'after',
  ];
  const lines = [columns.join(',')];
  for (const row of rows) {
    const changes = row.changes;
    lines.push(
      [
        row.id,
        row.eventType,
        row.label,
        row.actor.type,
        row.actor.id,
        row.actor.displayName,
        row.actor.email,
        row.resource.type,
        row.resource.id,
        row.outcome,
        formatJakarta(row.createdAt),
        row.requestId,
        changes?.available === true,
        changes?.available === true && changes.before !== null
          ? JSON.stringify(changes.before)
          : null,
        changes?.available === true && changes.after !== null
          ? JSON.stringify(changes.after)
          : null,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `${lines.join('\r\n')}\r\n`;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function formatJakarta(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')} WIB (UTC+07:00)`;
}

async function recordExport(
  auditWriter: AuditWriter | undefined,
  logger: AuditLogger | undefined,
  repository: AuditReadRepository,
  actor: AuditActorContext,
  filters: AuditExportFilters,
  rowCount: number,
): Promise<void> {
  if (!auditWriter) return;
  try {
    const snapshot = await repository.findActor(actor.actorUserId);
    await auditWriter.recordInformational({
      eventType: 'audit.exported',
      actorType: 'user',
      actorUserId: actor.actorUserId,
      actorSnapshotId: snapshot?.id ?? actor.actorUserId,
      actorSnapshotDisplayName: snapshot?.displayName ?? null,
      actorSnapshotEmail: snapshot?.email ?? null,
      sessionId: actor.sessionId,
      requestId: actor.requestId,
      resourceType: null,
      resourceId: null,
      outcome: 'success',
      metadata: {
        rowCount,
        from: filters.from.toISOString(),
        to: filters.to.toISOString(),
        filters: {
          action: filters.eventType ?? null,
          actorId: filters.actorId ?? null,
          resourceType: filters.resourceType ?? null,
          resourceId: filters.resourceId ?? null,
          outcome: filters.outcome ?? null,
        },
        searchApplied: filters.search !== undefined,
      },
    });
  } catch {
    logger?.error(
      { eventType: 'audit.exported', requestId: actor.requestId },
      'Audit event write failed',
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseNullableAuditEventType(value: unknown): AuditEventType | null | undefined {
  if (value === null) return null;
  return isAuditEventType(value) ? value : undefined;
}

function parseNullableUuid(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isUuid(value) ? value : undefined;
}

function parseNullableResourceType(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isResourceType(value) ? value : undefined;
}

function parseNullableResourceId(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isResourceId(value) ? value : undefined;
}

function parseNullableOutcome(value: unknown): 'success' | 'failure' | null | undefined {
  if (value === null) return null;
  return value === 'success' || value === 'failure' ? value : undefined;
}

function isAuditEventType(value: unknown): value is AuditEventType {
  return typeof value === 'string' && value in AUDIT_EVENT_CATALOG;
}

function isResourceType(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 64 && identifierPattern.test(value);
}

function isResourceId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 255;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && z.uuid().safeParse(value).success;
}
