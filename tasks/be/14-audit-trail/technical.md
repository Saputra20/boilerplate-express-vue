# be/14-audit-trail — Audit Trail

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/14-audit-trail` |
| Batch | N/A |
| Owning Feature | Audit foundation |
| Workstream | Backend |
| Task Category | Database / security infrastructure |
| Repository/App | `apps/api` |
| Status | Ready — approved execution contract |
| Priority | Foundation execution order 14 |
| Suggested Size | Small — one focused generic audit boundary and migration |
| Depends On | `be/03-database-foundation`, `be/06-logging-foundation`, `be/10-login-session`, `be/13-rbac-permissions` |
| Blocks | `be/15-bullmq-foundation` |
| Execution Order | 14 |

## 2. Outcome

Create append-only generic `audit_events` storage and an internal validated append boundary. It records future approved security/business events without changing current `auth_audit_events` behavior.

## 3. Context

`apps/api/src/database/schema.ts` already defines `auth_audit_events` for login, refresh, and logout events. Auth repositories write those records directly in their state transactions. Pino/Morgan logs and request IDs already exist; logs are not durable audit history. RBAC authorization is backend-side and has no public audit-read route. See `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/ARCHITECTURE.md`, and approved tasks `be/10` through `be/13`.

## 4. Dependencies

- PostgreSQL and Drizzle migration infrastructure from `be/03`.
- Request correlation and safe Pino logging from `be/06`.
- Existing auth audit behavior remains unchanged.
- Existing RBAC relation/middleware from `be/13`; no `audit.read` permission or route exists yet.

## 5. In Scope

- Generic `audit_events` table, append-only repository/service boundary, metadata validation, and focused tests.
- One entity-scoped `create-audit-events-table` Drizzle migration with UP/DOWN evidence.
- Internal deterministic retention cleanup capability for rows older than 90 days; no scheduler.
- Transaction participation for fail-closed callers.
- Documentation/rule updates required by this contract.

## 6. Out of Scope

- Migration, rename, deletion, rewrite, or automatic dual-write of `auth_audit_events`.
- Public/admin audit read or write API, viewer UI, filtering, pagination, export, or `audit.read` seed.
- Business event catalog, tenant audit, SIEM/warehouse integration, WORM storage, and compliance retention policy.
- BullMQ/scheduled cleanup; `be/15` owns future scheduling.
- Generic audit CRUD, update, single-row delete, and arbitrary client-submitted events.

## 7. Existing Implementation

- `apps/api/src/database/schema.ts`: `auth_audit_events` has `eventType`, `userId`, `sessionId`, `requestId`, `reason`, and `createdAt`.
- `apps/api/src/auth/login-repository.ts`, `refresh-repository.ts`, and `logout-repository.ts`: existing auth-specific audit writers.
- `apps/api/src/logging/index.ts`: request-correlated Pino/Morgan logs.
- `apps/api/src/auth/permission-middleware.ts`: current authorization boundary.
- `apps/api/drizzle/0010_create-token-revocations-table.sql`: latest migration sequence at contract approval.

Expected paths are guidance; inspect repository before finalizing changes.

## 8. Implementation Requirements

- Add a focused internal append boundary, named by repository conventions, accepting explicitly constructed event data only. No HTTP endpoint accepts arbitrary audit input.
- Validate boundary input with Zod before persistence.
- Event names match `^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){1,2}$`: `<domain>.<action>` or `<domain>.<resource>.<action>`. Event definitions remain owned by future emitting tasks; do not pre-seed a catalog.
- `actorType` is required: `user` or `system`. `actorUserId` is nullable and only represents a user actor.
- Store `outcome` as required `success` or `failure`. Do not add a duplicated `action` column because `eventType` already supplies action semantics.
- `metadata` must be explicitly constructed, JSON-serializable, and at most 8 KiB when UTF-8 serialized. Reject invalid/oversized metadata before insert with a typed sanitized internal validation error.
- Reject metadata keys, at every nesting level, that normalize to or contain credential/security payload names: `password`, `credential`, `secret`, `token`, `authorization`, `cookie`, `privatekey`, `connectionstring`, `stack`, or `headers`. Never serialize exception objects, whole request/response bodies, entities, or user objects.
- Use stable IDs rather than mutable PII. IP address is nullable and stored only when an owning event contract explicitly supplies it. User agent is nullable, untrusted, and capped at 512 characters.
- Append-only boundary exposes no update/delete operation. Retention cleanup is its only destructive operation.
- Support caller-provided Drizzle transaction/database executor so required audit insert joins its owner transaction.
- Required security/state-change events use fail-closed only when their owning task explicitly marks audit persistence required. Same transaction persists state and audit row; failed audit insert rolls back and operation must not report success.
- Explicit informational events use best-effort only. Audit failure logs a sanitized Pino operational error with request ID/event type, does not contain metadata, and never recursively creates another audit event.
- Unknown audit criticality is not silently best-effort for security-sensitive state changes. Owning use case chooses fixed policy, not client input.
- Retention baseline is 90 days. Rows older than threshold are eligible for deterministic internal cleanup. Do not schedule cleanup in this task.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no environment variable is added.

### API Contract

Not applicable — task provides no public audit read/write endpoint.

### Database Contract

Create separate `audit_events`; preserve `auth_audit_events` and all existing auth flows.

| Logical field | PostgreSQL column | Type | Nullable | Constraints / indexes / deletion behavior |
| --- | --- | --- | --- | --- |
| ID | `id` | UUID | No | PK, generated UUID |
| Event type | `event_type` | text | No | Validated machine name; index |
| Actor user | `actor_user_id` | UUID | Yes | FK `users.id` `ON DELETE SET NULL`; index; never cascade audit deletion |
| Actor type | `actor_type` | text | No | Check `user` or `system` |
| Resource type | `resource_type` | text | Yes | Stable identifier; composite index with `resource_id` |
| Resource ID | `resource_id` | text | Yes | Generic historical identifier; no polymorphic FK |
| Outcome | `outcome` | text | No | Check `success` or `failure` |
| Reason | `reason_code` | text | Yes | Machine-readable only; no error dump |
| Request | `request_id` | UUID | Yes | Existing request-correlation identifier |
| Session | `session_id` | UUID | Yes | FK `auth_sessions.id` `ON DELETE SET NULL`; no cascade |
| IP | `ip_address` | text | Yes | Explicit event-contract use only |
| User agent | `user_agent` | text | Yes | Boundary cap: 512 characters |
| Metadata | `metadata` | JSONB | Yes | Explicit allowlist by caller; boundary redaction/JSON/8 KiB validation; no JSON index |
| Creation time | `created_at` | timestamptz | No | Default current time; index; no `updated_at` |

Migration: create one focused `create-audit-events-table` migration. UP creates table, checks, foreign keys, and only listed indexes. DOWN removes this table and its dependents only. Do not rewrite any `auth_audit_events` migration.

### UI Contract

Not applicable — no UI or audit viewer is added.

## 10. File Impact

### Expected Create

- `apps/api/src/audit/` focused append/retention boundary modules.
- `apps/api/tests/audit-trail.test.ts` or repository-equivalent focused tests.
- Next Drizzle migration and generated metadata for `create-audit-events-table`.

### Expected Modify

- `apps/api/src/database/schema.ts`.
- `docs/DATABASE.md`, `docs/SECURITY.md`, `AGENTS.md` when required by this contract.

### Expected Not Modified

- Existing `auth_audit_events` schema/migrations and auth audit writers.
- Auth route/API contracts, RBAC catalog/routes, client apps, secrets, and successor task code.

## 11. Runtime Behavior

1. Owning use case explicitly constructs safe audit input and its fixed criticality policy.
2. Boundary validates event name, enums, identifier shape, user-agent bound, and metadata redaction/size/JSON rules.
3. For required fail-closed event, boundary inserts using owning transaction. Any insert failure rolls back primary state and emits no successful response.
4. For approved informational event, boundary attempts insert. Failure creates one sanitized operational log entry and primary operation may continue.
5. Stored audit event remains immutable. Internal cleanup may delete rows only after `created_at < now - 90 days`.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / recovery |
| --- | --- | --- |
| Invalid/vague event name | Reject before write | No schema migration required for future valid event |
| Forbidden/non-JSON/oversized metadata | Typed sanitized validation failure; no row | No secret or payload reaches database/log |
| Required audit insert fails | Owner transaction rolls back; no success result | Fail-closed only for explicitly required event |
| Informational audit insert fails | Safe operational log; primary operation may continue | No audit recursion or metadata log |
| Actor/session deleted | Audit row remains; FK becomes null | Never cascade-delete historical record |
| Cleanup boundary runs | Deletes only records older than 90 days | No scheduler/job introduced |
| Existing auth audit action | Uses `auth_audit_events` unchanged | No automatic dual write |

## 13. Security Requirements

- Audit history is durable structured data, distinct from Pino/Morgan logs.
- Never persist/log plaintext passwords, hashes, raw access/refresh tokens, token fingerprints, Authorization headers, cookies, private keys, secrets, connection strings, raw credentials, exception stacks, or whole HTTP/database payloads.
- Preserve request correlation when supplied.
- No public audit reads/writes. Future read API requires explicit RBAC permission and approved pagination/data-minimization contract.
- Use `ON DELETE SET NULL`, not cascade, for actor/session historical references.
- Do not make retention/compliance claims beyond approved 90-day engineering baseline.

## 14. Test Requirements

| Scenario | Expected result | Test type |
| --- | --- | --- |
| Valid append | Required/nullable fields persist | PostgreSQL integration |
| Immutability | Boundary has no update/delete operation | Unit/code review |
| Actor deletion | Actor audit row remains with null actor | PostgreSQL integration |
| Taxonomy | Valid future-form event accepted; vague/malformed rejected | Unit |
| Metadata | Safe JSON persists; prohibited keys, headers/cookies, exception objects, and >8 KiB reject | Unit/integration |
| Request context | Request/user/session IDs persist; system/anonymous event may omit actor user | Integration |
| Fail-closed | Forced audit insert failure rolls back owner state | PostgreSQL integration |
| Best-effort | Failure safely logs once and primary operation completes | Unit/integration |
| Retention | Exactly older-than-90-day rows are eligible; newer rows stay | PostgreSQL integration |
| Migration | UP, schema checks, DOWN, re-UP, and no unrelated damage | Isolated PostgreSQL |
| Regression | `auth_audit_events` login/refresh/logout tests remain unchanged | Full API suite |

Tests use isolated data, deterministic cleanup, and no real secrets/tokens.

## 15. Task-Level Expected Results

- Separate append-only generic audit table exists without altering auth-specific history.
- Internal validated audit append and retention cleanup boundaries exist.
- Fail-closed transaction participation and explicit best-effort behavior are testable.
- No public audit endpoint, reader, scheduler, seed catalog, or speculative business event is added.

## 16. Acceptance Criteria

- [ ] `audit_events` is separate from preserved `auth_audit_events`.
- [ ] Event names use approved stable machine format and future valid events need no schema migration.
- [ ] Generic records are append-only; no generic CRUD/update/delete API exists.
- [ ] Metadata is explicit, JSON-safe, redacted, and capped at 8 KiB.
- [ ] Credential/token/secret/request-payload data cannot persist in generic audit metadata.
- [ ] Actor/session deletion cannot cascade-delete audit history.
- [ ] Generic retention baseline is 90 days; cleanup is deterministic but unscheduled.
- [ ] Required security/state changes can atomically fail closed; only explicit informational events may be best effort.
- [ ] No public audit read/write API or `audit.read` seed exists.
- [ ] Focused migration UP/DOWN/re-UP, tests, format, lint, typecheck, Code Anti-Slop, and diff check pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: required during implementation and after fixes. Reject generic CRUD, global event catalog, fake route/event, dual-write, audit recursion, broad JSON indexing, unbounded metadata, hidden TODO/FIXME/HACK, unchecked `any`/assertions, unused dependency, empty migration, or scheduler pulled from `be/15`. UI Anti-Slop and visual verification: not applicable — no UI work.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api format:check`
- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused audit boundary/schema/metadata/failure-policy/retention tests.
- Full `bun run --cwd apps/api test` regression suite.

