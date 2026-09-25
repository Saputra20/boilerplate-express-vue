# be/26-category-crud — Category CRUD

## 1. Metadata

| Field           | Value |
| --------------- | ----- |
| Task ID         | `be/26-category-crud` |
| Batch           | N/A |
| Owning Feature  | Category management |
| Workstream      | Backend |
| Task Category   | Business module / API / database |
| Repository/App  | `apps/api` |
| Status          | Ready for Planning — blocked pending open-point approval |
| Priority        | N/A |
| Suggested Size  | Medium — one module, one migration, RBAC wiring, OpenAPI, and focused tests |
| Depends On      | `be/03-database-foundation`, `be/04-identity-schema`, `be/13-rbac-permissions`, `be/23-versioned-openapi-swagger`, `be/25-authenticated-rbac-context` |
| Blocks          | N/A |
| Execution Order | 26 |

## 2. Outcome

Provide an authenticated, permission-protected category resource with create, list, detail, partial update, and soft-delete operations. Persist categories in PostgreSQL through Drizzle, expose the existing API versioning and pagination/error conventions, and prove behavior through focused API, repository, migration, validation, and authorization tests.

## 3. Context

- `docs/ARCHITECTURE.md` requires business capabilities under `apps/api/src/modules/<module>/` with request flow `middleware → router → controller → service/use case → repository → database`.
- `docs/API.md` requires `/api/v1` for business routes, camelCase API JSON, Zod boundary validation, centralized safe errors, and module-owned OpenAPI YAML.
- `docs/DATABASE.md` and `apps/api/src/config/drizzle/schema.ts` establish Drizzle/PostgreSQL, snake_case database identifiers, camelCase TypeScript fields, and entity-scoped migrations.
- `apps/api/src/middleware/permission.middleware.ts` provides deny-by-default persisted RBAC enforcement. It must be reused; no category-specific authorization mechanism is allowed.
- `apps/api/src/config/openapi/openapi.ts` aggregates module YAML and currently validates an exact path list. Category paths must be added only with matching routes and tests.
- `apps/api/src/config/drizzle/rollback.ts` and `apps/api/scripts/db-rollback.ts` are the existing rollback boundary. Migration UP, DOWN, and re-apply evidence is required by `AGENTS.md`.
- Existing source has no category schema, module, route, permission catalog, or category tests.

## 4. Dependencies

- PostgreSQL and Drizzle schema/client are required for persistence and migration validation.
- `be/13-rbac-permissions` supplies authenticated permission resolution and `createPermissionMiddleware`.
- `be/23-versioned-openapi-swagger` supplies OpenAPI aggregation and module YAML conventions.
- `be/25-authenticated-rbac-context` supplies current authenticated context only; category authorization must still use route permissions.
- **Blocked dependency decision:** the project has no approved category permission catalog or bootstrap contract. Approval is required for how `category.read`, `category.create`, `category.update`, and `category.delete` become persisted permissions in local/test environments. Do not silently add seed behavior.

## 5. In Scope

- Add a `categories` PostgreSQL table and Drizzle schema definition with UUID ID, name, slug, optional description, active flag, timestamps, and nullable soft-delete timestamp.
- Add one independently reviewable category migration with matching `.down.sql`, journal entry only for the forward migration, and executable UP/DOWN/re-UP evidence.
- Add module-first category implementation under `apps/api/src/modules/category/`, adapting filenames to current module conventions if needed.
- Add authenticated v1 routes for create, list, detail, partial update, and delete.
- Reuse existing RBAC middleware with explicit route permissions: `category.read`, `category.create`, `category.update`, and `category.delete`, pending catalog approval.
- Validate body, query, and UUID path parameters with Zod.
- Enforce active/non-deleted slug uniqueness at database and service boundaries.
- Implement list pagination, search over approved category fields, active filtering, and approved sorting using the existing pagination response contract.
- Implement soft delete and approved idempotency behavior.
- Add module-owned OpenAPI documentation for actual routes and update exact-path validation.
- Add focused tests for CRUD, validation, duplicate slugs, pagination, search, soft delete, authorization, migration behavior, and regression.

