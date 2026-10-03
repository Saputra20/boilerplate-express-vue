import { randomUUID } from 'node:crypto';
import {
  createAuditService,
  type AuditEvent,
  type AuditLogger,
  type AuditRepository,
  type AuditService,
} from '../src/modules/audit/services/audit.service.js';
import { createAuthenticatedUserRepository } from '../src/modules/auth/repositories/context.repository.js';
import { createCategoryRepository } from '../src/modules/category/repositories/category.repository.js';
import { createRoleRepository } from '../src/modules/role/repositories/role.repository.js';
import { createUserRepository } from '../src/modules/user/repositories/user.repository.js';

type CategoryDatabase = Parameters<typeof createCategoryRepository>[0];
type RoleDatabase = Parameters<typeof createRoleRepository>[0];
type UserDatabase = Parameters<typeof createUserRepository>[0];
type ContextDatabase = Parameters<typeof createAuthenticatedUserRepository>[0];
type CategoryAuditExecutor = ExecutorOf<Parameters<typeof createCategoryRepository>[1]>;
type RoleAuditExecutor = ExecutorOf<Parameters<typeof createRoleRepository>[1]>;
type UserAuditExecutor = ExecutorOf<Parameters<typeof createUserRepository>[1]>;
type ContextAuditExecutor = ExecutorOf<Parameters<typeof createAuthenticatedUserRepository>[1]>;

type ExecutorOf<Service> = Service extends AuditService<infer Executor> ? Executor : never;
type AuditLogEntry = {
  context: { eventType: string; requestId: string | null };
  message: string;
};
type AuditHarness<Executor> = {
  service: AuditService<Executor>;
  events: AuditEvent[];
  logs: AuditLogEntry[];
};
type RunResult = AuditHarness<unknown> & {
  database: FakeDatabase;
  result: unknown;
};
type EventCase = {
  name: string;
  eventType: string;
  run(): Promise<RunResult>;
};

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const ROLE_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const REQUEST_ID = '55555555-5555-4555-8555-555555555555';
const SESSION_ID = '66666666-6666-4666-8666-666666666666';
const createdAt = new Date('2026-01-01T00:00:00.000Z');
const updatedAt = new Date('2026-01-02T00:00:00.000Z');

const actor = {
  id: ACTOR_ID,
  displayName: 'Audit Actor',
  email: 'actor@example.test',
};

const categoryBefore = {
  id: CATEGORY_ID,
  name: 'News',
  slug: 'news',
  description: null,
  isActive: true,
  createdAt,
  updatedAt: createdAt,
  deletedAt: null,
};

const roleBefore = {
  id: ROLE_ID,
  code: 'editor',
  name: 'Editor',
  description: null,
  createdAt,
  updatedAt: createdAt,
};

const userBefore = {
  id: USER_ID,
  email: 'managed@example.test',
  displayName: null,
  passwordHash: 'synthetic-hash',
  mustChangePassword: false,
  status: 'active' as const,
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt,
  updatedAt: createdAt,
  deletedAt: null,
};

function auditContext(eventType: string, resourceType: string): AuditEvent {
  return {
    eventType,
    actorType: 'user',
    actorUserId: ACTOR_ID,
    resourceType,
    resourceId: null,
    outcome: 'success',
    requestId: REQUEST_ID,
    sessionId: SESSION_ID,
    metadata: null,
  };
}

function createAuditHarness<Executor>(failAppend = false): AuditHarness<Executor> {
  const events: AuditEvent[] = [];
  const logs: AuditLogEntry[] = [];
  const repository: AuditRepository<Executor> = {
    async append(event) {
      if (failAppend) throw new Error('audit unavailable');
      events.push(event);
    },
    async cleanupBefore() {
      return 0;
    },
  };
  const logger: AuditLogger = {
    error(context, message) {
      logs.push({ context, message });
    },
  };
  return { service: createAuditService(repository, logger), events, logs };
}

class FakeQuery {
  constructor(private readonly result: unknown) {}

