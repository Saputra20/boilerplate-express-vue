import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import {
  createAuditReadService,
  encodeCursor,
  parseExportQuery,
  parseListQuery,
  type AuditEventRow,
  type AuditReadFilters,
  type AuditReadRepository,
} from '../src/modules/audit/services/audit-read.service.js';
import { createAuditRouter } from '../src/modules/audit/v1/audit.router.js';

const actorId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const sessionId = '44444444-4444-4444-8444-444444444444';
const now = new Date('2026-01-31T00:00:00.000Z');

function eventRow(overrides: Partial<AuditEventRow> = {}): AuditEventRow {
  return {
    id: eventId,
    eventType: 'category.updated',
    actorSnapshotId: actorId,
    actorSnapshotDisplayName: 'Ada Lovelace',
    actorSnapshotEmail: 'ada@example.com',
    actorType: 'user',
    resourceType: 'category',
    resourceId: '55555555-5555-4555-8555-555555555555',
    outcome: 'success',
    requestId,
    metadata: {
      before: { name: 'Old name', password: 'must stay hidden' },
      after: { name: 'New name', secret: 'must stay hidden' },
      sessionId,
      ipAddress: '192.0.2.1',
    },
    createdAt: new Date('2026-01-30T12:00:00.000Z'),
    ...overrides,
  };
}

function repository({
  rows = [eventRow()],
  hasMore = false,
  actor = { id: actorId, displayName: 'Ada Lovelace', email: 'ada@example.com' },
  onList,
}: {
  rows?: AuditEventRow[];
  hasMore?: boolean;
  actor?: { id: string; displayName: string | null; email: string };
  onList?: (filters: AuditReadFilters) => void;
} = {}): AuditReadRepository {
  return {
    async list(filters) {
      onList?.(filters);
      return { rows, hasMore };
    },
    async findVisible(id) {
      return rows.find((row) => row.id === id) ?? null;
    },
    async findActor() {
      return actor;
    },
  };
}