## 6. Out of Scope

- Category hierarchy, parent IDs, ordering, translations, images, metadata, tenant ownership, row-level ownership, or bulk operations.
- Hard delete, restore, archive workflows, or cascading category effects on other entities.
- CMS category UI or frontend API client changes.
- Generic CRUD abstractions, factories, repositories, controllers, or new top-level `apps/api/src` directories.
- Role CRUD, permission CRUD, permission caching, admin bypasses, or client-side authorization.
- Audit-event policy unless an approved existing contract requires category state-change audit; do not invent a new audit requirement.
- Unrelated dependency upgrades, refactors, generated files, or changes to existing auth behavior.

## 7. Existing Implementation

- `apps/api/src/config/drizzle/schema.ts` owns Drizzle tables and naming conventions.
- `apps/api/src/config/database/client.ts` owns the runtime database client.
- `apps/api/src/modules/auth/` and `apps/api/src/modules/rbac/` show module composition and persisted permission enforcement.
- `apps/api/src/middleware/authentication.middleware.ts` and `apps/api/src/middleware/permission.middleware.ts` own authentication and authorization middleware.
- `apps/api/src/app.ts` composes routers under `/api/v1`; `apps/api/src/server.ts` composes runtime module dependencies.
- `apps/api/src/config/openapi/openapi.ts` loads module-owned YAML and validates the aggregate path set.
- `apps/api/tests/helpers/test-app.ts` provides isolated Express app construction but currently has no category dependency seam.
- `apps/api/tests/rbac-permissions.test.ts`, `apps/api/tests/openapi.test.ts`, and database integration tests establish current test patterns.
- `apps/api/drizzle/meta/_journal.json` records forward migrations through `0011_create-audit-events-table`.

## 8. Implementation Requirements

### 8.1 Module and composition

- Use `apps/api/src/modules/category/`, not `apps/api/src/modul/` or a global technical-layer folder.
- Keep repository code limited to Drizzle/database interaction.
- Keep service code responsible for slug uniqueness, active/non-deleted visibility, partial-update semantics, and delete behavior.
- Keep controllers responsible for HTTP input/output translation only.
- Keep route composition responsible for authentication and explicit permission middleware.
- Compose one category module from `app.ts`/`server.ts` without changing auth, health, queue, or operational route behavior.

### 8.2 Persistence

- Table name: `categories`; columns use snake_case and TypeScript fields use camelCase.
- `id` is UUID primary key with database-generated default.
- `name` is required text.
- `slug` is required text.
- `description` is nullable text.
- `is_active` is required boolean with database default `true`.
- `created_at` and `updated_at` are required timezone-aware timestamps with existing project defaults/update behavior.
- `deleted_at` is nullable timezone-aware timestamp.
- Enforce slug uniqueness among rows where `deleted_at IS NULL`; clarify whether inactive rows remain in uniqueness scope before implementation. Preferred baseline is active/non-deleted uniqueness exactly as requested, expressed with a partial unique index if PostgreSQL semantics allow the approved rule.
- Add indexes only for approved list/search/filter access patterns; do not add speculative indexes.

### 8.3 API

- Use the existing business prefix `/api/v1`.
- Proposed resource paths are `/api/v1/categories` and `/api/v1/categories/:id`; human approval must confirm these exact paths before implementation.
- Proposed methods: `POST`, `GET`, `GET`, `PATCH`, `DELETE`.
- API JSON uses camelCase: `isActive`, `createdAt`, `updatedAt`, `deletedAt`.
- Exclude soft-deleted rows from list and detail by default; do not add an include-deleted query option without approval.
- Use existing centralized error envelopes and status conventions. Exact status/error-code mapping is an open point if no current business-resource example establishes it.

### 8.4 Validation

- Validate request body, query, and UUID path parameter at trust boundaries with Zod.
- `name` is required on create and optional on patch.
- `slug` is required on create and optional on patch; accepted format and normalization rule require approval.
- `description` is optional and nullable only if approved; enforce an explicit maximum length after approval.
- `isActive` is boolean when provided.
- Reject empty patch bodies if current API conventions require it; otherwise approve no-op patch behavior.
- Never trim or silently mutate values unless the normalization contract explicitly approves it.