  from(): this {
    return this;
  }

  where(): this {
    return this;
  }

  innerJoin(): this {
    return this;
  }

  for(): this {
    return this;
  }

  limit(): this {
    return this;
  }

  set(): this {
    return this;
  }

  values(): this {
    return this;
  }

  returning(): this {
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

class FakeDatabase {
  private readonly queues: Record<'select' | 'insert' | 'update' | 'delete', unknown[]>;
  transactionCommitted = false;

  constructor(results: Partial<Record<'select' | 'insert' | 'update' | 'delete', unknown[]>>) {
    this.queues = {
      select: [...(results.select ?? [])],
      insert: [...(results.insert ?? [])],
      update: [...(results.update ?? [])],
      delete: [...(results.delete ?? [])],
    };
  }

  select(): FakeQuery {
    return new FakeQuery(this.take('select'));
  }

  insert(): FakeQuery {
    return new FakeQuery(this.take('insert'));
  }

  update(): FakeQuery {
    return new FakeQuery(this.take('update'));
  }

  delete(): FakeQuery {
    return new FakeQuery(this.take('delete'));
  }

  async transaction(callback: (database: FakeDatabase) => Promise<unknown>): Promise<unknown> {
    const result = await callback(this);
    this.transactionCommitted = true;
    return result;
  }

  private take(kind: 'select' | 'insert' | 'update' | 'delete'): unknown {
    return this.queues[kind].shift() ?? [];
  }
}

async function runCategoryCreate(): Promise<RunResult> {
  const database = new FakeDatabase({ insert: [[categoryBefore]], select: [[actor]] });
  const audit = createAuditHarness<CategoryAuditExecutor>();
  const result = await createCategoryRepository(
    database as unknown as CategoryDatabase,
    audit.service,
  ).create({ name: 'News', slug: 'news' }, auditContext('category.created', 'category'));
  return { ...audit, database, result };
}

async function runCategoryUpdate(): Promise<RunResult> {
  const categoryAfter = { ...categoryBefore, description: 'Updated', updatedAt };
  const database = new FakeDatabase({
    select: [[categoryBefore], [actor]],
    update: [[categoryAfter]],
  });
  const audit = createAuditHarness<CategoryAuditExecutor>();
  const result = await createCategoryRepository(
    database as unknown as CategoryDatabase,
    audit.service,
  ).update(CATEGORY_ID, { description: 'Updated' }, auditContext('category.updated', 'category'));
  return { ...audit, database, result };
}

async function runCategoryDelete(): Promise<RunResult> {
  const database = new FakeDatabase({
    select: [[categoryBefore], [actor]],
    update: [[{ id: CATEGORY_ID }]],
  });
  const audit = createAuditHarness<CategoryAuditExecutor>();
  const result = await createCategoryRepository(
    database as unknown as CategoryDatabase,
    audit.service,
  ).softDelete(CATEGORY_ID, auditContext('category.deleted', 'category'));
  return { ...audit, database, result };
}

async function runRoleCreate(): Promise<RunResult> {
  const database = new FakeDatabase({ insert: [[roleBefore]], select: [[actor]] });
  const audit = createAuditHarness<RoleAuditExecutor>();
  const result = await createRoleRepository(
    database as unknown as RoleDatabase,
    audit.service,
  ).create(
    { code: 'editor', name: 'Editor', permissionCodes: [] },
    auditContext('role.created', 'role'),
  );
  return { ...audit, database, result };
}

async function runRoleUpdate(): Promise<RunResult> {
  const roleAfter = { ...roleBefore, name: 'Updated editor', updatedAt };
  const database = new FakeDatabase({
    select: [[roleBefore], [], [], [actor]],
    update: [[roleAfter]],
    delete: [[]],
  });
  const audit = createAuditHarness<RoleAuditExecutor>();
  const result = await createRoleRepository(
    database as unknown as RoleDatabase,
    audit.service,
  ).update(
    ROLE_ID,
    { name: 'Updated editor', permissionCodes: [] },
    auditContext('role.updated', 'role'),
  );
  return { ...audit, database, result };
}

async function runRoleDelete(): Promise<RunResult> {
  const database = new FakeDatabase({
    select: [[roleBefore], [], [], [actor]],
    delete: [[{ id: ROLE_ID }]],
  });
  const audit = createAuditHarness<RoleAuditExecutor>();
  const result = await createRoleRepository(
    database as unknown as RoleDatabase,
    audit.service,
  ).delete(ROLE_ID, auditContext('role.deleted', 'role'));
  return { ...audit, database, result };
}

async function runUserCreate(): Promise<RunResult> {
  const database = new FakeDatabase({
    insert: [[userBefore], []],
    select: [[{ id: ROLE_ID, code: 'editor', name: 'Editor' }], [actor]],
  });
  const audit = createAuditHarness<UserAuditExecutor>();
  const result = await createUserRepository(
    database as unknown as UserDatabase,
    audit.service,
  ).create(
    { email: userBefore.email, roleId: ROLE_ID, passwordHash: userBefore.passwordHash },
    auditContext('user.created', 'user'),
  );
  return { ...audit, database, result };
}

async function runUserUpdate(): Promise<RunResult> {
  const userAfter = { ...userBefore, status: 'disabled' as const, updatedAt };
  const database = new FakeDatabase({
    select: [[userBefore], [], [], [actor]],
    update: [[userAfter], []],
  });
  const audit = createAuditHarness<UserAuditExecutor>();
  const result = await createUserRepository(
    database as unknown as UserDatabase,
    audit.service,
  ).update(USER_ID, { status: 'disabled' }, auditContext('user.updated', 'user'));
  return { ...audit, database, result };
}

async function runUserDelete(): Promise<RunResult> {
  const database = new FakeDatabase({
    select: [[userBefore], [], [actor]],
    update: [[], []],
  });
  const audit = createAuditHarness<UserAuditExecutor>();
  const result = await createUserRepository(
    database as unknown as UserDatabase,
    audit.service,
  ).softDelete(USER_ID, auditContext('user.deleted', 'user'));
  return { ...audit, database, result };
}

async function runProfileUpdate(): Promise<RunResult> {
  const database = new FakeDatabase({
    select: [
      [
        {
          id: ACTOR_ID,
          email: actor.email,
          displayName: null,
          status: 'active',
          deletedAt: null,
          mustChangePassword: false,
        },
      ],
    ],
    update: [[]],
  });
  const audit = createAuditHarness<ContextAuditExecutor>();
  const result = await createAuthenticatedUserRepository(
    database as unknown as ContextDatabase,
    audit.service,
  ).updateDisplayName({
    userId: ACTOR_ID,
    displayName: 'Audit Actor',
    requestId: REQUEST_ID,
    sessionId: SESSION_ID,
    ipAddress: null,
    userAgent: null,
  });
  return { ...audit, database, result };
}

const eventCases: EventCase[] = [
  { name: 'category create', eventType: 'category.created', run: runCategoryCreate },
  { name: 'category update', eventType: 'category.updated', run: runCategoryUpdate },
  { name: 'category delete', eventType: 'category.deleted', run: runCategoryDelete },
  { name: 'role create', eventType: 'role.created', run: runRoleCreate },
  { name: 'role update', eventType: 'role.updated', run: runRoleUpdate },
  { name: 'role delete', eventType: 'role.deleted', run: runRoleDelete },
  { name: 'managed user create', eventType: 'user.created', run: runUserCreate },
  { name: 'managed user update', eventType: 'user.updated', run: runUserUpdate },
  { name: 'managed user delete', eventType: 'user.deleted', run: runUserDelete },
  { name: 'self profile update', eventType: 'user.profile_updated', run: runProfileUpdate },
];

describe('approved audit event coverage', () => {
  it.each(eventCases)('$name emits one allowlisted event', async ({ eventType, run }) => {
    const result = await run();
    const [event] = result.events;

    expect(result.result).toBeDefined();
    expect(result.database.transactionCommitted).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(event).toMatchObject({
      eventType,
      actorType: 'user',
      actorUserId: ACTOR_ID,
      actorSnapshotId: ACTOR_ID,
      actorSnapshotDisplayName: 'Audit Actor',
      actorSnapshotEmail: 'actor@example.test',
      outcome: 'success',
      requestId: REQUEST_ID,
      sessionId: SESSION_ID,
    });
    expect(JSON.stringify(event)).not.toMatch(/password|token|secret|authorization|cookie/i);
    const metadata = event?.metadata;
    expect(metadata && Object.keys(metadata).sort()).toEqual(['after', 'before']);
    for (const side of ['before', 'after'] as const) {
      const value = metadata?.[side];
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const allowed = eventType.startsWith('category.')
          ? ['description', 'isActive', 'name', 'slug']
          : eventType.startsWith('role.')
            ? ['code', 'description', 'name', 'permissionCodes']
            : eventType === 'user.profile_updated'
              ? ['displayName']
              : ['email', 'roleId', 'status'];
        expect(Object.keys(value).every((key) => allowed.includes(key))).toBe(true);
      }
    }
  });

  it('keeps owner state committed and logs one sanitized error when append fails', async () => {
    const database = new FakeDatabase({ insert: [[categoryBefore]], select: [[actor]] });
    const audit = createAuditHarness<CategoryAuditExecutor>(true);
    const result = await createCategoryRepository(
      database as unknown as CategoryDatabase,
      audit.service,
    ).create({ name: 'News', slug: 'news' }, auditContext('category.created', 'category'));

    expect(result).toEqual(categoryBefore);
    expect(database.transactionCommitted).toBe(true);
    expect(audit.events).toHaveLength(0);
    expect(audit.logs).toEqual([
      {
        context: { eventType: 'category.created', requestId: REQUEST_ID },
        message: 'Audit event write failed',
      },
    ]);
    expect(JSON.stringify(audit.logs)).not.toContain('actor@example.test');
  });

  it('does not duplicate an accepted profile update or audit row on a no-op', async () => {
    const database = new FakeDatabase({
      select: [
        [
          {
            id: ACTOR_ID,
            email: actor.email,
            displayName: 'Audit Actor',
            status: 'active',
            deletedAt: null,
            mustChangePassword: false,
          },
        ],
      ],
    });
    const audit = createAuditHarness<ContextAuditExecutor>();
    const repository = createAuthenticatedUserRepository(
      database as unknown as ContextDatabase,
      audit.service,
    );

    await expect(
      repository.updateDisplayName({
        userId: ACTOR_ID,
        displayName: 'Audit Actor',
        requestId: REQUEST_ID,
        sessionId: SESSION_ID,
        ipAddress: null,
        userAgent: null,
      }),
    ).resolves.toBe('unchanged');

    expect(database.transactionCommitted).toBe(true);
    expect(audit.events).toHaveLength(0);
  });

  it('preserves fail-closed behavior for existing required audit writers', async () => {
    const audit = createAuditHarness<undefined>(true);
    const event = auditContext('auth.password_change.completed', 'user');

    await expect(audit.service.recordRequired(event, undefined)).rejects.toThrow(
      'audit unavailable',
    );
    expect(audit.logs).toHaveLength(0);
    expect(audit.events).toHaveLength(0);
  });

  it('keeps audit event IDs independent across repeated appends', async () => {
    const audit = createAuditHarness<ContextAuditExecutor>();
    const first = auditContext('category.created', 'category');
    const second = auditContext('category.created', 'category');

    await audit.service.recordInformational({ ...first, resourceId: randomUUID() });
    await audit.service.recordInformational({ ...second, resourceId: randomUUID() });

    expect(audit.events).toHaveLength(2);
    expect(audit.events[0]).not.toBe(audit.events[1]);
  });
});
