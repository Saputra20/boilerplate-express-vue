# be/28-role-crud-implementation — Role CRUD Implementation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/28-role-crud-implementation` |
| Batch | N/A |
| Owning Feature | Role management |
| Workstream | Backend |
| Task Category | Business module / API |
| Repository/App | `apps/api` |
| Status | Approved implementation task — dependency-gated |
| Priority | N/A |
| Suggested Size | Medium |
| Depends On | `be/27-role-crud` (approved), `be/04-identity-schema`, `be/13-rbac-permissions`, `be/14-audit-trail`, `be/23-versioned-openapi-swagger`, `be/25-authenticated-rbac-context`, approved role-permission catalog dependency |
| Blocks | `fe/15-role-crud` |
| Execution Order | 28 |

## 2. Outcome

Add an authenticated, permission-protected Role CRUD module under the finalized module architecture. The module creates, lists, reads, updates, and hard-deletes roles using existing identity tables, preserves user assignments, protects the canonical bootstrap role, and writes required generic audit events in the owning transaction.

## 3. Context

Implement strictly from the approved `be/27-role-crud` contract. `be/27` is planning-only. Existing source is authoritative for schema, middleware, errors, audit APIs, and application composition.

## 4. Dependencies

| Dependency | Evidence/status |
| --- | --- |
| Approved `be/27-role-crud` | Finalized contract at `tasks/be/27-role-crud/technical.md`. |
| Identity schema | `apps/api/src/config/drizzle/schema.ts` contains `roles`, `users`, `user_roles`, and related constraints. |
| Authentication/RBAC | Existing authentication and permission middleware/services must be reused; no role-label/JWT bypass. |
| Audit trail | Existing `apps/api/src/modules/audit/` generic append-only service/repository must support required same-transaction writes. |
| Versioned OpenAPI | Existing aggregate loader and module YAML conventions must be extended only for mounted routes. |
| Role-management permission catalog | **Not present in current repository evidence.** Obtain approved exact persisted keys before enabling routes; do not invent keys. |
| Unique role-name enforcement | Existing schema has no `roles.name` unique constraint. If service-only checking cannot provide race-safe uniqueness, add one focused Drizzle migration and matching DOWN file with isolated UP/DOWN/re-apply evidence. |

Do not mark a dependency complete without source, migration, or test evidence.

## 5. In Scope

- Add module-first Role CRUD under `apps/api/src/modules/role/`.
- Mount only `/api/v1/roles` and the five approved methods.
- Reuse authentication and exact approved persisted permissions for read, create, update, and delete.
- Validate UUID params, body, and list query at trust boundaries.
- Trim and validate names, reject empty names, enforce unique names, preserve immutable lowercase codes, and bound descriptions according to existing conventions.
- Implement pagination, name search, deterministic sorting, and the established list response shape.
- Reject protected-role destructive mutations for canonical existing `admin` without inventing additional protected names.
- Reject deletion of roles assigned in `user_roles` without detaching assignments.
- Reuse generic audit infrastructure for successful mutations and applicable rejected protected mutations.
- Add module OpenAPI and focused tests; update aggregate exact-path validation.

## 6. Out of Scope

Role-permission assignment/replacement APIs, permission catalog CRUD, `GET /api/v1/permissions`, frontend Role CRUD, User/Category CRUD, authentication redesign, JWT claim changes, admin bypasses, soft delete, restore, bulk operations, hierarchy, wildcard permissions, tenant ownership, speculative schema fields, assignment detachment, unrelated refactors, unrelated migrations, and dependency upgrades.

## 7. Existing Implementation To Inspect

- `apps/api/src/config/drizzle/schema.ts`
- `apps/api/src/modules/rbac/`
- `apps/api/src/modules/audit/`
- `apps/api/src/middleware/authentication.middleware.ts`
- `apps/api/src/middleware/permission.middleware.ts`
- `apps/api/src/config/openapi/openapi.ts`
- `apps/api/src/app.ts` and `apps/api/src/server.ts`
- `apps/api/src/modules/category/` as current CRUD/API reference
- `apps/api/tests/category.test.ts`, `rbac-permissions.test.ts`, `audit-trail.test.ts`, `openapi.test.ts`, and database integration helpers

## 8. Implementation Requirements

### 8.1 Architecture and composition

Use `apps/api/src/modules/role/`, because finalized project architecture uses `modules`, not `modul`. Keep router/controller transport-only, service business rules, repository database access, validation at trust boundaries, and module composition local. Application composition owns `/api/v1/roles`; the module router uses relative paths.