### 8.5 List

- Support `page`, `limit`, `search`, `isActive`, and `sort` only after aligning each with the existing pagination and sorting contract.
- Search must cover `name` and `slug` unless field scope is narrowed by approval.
- Bound page size using existing project limits; do not invent a second pagination envelope.
- Return stable ordering and total/pagination metadata exactly as the existing contract requires.

### 8.6 Authorization

- Every category route requires access authentication and one explicit permission.
- Route mapping is `GET` list/detail → `category.read`, `POST` → `category.create`, `PATCH` → `category.update`, `DELETE` → `category.delete`, pending approval of permission codes.
- Preserve `401` for absent/invalid authentication and `403` for authenticated users lacking permission.
- Do not trust request body, query, JWT role claims, CMS state, or `isAdmin` flags for authorization.

### 8.7 OpenAPI

- Add category YAML beside the owning module.
- Document only routes actually mounted in `app.ts`.
- Define request, response, pagination, validation, not-found, conflict, unauthorized, forbidden, and internal-error references consistent with existing aggregate schemas.
- Update aggregate exact-path validation and OpenAPI tests.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — category CRUD reuses existing database, authentication, RBAC, and OpenAPI configuration. No new environment variable is approved.

### API Contract

Pending approval of exact paths, status/error mapping, pagination envelope, sort vocabulary, and request field limits.