describe('audit read service', () => {
  it('uses bounded cursor queries and redacts stored fields from detail output', async () => {
    let received: AuditReadFilters | undefined;
    const row = eventRow();
    const service = createAuditReadService(
      repository({ rows: [row], hasMore: true, onList: (filters) => (received = filters) }),
    );
    const cursor = encodeCursor({
      id: '66666666-6666-4666-8666-666666666666',
      createdAt: new Date('2026-01-29T12:00:00.000Z'),
    });

    const list = await service.list(
      {
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T00:00:00.000Z',
        action: 'category.updated',
        limit: '50',
        cursor,
      },
      now,
    );
    const detail = await service.get(eventId);

    expect(received).toMatchObject({
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T00:00:00.000Z'),
      eventType: 'category.updated',
      limit: 50,
      cursor: {
        id: '66666666-6666-4666-8666-666666666666',
        createdAt: new Date('2026-01-29T12:00:00.000Z'),
      },
    });
    expect(list.pagination.nextCursor).toBeTruthy();
    expect(detail).toMatchObject({
      id: eventId,
      requestId,
      changes: {
        available: true,
        before: { name: 'Old name' },
        after: { name: 'New name' },
      },
      actor: {
        available: true,
        id: actorId,
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
      },
    });
    expect(detail).not.toHaveProperty('metadata');
    expect(JSON.stringify(detail)).not.toContain('must stay hidden');
    expect(JSON.stringify(detail)).not.toContain('192.0.2.1');
  });

  it('fails closed for legacy and malformed change snapshots', async () => {
    const unavailableRows = [
      eventRow({ metadata: { before: null, after: null } }),
      eventRow({ metadata: { before: { oldSecret: 'hidden' }, after: { oldSecret: 'hidden' } } }),
      eventRow({ metadata: { before: { name: 'Old name' }, after: { invalid: 'hidden' } } }),
    ];

    for (const row of unavailableRows) {
      const detail = await createAuditReadService(repository({ rows: [row] })).get(eventId);
      expect(detail?.changes).toEqual({ available: false, before: null, after: null });
    }

    const noOp = await createAuditReadService(
      repository({ rows: [eventRow({ metadata: { before: {}, after: {} } })] }),
    ).get(eventId);
    expect(noOp?.changes).toEqual({ available: true, before: {}, after: {} });
  });

  it('omits malformed export summaries outside approved bounds', async () => {
    const baseSummary = {
      rowCount: 1,
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T00:00:00.000Z',
      filters: {
        action: null,
        actorId: null,
        resourceType: null,
        resourceId: null,
        outcome: null,
      },
      searchApplied: false,
    };
    const valid = await createAuditReadService(
      repository({ rows: [eventRow({ eventType: 'audit.exported', metadata: baseSummary })] }),
    ).get(eventId);
    expect(valid?.exportSummary).toMatchObject({ rowCount: 1, searchApplied: false });

    const malformedRows = [
      eventRow({
        eventType: 'audit.exported',
        metadata: { ...baseSummary, to: '2026-02-02T00:00:00.000Z' },
      }),
      eventRow({
        eventType: 'audit.exported',
        metadata: {
          ...baseSummary,
          filters: { ...baseSummary.filters, resourceType: 'not a resource type' },
        },
      }),
    ];
    for (const row of malformedRows) {
      const detail = await createAuditReadService(repository({ rows: [row] })).get(eventId);
      expect(detail).not.toHaveProperty('exportSummary');
    }
  });

  it('rejects unsupported limits and date ranges before repository access', () => {
    expect(() =>
      parseListQuery(
        { limit: '10', from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T00:00:00.000Z' },
        now,
      ),
    ).toThrow('Invalid audit query');
    expect(() =>
      parseListQuery({ from: '2025-01-01T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' }, now),
    ).toThrow('Invalid audit query');
    expect(() =>
      parseExportQuery({ from: '2025-11-30T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' }, now),
    ).toThrow('Invalid audit query');
  });

  it('neutralizes CSV formulas and keeps export audit metadata bounded', async () => {
    const auditEvents: unknown[] = [];
    const loggerCalls: unknown[] = [];
    const row = eventRow({
      actorSnapshotDisplayName: '+Ada',
      resourceId: '@target',
      metadata: { before: null, after: { name: '=formula' } },
    });
    const service = createAuditReadService(
      repository({ rows: [row] }),
      {
        async recordInformational(input) {
          auditEvents.push(input);
        },
      },
      { error: (...args: unknown[]) => loggerCalls.push(args) },
    );

    const csv = await service.export(
      {
        from: '2026-01-30T00:00:00.000Z',
        to: '2026-01-31T00:00:00.000Z',
        q: 'Ada',
      },
      { actorUserId: actorId, sessionId, requestId },
      now,
    );

    expect(csv).toContain("'+Ada");
    expect(csv).toContain("'@target");
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]).toMatchObject({
      eventType: 'audit.exported',
      metadata: {
        rowCount: 1,
        searchApplied: true,
        filters: {
          action: null,
          actorId: null,
          resourceType: null,
          resourceId: null,
          outcome: null,
        },
      },
    });
    const exportMetadata = (auditEvents[0] as { metadata: unknown }).metadata;
    expect(JSON.stringify(exportMetadata)).not.toContain('Ada');
    expect(JSON.stringify(exportMetadata)).not.toContain('formula');
    expect(loggerCalls).toHaveLength(0);
  });

  it('does not fail CSV export when the best-effort audit append fails', async () => {
    const loggerCalls: unknown[] = [];
    const service = createAuditReadService(
      repository(),
      {
        async recordInformational() {
          throw new Error('append failed');
        },
      },
      { error: (...args: unknown[]) => loggerCalls.push(args) },
    );

    await expect(
      service.export(
        { from: '2026-01-30T00:00:00.000Z', to: '2026-01-31T00:00:00.000Z' },
        { actorUserId: actorId, sessionId, requestId },
        now,
      ),
    ).resolves.toContain('category.updated');
    expect(loggerCalls).toHaveLength(1);
  });
});

describe('audit read authorization', () => {
  function createAuthorizedApp(permission: (code: string) => 'granted' | 'denied') {
    const service = createAuditReadService(repository({ rows: [] }));
    const router = createAuditRouter({
      accessAuthService: {
        authenticate: async () => ({
          sub: actorId,
          sid: sessionId,
          jti: randomUUID(),
          exp: Math.floor(Date.now() / 1000) + 60,
          revoked: false,
          mustChangePassword: false,
        }),
      },
      permissionService: {
        authorize: async ({ permission: code }) => permission(code),
        listEffectivePermissions: async () => [],
        listCatalog: async () => [],
      },
      auditService: service,
    });
    const app = express();
    app.use((request, _response, next) => {
      request.id = request.id || randomUUID();
      next();
    });
    app.use('/api/v1/audit-events', router);
    return app;
  }

  it('requires audit.read for list and both permissions for export', async () => {
    const deniedList = await request(createAuthorizedApp(() => 'denied'))
      .get('/api/v1/audit-events')
      .set('Authorization', 'Bearer valid-token');
    const deniedExport = await request(
      createAuthorizedApp((code) => (code === 'audit.read' ? 'granted' : 'denied')),
    )
      .get('/api/v1/audit-events/export')
      .set('Authorization', 'Bearer valid-token');
    const allowedList = await request(createAuthorizedApp(() => 'granted'))
      .get('/api/v1/audit-events?limit=10')
      .set('Authorization', 'Bearer valid-token');

    expect(deniedList.status).toBe(403);
    expect(deniedExport.status).toBe(403);
    expect(allowedList.status).toBe(400);
  });
});