### Database

- Isolated PostgreSQL migration UP, schema/constraint/index check, DOWN, re-UP.
- Verify `ON DELETE SET NULL` preserves generic audit history.

### Build / UI

Not applicable — no API build script or UI changes.

### Anti-Slop

- Code Anti-Slop during implementation and after fixes.

## 19. Completion Evidence

| Acceptance criterion | Evidence |
| --- | --- |
| Separate storage / no auth rewrite | Schema/migration diff and auth regression tests |
| Metadata security / taxonomy | Focused boundary tests |
| Transaction/failure policy | PostgreSQL rollback and best-effort tests |
| Retention / historical FK behavior | Isolated PostgreSQL tests |
| No API/scheduler/speculative scope | Changed-file review |
| Quality gates | Format, lint, typecheck, Jest, migration evidence, Code Anti-Slop, diff check |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture | `docs/ARCHITECTURE.md` request/logging boundaries |
| Database | `docs/DATABASE.md`, `auth_audit_events`, new `audit_events` |
| Security | `docs/SECURITY.md`, `AGENTS.md` |
| Dependency tasks | `be/03`, `be/06`, `be/10`–`be/13` |
| Test IDs | Not applicable — no test-ID system |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] Scope and acceptance criteria complete without successor work.
- [ ] Generic audit storage remains separate from auth-specific audit storage.
- [ ] Metadata, retention, failure policy, transaction handling, and no-cascade history behavior are proven.
- [ ] Focused and regression tests pass.
- [ ] Isolated migration UP/DOWN/re-UP passes.
- [ ] Code Anti-Slop passes.
- [ ] Format, lint, typecheck, and `git diff --check` pass.
- [ ] Changed-file/secret review complete; no public audit API, scheduler, or unrelated changes remain.