| Method | Proposed Path | Auth | Permission | Request | Response |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/categories` | Bearer | `category.create` | name, slug, optional description, optional isActive | Created category |
| GET | `/api/v1/categories` | Bearer | `category.read` | page, limit, search, isActive, sort | Existing paginated category list |
| GET | `/api/v1/categories/:id` | Bearer | `category.read` | UUID path parameter | Category detail |
| PATCH | `/api/v1/categories/:id` | Bearer | `category.update` | Partial category fields | Updated category |
| DELETE | `/api/v1/categories/:id` | Bearer | `category.delete` | UUID path parameter | Existing delete success contract |

### Database Contract

| Item | Contract |
| --- | --- |
| Table | `categories` |
| Primary key | UUID `id` |
| Required fields | `name`, `slug`, `is_active`, `created_at`, `updated_at` |
| Nullable fields | `description`, `deleted_at` |
| Delete behavior | Soft delete; exact repeated-delete response pending approval |
| Uniqueness | Slug uniqueness among approved visible rows; exact inactive/deleted scope pending approval |
| Migration | One forward SQL file plus matching `.down.sql`; no unrelated entities |
| Data impact | Additive table; no existing data mutation |

### UI Contract

Not applicable — no CMS/UI change.

## 10. File Impact

**Expected Create**

- `apps/api/src/modules/category/category.module.ts` or equivalent module composition file if current convention requires one.
- Category controller, service, repository, validation, schema/types, router, and module-owned OpenAPI YAML under `apps/api/src/modules/category/`.
- One category forward migration and matching reverse migration under `apps/api/drizzle/`.
- Focused category tests under current API test convention.

**Expected Modify**

- `apps/api/src/config/drizzle/schema.ts`.
- `apps/api/src/app.ts` and `apps/api/src/server.ts` for router/module composition.
- `apps/api/src/config/openapi/openapi.ts` and OpenAPI tests for actual category paths.
- RBAC permission bootstrap/catalog only if separately approved and already owned by current project convention.

**Expected Not Modified**

- Existing auth, health, queue, audit, Redis, JWT, CMS, and unrelated modules.
- Existing migrations and applied migration SQL.
- Package manifests and lockfiles unless an already-installed dependency is insufficient and explicit approval is given.

Expected paths are guidance; agent must inspect repository before finalizing changes.

## 11. Runtime Behavior

### Valid flow

Request enters security middleware → access authentication validates bearer token and revocation/session state → category router validates route/body/query input → permission middleware resolves persisted grant → controller delegates to service → service applies category rules → repository executes Drizzle query → controller returns existing success envelope.

### Invalid or failure flow

- Invalid/missing auth stops before category handler with existing `401` behavior.
- Missing permission stops before category handler with existing `403` behavior.
- Invalid UUID/body/query stops with existing validation error behavior and no database write.
- Duplicate visible slug stops with approved conflict behavior and no duplicate row.
- Missing/non-visible detail/update/delete target stops with approved not-found/idempotent behavior.
- Repository/database failure reaches centralized sanitized error handling; no stack, secret, SQL, or credential is returned.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Missing/invalid bearer token | Existing `401` response | Do not reveal category or user data |
| Authenticated user lacks route permission | Existing `403` response | No client-supplied role or permission accepted |
| Invalid UUID | Validation error; exact status pending existing convention | No repository query required |
| Missing/invalid create or patch field | Validation error | Do not coerce invalid values silently |
| Duplicate visible slug | Conflict response; exact code/status pending approval | Do not leak unrelated record data |
| Missing or soft-deleted detail target | Not-found response | Do not reveal deletion state unless approved |
| Repeated delete | Existing idempotent delete behavior; exact response pending approval | Must not restore or hard-delete data |
| Database failure | Central safe internal error | No SQL, stack, credentials, or raw input in response/logs |
| Empty list | Existing empty pagination shape | Stable metadata and deterministic ordering |

## 13. Security Requirements

- Require existing bearer authentication and explicit persisted RBAC permission per route.
- Validate all request-controlled values with Zod; use parameterized Drizzle queries.
- Do not expose deleted-record state, database internals, credentials, tokens, private keys, or stack traces.
- Avoid logging request bodies, authorization headers, raw tokens, or sensitive category payloads beyond existing safe request/application logging.
- Preserve existing Helmet, CORS, rate limits, body limits, request IDs, centralized errors, and graceful shutdown.
- Do not add client-side or JWT-embedded authorization state.
- Review soft-delete and slug uniqueness for race safety; database constraint remains final protection.

## 14. Test Requirements

### Happy Path

- Create valid category.
- List categories with existing pagination envelope.
- Search by approved name and slug fields.
- Filter by active state.
- Read category detail.
- Partially update one field without overwriting omitted fields.
- Soft-delete category.

### Validation

- Required name/slug rejection.
- Invalid UUID rejection.
- Invalid slug, boolean, description length, page, limit, and sort rejection after exact rules are approved.
- Empty patch behavior after approval.

### Negative / Failure

- Duplicate slug on create.
- Duplicate slug on update.
- Missing category.
- Soft-deleted category absent from list/detail/update behavior.
- Repository/database failure returns safe centralized error.

### Security

- Each route denies unauthenticated requests.
- Each route denies authenticated users without its permission.
- Each route allows authenticated users with its permission.
- Client-provided role/permission fields do not grant access.

### Regression

- Existing API, auth, RBAC, OpenAPI, and database tests pass.
- Existing route paths and exact OpenAPI validation remain correct.

### Isolation

- Category tests use isolated database state or deterministic test doubles consistent with existing backend test conventions.
- Migration validation runs against an isolated PostgreSQL database.
- Tests do not depend on execution order and clean up inserted category/RBAC state.

## 15. Task-Level Expected Results

- Category table and typed Drizzle schema exist.
- Matching forward/reverse migration executes UP, DOWN, and re-UP.
- Category module follows current module-first boundaries.
- CRUD routes use `/api/v1`, existing middleware, safe errors, and existing pagination.
- Visible slug uniqueness is enforced under concurrent writes by database constraint.
- Soft-deleted rows are inaccessible through default category reads.
- Explicit RBAC permissions protect all category routes.
- OpenAPI describes mounted category routes only.
- Focused tests and existing quality gates provide completion evidence.

## 16. Acceptance Criteria

- [ ] Human approves exact route paths and API status/error contracts.
- [ ] Human approves field length, slug format/normalization, sort vocabulary, and pagination contract.
- [ ] Human approves inactive-row participation in slug uniqueness.
- [ ] Human approves repeated-delete behavior and whether not-found includes soft-deleted targets.
- [ ] Human approves permission catalog/bootstrap source for four category permissions.
- [ ] Category table exists in Drizzle schema with approved fields and constraints.
- [ ] Migration UP passes.
- [ ] Migration DOWN passes.
- [ ] Migration RE-UP passes.
- [ ] CRUD API is implemented under existing versioned routing.
- [ ] Existing pagination response format is reused.
- [ ] Approved search and active filtering work.
- [ ] Soft delete hides deleted records without hard deletion.
- [ ] RBAC route mapping returns existing `401`/`403` behavior.
- [ ] Validation rejects all approved invalid inputs.
- [ ] OpenAPI documents actual category routes and aggregate validation passes.
- [ ] Focused and regression tests pass.
- [ ] Lint, typecheck, format check, Code Anti-Slop, and `git diff --check` pass.
- [ ] No unrelated module changes remain.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Check for generic CRUD abstractions, duplicated repository logic, speculative category fields, dead code/dependencies, fake permission bootstrap, hidden `TODO`/`FIXME`/`HACK`, unjustified `any`/assertions, misleading comments, unreachable code, unbounded list queries, and incomplete error paths.

UI Anti-Slop: not applicable — no UI changes.

Visual verification: not applicable — no rendered UI changes.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api format:check`
- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused category unit/integration/API tests.
- `bun run --cwd apps/api test`
- OpenAPI validation test.