### 8.2 Fields and validation

Use existing `roles` fields: `id`, `code`, `name`, nullable `description`, `createdAt`, and `updatedAt`. Create requires `code` and `name`; PATCH cannot change `code` and accepts `name` and nullable `description`. Trim `name`, reject empty trimmed values, and use the existing API maximum-length convention. Preserve the lowercase code boundary and database constraint. Reject duplicate names deterministically; use a database uniqueness constraint for race safety when required. Reject unknown fields and malformed UUID/query values with existing validation errors.

### 8.3 List and response

`GET /api/v1/roles` supports `page`, `limit`, `search` over `name`, and sort values `name.asc`, `name.desc`, `createdAt.asc`, `createdAt.desc`, with existing defaults/bounds. Return `{ items, pagination: { page, limit, total, totalPages } }`. Role JSON uses camelCase and only approved role fields.

### 8.4 Authorization

Require bearer authentication on every Role CRUD route and exact persisted permission keys supplied by the approved catalog dependency. If keys are absent or middleware configuration is invalid, fail closed. Never derive permissions from paths, methods, role labels, JWT claims, or frontend state.

### 8.5 Protected and assigned roles

Treat canonical existing `admin` as protected because it is current bootstrap evidence. Protected roles cannot be deleted or destructively updated; do not invent additional protected names. Before delete, check `user_roles`; assigned roles return deterministic conflict and remain intact. Do not rely on raw FK errors or detach assignments.

### 8.6 Audit and transactions

Create, update, and delete write `role.created`, `role.updated`, and `role.deleted` generic audit events in the same transaction. Protected destructive rejection uses the current generic audit taxonomy when required. Metadata is explicit, bounded, and secret-free. Required audit failure rolls back the mutation.

## 9. Applicable Contracts

### API Contract

