# be/27-role-crud — Role CRUD Contract

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/27-role-crud` |
| Batch | N/A |
| Owning Feature | Role management |
| Workstream | Backend |
| Task Category | API contract planning |
| Repository/App | `apps/api` |
| Status | **Approved/finalized contract — planning only** |
| Priority | N/A |
| Suggested Size | Medium |
| Depends On | `be/04-identity-schema`, `be/13-rbac-permissions`, `be/14-audit-trail`, `be/23-versioned-openapi-swagger`, `be/25-authenticated-rbac-context` |
| Blocks | `be/28-role-crud-implementation`, `fe/15-role-crud` |
| Execution Order | 27 |

## 2. Outcome

Approve the observable Role CRUD contract and split its implementation into `be/28-role-crud-implementation`. This task changes planning documents only; it creates no route, schema, migration, permission, controller, or runtime behavior.

## 3. Context

- `docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md` require module-first backend capabilities under `apps/api/src/modules/<module>/` with request flow `middleware → router → controller → service/use case → repository → database`.
- `docs/DATABASE.md` and `tasks/be/04-identity-schema/technical.md` define the existing `roles`, `permissions`, `user_roles`, and `role_permissions` tables.
- The current `roles` table has required `id`, `code`, `name`, `createdAt`, and `updatedAt`, nullable `description`, unique lowercase `code`, and no unique `name` constraint.
- `be/13-rbac-permissions` defines backend-authoritative persisted RBAC. Current source has no approved `role.*` or `permission.read` catalog entries.
- `be/14-audit-trail` owns generic append-only `audit_events`; mutations must reuse it.
- Existing category API conventions establish `/api/v1`, camelCase JSON, and paginated list responses.

## 4. Dependencies

- Existing identity/RBAC schema, authentication middleware, permission middleware, centralized errors, OpenAPI aggregation, and audit service are required by the successor.
- Exact persisted permission keys for role read/create/update/delete are not present in current source. The successor must depend on an approved catalog task and must not invent keys.
- The successor may require a focused migration for unique role names because the existing schema does not enforce that rule. That migration belongs to `be/28`, not this planning task.

## 5. In Scope

Approve the Role CRUD routes, fields, lifecycle, validation, authorization boundary, protected-role policy, error behavior, audit behavior, and implementation successor. Record conflicts with finalized repository contracts without silently overriding them.

## 6. Out of Scope

Production implementation, migrations, seed changes, OpenAPI files, tests, package changes, runtime behavior, role-permission assignment APIs, permission-management APIs, frontend Role CRUD, User CRUD, Category CRUD, authentication changes, new RBAC models, admin bypasses, and unrelated refactors.

## 7. Existing Implementation

- `apps/api/src/config/drizzle/schema.ts` — role and relation schema.
- `apps/api/src/middleware/authentication.middleware.ts` and `permission.middleware.ts` — security boundaries.
- `apps/api/src/modules/rbac/` — persisted permission resolution.
- `apps/api/src/modules/audit/` — generic audit service/repository.
- `apps/api/src/config/openapi/openapi.ts` — aggregate loader and exact-path validation.
- `apps/api/src/app.ts`, `apps/api/src/server.ts`, and `apps/api/scripts/db-seed.ts` — composition and current bootstrap/catalog evidence.

## 8. Implementation Requirements — Approved Contract

### 8.1 API routes

Base path: `/api/v1/roles`.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/v1/roles` | List roles |
| GET | `/api/v1/roles/:id` | Read one role |
| POST | `/api/v1/roles` | Create role |
| PATCH | `/api/v1/roles/:id` | Update role |
| DELETE | `/api/v1/roles/:id` | Delete role |

No additional endpoint is approved. Role-permission assignment remains separate.

### 8.2 Role model and schema authority

The existing identity schema wins where the earlier proposal omitted or contradicted a field. Role API representations may contain `id`, required `code`, required `name`, nullable `description`, `createdAt`, and `updatedAt`. `code` is required on create, remains lowercase/unique under the existing schema, and is immutable after creation. No protected-role column is added; protection is a backend catalog decision because the schema has no such metadata field.

### 8.3 Name and code validation

- `name` is required, trimmed at the trust boundary, rejected when empty after trimming, and bounded by the existing API validation convention.
- `name` is unique. Duplicate names return the existing deterministic conflict/domain error; requests are never silently renamed.
- `code` uses the existing lowercase role-code constraint and unique key. PATCH cannot change it.
- `description` is nullable and bounded according to existing validation conventions.
- No silent normalization is allowed beyond approved name trimming and the existing lowercase code storage boundary.

### 8.4 Lifecycle and deletion

Create, read, update, and hard delete are approved. No soft delete is introduced because `roles` has no deletion column. Deletion must reject roles assigned through `user_roles`; it must not detach assignments. The existing FK uses cascade semantics, so the successor must check assignment existence and fail before deletion. Missing roles use the existing not-found convention.

Protected/system roles cannot be destructively modified. Current repository evidence identifies `admin` as the canonical bootstrap role; no additional role names may be invented.

### 8.5 Authorization and permissions

Role CRUD is server-authorized through existing authentication and persisted-permission middleware. Required boundaries are role read/list, create, update, and delete. Exact permission keys are not present in the approved catalog; the successor must use the exact keys supplied by an approved dependency and must fail closed when absent. No role label, JWT claim, UI state, or client flag grants access. Permission catalog reads and role-permission assignment are outside basic Role CRUD.