### Build

Not applicable — no separate API build script exists; typecheck is required.

### Database

- Generate/inspect category migration through existing Drizzle workflow.
- Execute category migration UP, DOWN, and re-UP against isolated PostgreSQL using repository-compatible rollback execution.
- Confirm sibling `.down.sql` files do not alter forward Drizzle migration execution.

### UI

Not applicable — no UI changes.

### Anti-Slop

- Run Code Anti-Slop after implementation and again after fixes.
- Review changed files, diff scope, secrets, unused code, and hidden incomplete behavior.

## 19. Completion Evidence

- AC-001 through AC-005 → approved task decision record or updated contract.
- Schema/constraints → `apps/api/src/config/drizzle/schema.ts` review and focused database test.
- Migration UP/DOWN/RE-UP → command output from isolated PostgreSQL rollback validation.
- CRUD, validation, pagination, search, soft delete → focused category test file output.
- Authorization → focused route tests proving unauthenticated, denied, and allowed paths.
- OpenAPI → aggregate OpenAPI test and category module YAML review.
- Static quality → format, lint, typecheck, Code Anti-Slop, and `git diff --check` output.
- Scope → final `git status --short` and `git diff` review showing no unrelated changes.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

- Exact approved route paths: `/api/v1/categories` and `/api/v1/categories/:id` are proposed, not yet approved by current project contract.
- Exact request field maximums and slug grammar are unspecified.
- Slug normalization behavior is unspecified; decide whether input is normalized or rejected when not canonical.
- Existing pagination response and sort vocabulary have no business-resource source example; identify the authoritative contract before implementation.
- Decide whether inactive but non-deleted rows reserve slugs. User text says “active/non-deleted,” which is ambiguous for inactive rows.
- Decide repeated-delete response and whether soft-deleted targets are uniformly not found.
- Approve permission persistence/bootstrap source for `category.read`, `category.create`, `category.update`, and `category.delete`.
- Decide whether category state changes require generic audit events; no such requirement is currently established.

## 22. Definition Of Done

- [ ] Approved contract and open points resolved.
- [ ] Acceptance criteria satisfied within scope.
- [ ] Category implementation follows module boundaries.
- [ ] Focused tests pass.
- [ ] Code Anti-Slop passes.
- [ ] Lint, typecheck, and format checks pass.
- [ ] Migration UP/DOWN/re-UP executed and evidenced.
- [ ] OpenAPI and exact route validation pass.
- [ ] `git diff --check` passes.
- [ ] Changed files and secrets reviewed.
- [ ] No unrelated changes remain.