| Method | Path | Auth | Permission | Success |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/roles` | Bearer | approved role-read key | `200` paginated list |
| GET | `/api/v1/roles/:id` | Bearer | approved role-read key | `200` role |
| POST | `/api/v1/roles` | Bearer | approved role-create key | `201` role |
| PATCH | `/api/v1/roles/:id` | Bearer | approved role-update key | `200` role |
| DELETE | `/api/v1/roles/:id` | Bearer | approved role-delete key | established delete success; verify current convention |

Validation, not-found, conflict, authentication, authorization, and internal errors use existing envelopes/statuses.

### Database Contract

Reuse `roles`, `user_roles`, and `role_permissions`; no migration is expected unless unique role-name enforcement genuinely requires one. Any migration must be a focused role-name uniqueness migration with matching `.down.sql`, journal entry only for the forward file, and isolated UP/DOWN/re-apply evidence. Delete is hard delete only after assigned/protected checks pass; audit history must not cascade.

### Configuration Contract

Not applicable — no new environment variables.

### UI Contract

Not applicable — frontend is out of scope.

## 10. File Impact

### Expected Create

- `apps/api/src/modules/role/` router, controller, service, repository, validation/types, module composition, and module-owned OpenAPI YAML.
- Focused Role CRUD tests.
- Optional focused unique-name migration and matching DOWN file only when required by evidence.

### Expected Modify

- `apps/api/src/app.ts` and `apps/api/src/server.ts` for module composition.
- `apps/api/src/config/openapi/openapi.ts` and OpenAPI tests for actual mounted paths.
- Permission catalog/seed owner only if an approved dependency authorizes exact keys.

### Expected Not Modified

Auth behavior, JWT claims, user-management behavior, category behavior, role-permission assignment APIs, unrelated migrations, package manifests, lockfiles, and frontend code.

## 11. Runtime Behavior

Valid flow: security middleware → bearer authentication → explicit persisted role permission → Zod validation → controller → service protected/assignment/name rules → repository transaction and required audit → sanitized response.

Failure flow: invalid authentication `401`; missing permission `403`; invalid input validation error; missing role `404`; duplicate name/code, protected mutation, or assigned deletion deterministic conflict; repository/audit failure rolls back and reaches centralized safe error handling.

## 12. Error And Edge Cases

| Scenario | Expected result |
| --- | --- |
| Empty/whitespace name | Validation error, no write |
| Duplicate name/code | `409` conflict, no rename |
| PATCH code field | Validation error, no write |
| Unknown UUID/role | `400` malformed UUID or `404` absent |
| Missing/invalid bearer | Existing `401` |
| Missing permission | Existing `403` |
| Protected `admin` mutation | Deterministic `409`, no destructive write |
| Assigned role delete | Deterministic `409`, assignments preserved |
| Audit failure | Mutation rollback and sanitized internal error |
| Missing permission catalog | Block route activation; never permit by default |

## 13. Security Requirements

Server-side persisted RBAC is the authorization source of truth and denies by default. Validate every request-controlled value and use parameterized Drizzle queries. Do not expose credentials, tokens, password hashes, SQL, stacks, or raw database errors. Preserve audit allowlist/redaction rules and atomic required audit writes. Protect bootstrap behavior in backend service logic, independent of UI or JWT claims.

## 14. Test Requirements

### Happy Path

List, detail, create, update, and delete a role with approved fields; search by name; pagination; deterministic sorting; response shape.

### Validation/business rules

Trim valid names; reject empty names, unknown fields, malformed UUIDs, immutable code changes, invalid code, invalid description, duplicate name/code, protected `admin` mutation, and assigned-role deletion.

### Security/errors

Unauthenticated requests return `401`; callers without each required persisted permission return `403`; missing roles return `404`; repository/audit failures are sanitized and roll back mutations.

### Audit/regression

Assert required create/update/delete audit writes and applicable protected-mutation audit behavior. Preserve existing auth, RBAC, OpenAPI, schema, and application-composition tests.

## 15. Task-Level Expected Results

- Only approved v1 Role routes are mounted.
- Validation and business rules remain in the role module.
- Authorization uses approved persisted keys and fails closed when missing.
- Protected and assigned roles cannot be destructively deleted.
- Mutations and required audits are atomic.
- OpenAPI, tests, and aggregate route validation match runtime.

## 16. Acceptance Criteria

- [ ] Five approved endpoints exist at `/api/v1/roles` using existing response/error conventions.
- [ ] Fields match existing schema; no convenience columns or parallel concepts.
- [ ] Names are trimmed, non-empty, unique, deterministic, and race-safe.
- [ ] Code is required on create, lowercase per existing schema, unique, and immutable.
- [ ] Canonical `admin` cannot be destructively modified.
- [ ] Assigned roles cannot be deleted and assignments remain intact.
- [ ] Each route uses an approved persisted permission key and fails closed when missing.
- [ ] Role-permission assignment is not added.
- [ ] Pagination, name search, deterministic sorting, and response shape match the approved contract.
- [ ] Required mutation audit events are atomic and safe.
- [ ] Focused tests cover required scenarios and regressions remain valid.
- [ ] OpenAPI documents only actual mounted routes.

## 17. Anti-Slop Requirements

Code Anti-Slop is required: reject generic CRUD abstractions, duplicate repositories, invented permissions, speculative schema fields, dead code, hidden TODO/FIXME/HACK, unjustified assertions/`any`, raw database errors, fake audit behavior, and unrelated files. UI Anti-Slop and browser verification are not applicable.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api format:check`
- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused Role CRUD tests.
- `bun run --cwd apps/api test`.

### Database

- `bun run --cwd apps/api db:generate` and schema review.
- If unique-name migration is added, execute isolated UP, DOWN, and re-apply with the repository rollback executor.

### OpenAPI

Aggregate OpenAPI validation and exact-path tests.

### Anti-Slop

Code Anti-Slop review after implementation and after fixes.

## 19. Completion Evidence

Endpoint and authorization tests map to each route and permission boundary. Validation/business tests prove trimming, uniqueness, protected-role, and assignment behavior. Audit tests prove required same-transaction writes and rollback. OpenAPI tests prove only mounted role paths are documented. Static commands, focused/full tests, migration evidence where applicable, `git diff --check`, and changed-file/secret review are required.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

- Exact persisted permission identifiers for role read/create/update/delete are blocking because current source contains no approved role-management catalog. Do not invent them.
- Confirm established DELETE success status at implementation time from current API conventions before finalizing route tests/OpenAPI.
- Determine from implementation evidence whether a unique-name migration is required for race-safe enforcement; if so, document and validate it independently.

## 22. Definition Of Done

- [ ] Acceptance criteria pass with evidence.
- [ ] Scope remains limited to Role CRUD and approved dependencies.
- [ ] Authentication, authorization, validation, protected-role, assignment, and audit behavior are implemented and tested.
- [ ] Lint, typecheck, format, focused/full tests, OpenAPI, and applicable migration checks pass.
- [ ] Code Anti-Slop passes.
- [ ] `git diff --check`, changed-file review, and secret review pass.
- [ ] No unrelated production changes remain.