### 8.6 Query behavior

`GET /api/v1/roles` reuses `{ items, pagination: { page, limit, total, totalPages } }`, with page default `1`/minimum `1` and limit default `20`/maximum `100`. Approved query capabilities are `search` over role `name` and deterministic sort values `name.asc`, `name.desc`, `createdAt.asc`, and `createdAt.desc`, default `createdAt.desc`. No arbitrary filter or query DSL is approved.

### 8.7 HTTP and errors

List/read return `200`; create returns `201`; update returns `200`; delete uses the established delete convention (the current category contract uses `204`, which the successor must verify and reuse). Invalid input, authentication, authorization, not-found, conflict, and internal errors use existing conventions. Duplicate name/code, assigned deletion, and protected mutation are deterministic conflicts (`409` under the current API convention). No new response envelope or raw database error is introduced.

### 8.8 Audit

Role mutations reuse generic `audit_events` and required same-transaction writes: `role.created`, `role.updated`, and `role.deleted`. Rejected protected destructive mutation is recorded when required by the current audit taxonomy. Reads are not audited. Metadata is allowlisted, bounded, and secret-free; required audit failure rolls back the mutation.

## 9. Applicable Contracts

### API Contract

The five approved `/api/v1/roles` endpoints use existing authentication, persisted RBAC, camelCase JSON, established status/error envelopes, and the established paginated list shape. Exact persisted role permission keys remain an explicit successor dependency.

### Database Contract

Reuse existing `roles`, `user_roles`, and `role_permissions`. No migration is approved in `be/27`; a focused unique-name migration is allowed only in `be/28` when race-safe enforcement requires it.

### Audit Contract

Reuse generic append-only `audit_events` with required same-transaction mutation writes and existing metadata redaction.

## 10. File Impact

`be/27` changes only this contract and its Indonesian explanation. The successor may create `apps/api/src/modules/role/`, module OpenAPI, tests, and a focused unique-name migration only if genuinely required. It may modify application/OpenAPI composition only for actual mounted routes. No production file is attributed to `be/27`.

The requested `apps/api/src/modul/role/` path conflicts with finalized `docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md`; the authority winner is `apps/api/src/modules/role/`.

## 11. Runtime Behavior

No runtime behavior is introduced by `be/27`. The successor flow is security middleware → authentication → persisted permission → validation → controller → service → repository transaction → required audit → sanitized response.

## 12. Error And Edge Cases

| Scenario | Expected result |
| --- | --- |
| Empty/whitespace name | Existing validation error; no write |
| Duplicate name/code | Deterministic conflict; no rename |
| PATCH code field | Validation error; no write |
| Unknown role | Existing `404` |
| Protected role mutation | Deterministic conflict; no destructive write; failure audit where required |
| Assigned role deletion | Deterministic conflict; assignments remain |
| Missing permission catalog | Successor remains blocked; never permit by default |
| Audit failure | Mutation rollback and sanitized internal error |

## 13. Security Requirements

Backend persisted RBAC is authoritative and deny-by-default. Validate params/query/body at trust boundaries. Never trust client role labels, UI state, JWT role claims, or `isAdmin`. Never expose credentials, tokens, password hashes, SQL, stacks, or raw database errors. Preserve assignments on failed deletion and make required audit/mutation writes atomic.

## 14. Test Requirements

The successor must test list, detail, create, update, delete, trimming/empty names, duplicate name/code, immutable code, not-found, unauthenticated, unauthorized, protected-role behavior, assigned-role deletion, service/repository errors, required audit integration, and existing auth/RBAC/OpenAPI regressions.

## 15. Task-Level Expected Results

- This contract is finalized and documentation-only.
- `tasks/be/28-role-crud-implementation/` exists and is executable once dependencies are available.
- Missing permission catalog and possible unique-name migration are explicit dependencies.
- No Role CRUD production code is attributed to `be/27`.

## 16. Acceptance Criteria

- [x] Approved routes/base path, fields, name rules, lifecycle, protected role, authorization boundary, query behavior, HTTP errors, and audit behavior are recorded.
- [x] Existing schema and architecture conflicts are documented with the authority winner.
- [x] Role-permission assignment and unrelated features are excluded.
- [x] Successor implementation task is created and referenced.
- [x] No production implementation is included.

## 17. Anti-Slop Requirements

Reject generic CRUD scaffolding, speculative role names, wildcard permissions, duplicate authorization logic, parallel audit systems, invented schema fields, hidden TODOs, and implementation claims. UI Anti-Slop and visual verification are not applicable.

## 18. Validation Requirements

Review against `AGENTS.md`, architecture/API/database/security docs, schema source, RBAC, audit, and task graph. Run `git diff --check` and changed-file review. Confirm the successor depends on this task and no cycle is introduced.

## 19. Completion Evidence

Finalized `technical.md`, consistent Indonesian `explanation.md`, successor files, explicit conflict/dependency records, `git diff --check`, and changed-file review.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

No contract decision remains open. Implementation dependencies remain explicit: exact persisted role permission identifiers must be supplied by an approved catalog task, and the successor must evidence whether a unique-name migration is required for race-safe enforcement.

## 22. Definition Of Done

- [x] Contract decisions are approved and observable.
- [x] Finalized schema and architecture conflicts are documented.
- [x] Scope excludes production implementation.
- [x] Successor task exists with dependencies and quality gates.
- [x] Explanation is consistent and in Indonesian.
- [x] Diff check and changed-file review pass.
