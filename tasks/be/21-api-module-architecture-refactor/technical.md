# be/21-api-module-architecture-refactor — API Module Architecture Refactor

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/21-api-module-architecture-refactor` |
| Batch | N/A |
| Owning Feature | Backend architecture |
| Workstream | Backend |
| Task Category | Behavior-preserving structural refactor |
| Repository/App | `apps/api` |
| Status | Complete — source relocation, composition, and validation evidence recorded on 2026-09-23. |
| Priority | Architecture gate after backend quality gate |
| Suggested Size | Medium — one bounded refactor with no behavior change |
| Depends On | `be/20-backend-quality-gate` |
| Blocks | All future backend tasks that add or expand API source files; each must depend on this task before using `apps/api/src`. No numbered backend successor exists at planning time. |
| Execution Order | 21 |

## 2. Outcome

Reorganize existing API source into approved module-first ownership without changing runtime behavior. After completion, business capabilities live in `apps/api/src/modules/<module>/`; cross-cutting Express middleware lives in `apps/api/src/middleware/`; infrastructure and initialization live in `apps/api/src/config/`; small stateless technical helpers live in `apps/api/src/helpers/`; root remains `app.ts`, `server.ts`, and `shutdown.ts` only.

## 3. Context

- `AGENTS.md` defines authority, request flow, dependency direction, behavior-preserving refactor scope, Anti-Slop, and completion rules.
- `docs/ARCHITECTURE.md` defines `middleware → route → controller → service/use case → repository → database` and prohibits generic CRUD.
- `docs/DEVELOPMENT.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, and `docs/API.md` define validation, database, security, and API contract baselines.
- `be/10-login-session`, `be/11-refresh-token`, `be/12-logout-revocation`, `be/13-rbac-permissions`, and `be/14-audit-trail` establish current auth, RBAC, and audit behavior. `be/20-backend-quality-gate` must pass first.
- Current source groups auth, audit, database, health, JWT, logging, OpenAPI, password, queue, Redis, and security beside root composition files. This mixes domain, middleware, and infrastructure ownership.
- Actual current tree: `references/current-source-tree.md`. Deterministic target tree: `references/target-source-tree.md`. Module ownership: `references/module-ownership.md`.

## 4. Dependencies

- `be/20-backend-quality-gate` must be complete with its required evidence before this task starts.
- Existing PostgreSQL, Redis, JWT key files, environment contract, and test setup remain required runtime/test dependencies; this task does not change their configuration or lifecycle semantics.
- No database migration, external service, product decision, or new package is required.
- Future backend planning tasks must depend on this task before adding or expanding API source files.

## 5. In Scope

- Move and rename every current `apps/api/src/**` file according to section 10.1.
- Split only current route installation/controller code and current security middleware/error-handler code where destination ownership requires separation; preserve exported behavior and HTTP contracts.
- Create `modules/auth`, `modules/rbac`, and `modules/audit` from confirmed existing behavior only.
- Move database, Drizzle, Redis, confirmed BullMQ queue infrastructure, logger, JWT, environment, and HTTP security configuration under `config`.
- Move access authentication and permission enforcement plus global security/error middleware under `middleware`.
- Move Argon2 password operations and shared refresh-token fingerprinting into `helpers`.
- Update source imports, tests, Drizzle config, rollback script, documentation references, architecture rules, and applicable project skill references.
- Remove obsolete top-level API directories only after all consumers move.
- Add implementation-time architecture gate rules to `AGENTS.md`, `docs/ARCHITECTURE.md`, and applicable backend/planning/architecture skill references.

## 6. Out of Scope

- Any API path, method, request, response, status-code, error-envelope, JWT-claim, authentication, authorization, audit, Redis, logger, environment, or shutdown behavior change.
- New HTTP endpoints, including RBAC or audit endpoints.
- Database schema, Drizzle semantic, migration, journal, snapshot, data, or retention-policy change.
- New BullMQ, queue-monitor, OpenAPI, health/readiness, or future feature implementation. Approved relocation of their existing files remains in scope.
- New dependencies, aliases, generic base classes, generic repositories/services/controllers, compatibility re-export files, or empty module templates.
- Moving application files during this planning task.

## 7. Existing Implementation

- Original migration inventory: 37 pre-refactor source files listed in section 10.1. Actual reconciled final tree is 42 TypeScript files, including predecessor additions and `modules/auth/auth.module.ts`; it is preserved in `references/current-source-tree.md`.
- API tests: `apps/api/tests/app.test.ts`, `audit-trail.test.ts`, `bullmq-foundation.test.ts`, `database.test.ts`, `env.test.ts`, `health-readiness.test.ts`, `identity-schema.test.ts`, `jwt.test.ts`, `logging.test.ts`, `login-session.test.ts`, `logout-revocation.test.ts`, `openapi.test.ts`, `password.test.ts`, `queue-monitor.test.ts`, `rbac-permissions.test.ts`, `redis.test.ts`, `refresh-token.test.ts`, and `security.test.ts`.
- Bootstrap/config: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/drizzle.config.ts`, and `apps/api/scripts/db-rollback.ts`.
- No TypeScript path aliases exist: `apps/api/tsconfig.json` has no `baseUrl` or `paths`; preserve relative ESM `.js` import convention.
- `apps/api/package.json` exposes `lint`, `format:check`, `typecheck`, `test`, `db:generate`, `db:migrate`, and `db:rollback`; root package scripts delegate API checks.
- No task registry/index exists. Task graph is represented by per-task metadata; this task updates `be/20` Blocks metadata only. Existing user changes outside this task are not modified.

## 8. Implementation Requirements

### 8.1 Filesystem and ownership

- Root after refactor contains only `app.ts`, `server.ts`, `shutdown.ts`, and approved ownership directories: `modules`, `config`, `middleware`, `common`, and `helpers`.
- `common` is reserved for a real multi-consumer non-domain primitive. Current source has no qualifying item. Do not create a tracked empty `common/` directory, `.gitkeep`, or placeholder; create it only when a future approved task has a concrete shared primitive. This preserves a bounded `common` boundary without a dumping ground.
- `modules/auth` owns current login, refresh, logout, session, and access-auth domain service/repository/controller/router behavior.
- `modules/rbac` owns current permission resolution service/repository behavior. It has no router or controller because no RBAC HTTP endpoint exists.
- `modules/audit` owns generic audit service/repository behavior. It has no router or controller because no audit HTTP endpoint exists.
- `middleware` owns only Express `RequestHandler` behavior: authentication, permission enforcement, global HTTP security, and centralized error handling.
- `config` owns environment validation plus database/Drizzle, Redis, logger, JWT/key initialization, and HTTP-security policy constants/options.
- `helpers` owns stateless Argon2 password operations and deterministic SHA-256 refresh-token fingerprinting. Helpers must not import modules, controllers, routers, or Express.

### 8.2 Module shape and request flow

- `modules/auth/auth.module.ts` owns plain TypeScript composition of auth repositories, services, and one auth router. It exposes only the router to application composition.
- `modules/auth/auth.router.ts` is one `express.Router()` boundary mounted at `/auth`; it exposes unchanged `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, and `POST /auth/logout-all` handlers using the existing route order and middleware behavior.
- `modules/auth/controllers/login.controller.ts`, `refresh.controller.ts`, and `logout.controller.ts` contain current HTTP parsing, Zod validation, request-ID fallback, status mapping, JSON output, and `next(error)` delegation. Do not add a generic controller abstraction.
- Auth services remain separate: `login.service.ts`, `refresh-token.service.ts`, `logout.service.ts`, and `access-auth.service.ts`. Do not merge them into a giant `auth.service.ts`.
- Auth repositories remain separate where current transaction/query responsibilities differ: `login.repository.ts`, `refresh-token.repository.ts`, `logout.repository.ts`, and `access-auth.repository.ts`.
- `middleware/authentication.middleware.ts` owns bearer-header parsing, authentication response-local storage, and `getAccessPrincipal` validation. It calls the focused auth service only.
- `middleware/permission.middleware.ts` calls RBAC permission service and auth middleware output; it does not contain permission lookup queries.
- `middleware/security.middleware.ts` owns current Helmet, CORS, rate-limit, JSON-body, request-ID, and access-log installation. `middleware/error.middleware.ts` owns current safe 400/413/500 response handling.
- Runtime request flow remains `middleware → router → controller → service/use case → repository → database`. Filesystem ownership does not replace execution layering.

### 8.3 Dependency direction and cycle safeguards

- Router may import its module controllers and middleware. Controller may import module service types/errors and module validation. Service/use case may import module repository types plus `config`, `common`, and `helpers`. Repository may import Drizzle schema/client types from `config/drizzle` and nothing from router/controller/middleware.
- Modules may consume `config`, `common`, and `helpers`; `config` must not import a business module.
- Middleware may import focused module service types and `config`/`common`/`helpers` only when required for cross-cutting enforcement.
- Helpers must not import Express or business modules. `common` must not import modules. Database infrastructure must not import route, controller, service, or middleware code.
- `app.ts` is HTTP composition only. `server.ts` is process/runtime bootstrap only. `shutdown.ts` stays lifecycle cleanup only.
- Use direct leaf imports; do not introduce barrels. Before removal, run static cycle inspection through existing lint/typecheck and repository-wide import search. If a cycle appears, move only shared non-domain type/utility to `common`; do not invert direction or create a compatibility file.

### 8.4 OpenAPI and operational HTTP ownership

- Module-specific API documentation stays with its owning module. `modules/auth/auth.openapi.ts` and `modules/health/health.openapi.ts` define only their module contributions.
- `config/openapi/openapi.ts` owns global contribution aggregation, document generation, Swagger UI, reusable global components, security schemes, and document validation.
- Health/readiness remains a module because it owns routes and independent operational behavior. The bull-board monitor remains `config/queue` because it configures third-party operational infrastructure rather than a business/use-case module.
- This distinction applies only to current documented ownership. It does not create a broader taxonomy or empty module templates.

### 8.5 Behavior freeze

Preserve API paths, methods, payloads, responses, status codes, safe error contract, JWT claims, login/refresh/logout/session semantics, RBAC behavior, audit behavior, Redis behavior, logger behavior, security middleware behavior, environment contract, database schema, and migration history exactly. This includes `GET /health`, `GET /ready`, `GET /docs`, `GET /openapi.json`, and `/ops/queues/*`; the monitor retains Basic Auth, read-only mode, operational-only audience, and public OpenAPI exclusion. File moves and internal symbol relocation are permitted only when tests prove equivalent behavior.

## 9. Applicable Contracts

### 9.1 Configuration Contract

No configuration semantic change. Existing environment variables, validation, defaults, secret treatment, database/Redis/JWT/logger/security initialization, and startup failure behavior remain unchanged. Moving configuration files does not add, remove, rename, or reinterpret variables.

### 9.2 API Contract

No API contract change. Preserve existing `/auth/login`, `/auth/refresh`, `/auth/logout`, and `/auth/logout-all` behavior plus `GET /health`, `GET /ready`, `GET /docs`, `GET /openapi.json`, `/ops/queues/*`, and current fallback/security/error middleware behavior. Do not add RBAC or audit endpoints.

### 9.3 Database Contract

**No database schema contract change.**

**Database migration: NOT REQUIRED.**

Move Drizzle schema, client, config, and rollback support paths without changing table definitions, constraints, indexes, migration journal, generated snapshots, SQL, data, queries, or transaction semantics. Do not generate empty or path-only migrations.

### 9.4 UI Contract

Not applicable — no CMS/UI change.

## 10. File Impact

### Expected Create

- `apps/api/src/modules/auth/auth.router.ts`
- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/src/modules/auth/controllers/login.controller.ts`
- `apps/api/src/modules/auth/controllers/refresh.controller.ts`
- `apps/api/src/modules/auth/controllers/logout.controller.ts`
- `apps/api/src/config/security/http-security.config.ts`
- `apps/api/src/config/openapi/openapi.ts`
- `apps/api/src/config/queue/queue-monitor.ts`
- `apps/api/src/modules/auth/auth.openapi.ts`
- `apps/api/src/modules/health/health.router.ts`
- `apps/api/src/modules/health/health.openapi.ts`
- `apps/api/src/middleware/security.middleware.ts`
- `apps/api/src/middleware/error.middleware.ts`
- `apps/api/src/helpers/token-fingerprint.helper.ts`
- `tasks/be/21-api-module-architecture-refactor/technical.md`
- `tasks/be/21-api-module-architecture-refactor/explanation.md`
- `tasks/be/21-api-module-architecture-refactor/references/current-source-tree.md`
- `tasks/be/21-api-module-architecture-refactor/references/target-source-tree.md`
- `tasks/be/21-api-module-architecture-refactor/references/module-ownership.md`

### Expected Modify

- Every moved/split file in section 10.1.
- `apps/api/src/app.ts`, `apps/api/src/server.ts`, and `apps/api/src/shutdown.ts` imports only as required by moved files.
- `apps/api/tests/**` imports and any direct mock/module references listed in section 12.
- `apps/api/drizzle.config.ts` and `apps/api/scripts/db-rollback.ts` import paths only.
- `AGENTS.md`, `docs/ARCHITECTURE.md`, and applicable `.codex/skills/**` references, as specified in section 15.1.
- Existing task metadata for any future backend source task created after this task; no existing numbered successor exists now.

### Expected Not Modified

- `apps/api/drizzle/**`, migration SQL, Drizzle journal, snapshots, schema semantics, package dependencies, environment example values, secrets, Docker configuration, CMS source, and unrelated task directories.
- API behavior and test assertions except import/mock path updates needed to preserve them.

Expected paths are guidance for non-source documentation changes; implementation must inspect repository before finalizing edits.

### 10.1 Mandatory File Migration Matrix

Every original pre-refactor source file under `apps/api/src/**` is represented exactly once. The reconciled final tree also contains predecessor additions and the explicit `auth.module.ts` composition boundary.

| Current Path | Target Path | Responsibility | Action | Notes |
| --- | --- | --- | --- | --- |
| `apps/api/src/app.ts` | `apps/api/src/app.ts` | HTTP composition root | KEEP | Mount module router and global middleware; no business logic. |
| `apps/api/src/server.ts` | `apps/api/src/server.ts` | Process bootstrap | KEEP | Update imports/composition only; preserve initialization, listen, and signal wiring. |
| `apps/api/src/shutdown.ts` | `apps/api/src/shutdown.ts` | Graceful shutdown | KEEP | Update imported resource types only if required; preserve close order and errors. |
| `apps/api/src/config/env.ts` | `apps/api/src/config/env.ts` | Environment validation | KEEP | Already valid config ownership. |
| `apps/api/src/openapi/index.ts` | `apps/api/src/config/openapi/openapi.ts` | Global OpenAPI/Swagger infrastructure and contribution aggregation | RENAME | Preserve `/docs`, `/openapi.json`, OpenAPI 3.0.3, security scheme, server `/`, and `/ops/queues` exclusion. |
| `apps/api/src/database/client.ts` | `apps/api/src/config/database/client.ts` | PostgreSQL lifecycle client | RENAME | Infrastructure client; no query behavior change. |
| `apps/api/src/database/config.ts` | `apps/api/src/config/database/config.ts` | Database configuration parsing | RENAME | Preserve config schema and values. |
| `apps/api/src/database/rollback.ts` | `apps/api/src/config/drizzle/rollback.ts` | Drizzle rollback support | RENAME | Update rollback script import only. |
| `apps/api/src/database/schema.ts` | `apps/api/src/config/drizzle/schema.ts` | Drizzle schema declaration | RENAME | Update Drizzle config/imports only; no schema semantic change. |
| `apps/api/src/redis/client.ts` | `apps/api/src/config/redis/client.ts` | Redis lifecycle client | RENAME | Preserve initialization and close behavior. |
| `apps/api/src/redis/config.ts` | `apps/api/src/config/redis/config.ts` | Redis configuration parsing | RENAME | Preserve config schema and values. |
| `apps/api/src/queue/index.ts` | `apps/api/src/config/queue/queue.ts` | BullMQ queue lifecycle infrastructure | RENAME | Preserve current queue defaults, initialization, worker lifecycle, error logging, and close behavior; do not add queue features. |
| `apps/api/src/queue/monitor.ts` | `apps/api/src/config/queue/queue-monitor.ts` | Read-only bull-board operational monitor | RENAME | Preserve `/ops/queues`, Basic Auth, read-only mode, credential handling, and queue registration. |
| `apps/api/src/logging/index.ts` | `apps/api/src/config/logger/logger.ts` | Logging initialization and lifecycle | RENAME | Preserve Morgan/Pino behavior, redaction, rotation, and exported contract. |
| `apps/api/src/jwt/index.ts` | `apps/api/src/config/jwt/jwt.ts` | JWT/key initialization and typed issue/verify service | RENAME | Keep JWT configuration and key loading in config; preserve claims and RS256 behavior. |
| `apps/api/src/password/index.ts` | `apps/api/src/helpers/password.helper.ts` | Stateless Argon2id policy/hash/verify helper | RENAME | Preserve password behavior; no module ownership. |
| `apps/api/src/health/index.ts` | `apps/api/src/modules/health/health.router.ts` | Health/readiness routes and readiness probe orchestration | RENAME | Preserve `/health`, `/ready`, 2-second probes, response bodies, logging, and public exposure exactly. |
| `apps/api/src/health/openapi.ts` | `apps/api/src/modules/health/health.openapi.ts` | Module-owned OpenAPI contribution for health/readiness | RENAME | Preserve exact documented paths/schemas/status codes; update only import paths. |
| `apps/api/src/security/index.ts` | `apps/api/src/config/security/http-security.config.ts`; `apps/api/src/middleware/security.middleware.ts`; `apps/api/src/middleware/error.middleware.ts` | HTTP security policy, global middleware, safe errors | SPLIT | Move constants/options to config; move Express installation and error handler to focused middleware files. |
| `apps/api/src/auth/access-auth-middleware.ts` | `apps/api/src/middleware/authentication.middleware.ts` | Cross-cutting bearer authentication | RENAME | Preserve `createAccessAuthMiddleware` and `getAccessPrincipal` semantics. |
| `apps/api/src/auth/permission-middleware.ts` | `apps/api/src/middleware/permission.middleware.ts` | Cross-cutting permission enforcement | RENAME | Preserve explicit permission enforcement and `403` behavior. |
| `apps/api/src/auth/access-auth-service.ts` | `apps/api/src/modules/auth/services/access-auth.service.ts` | Access-token authentication use case | RENAME | Update JWT/config import only. |
| `apps/api/src/auth/access-auth-repository.ts` | `apps/api/src/modules/auth/repositories/access-auth.repository.ts` | Session/user/JTI authentication lookup | RENAME | Update Drizzle schema import only. |
| `apps/api/src/auth/login-service.ts` | `apps/api/src/modules/auth/services/login.service.ts`; `apps/api/src/helpers/token-fingerprint.helper.ts` | Login use case and refresh-token hashing | SPLIT | Move reusable deterministic SHA-256 fingerprint function to helper; preserve login service behavior. |
| `apps/api/src/auth/login-repository.ts` | `apps/api/src/modules/auth/repositories/login.repository.ts` | Login user/session/audit persistence | RENAME | Preserve transaction and audit writes. |
| `apps/api/src/auth/login-route.ts` | `apps/api/src/modules/auth/auth.router.ts`; `apps/api/src/modules/auth/controllers/login.controller.ts` | Login route mount and controller | SPLIT | Router owns route registration; controller retains Zod, request ID, status, and response behavior. |
| `apps/api/src/auth/refresh-service.ts` | `apps/api/src/modules/auth/services/refresh-token.service.ts`; `apps/api/src/helpers/token-fingerprint.helper.ts` | Refresh rotation use case and token hashing | SPLIT | Reuse one helper; preserve rotation/replay semantics and error mapping. |
| `apps/api/src/auth/refresh-repository.ts` | `apps/api/src/modules/auth/repositories/refresh-token.repository.ts` | Refresh rotation persistence | RENAME | Preserve locks, transactions, audits, and revocation behavior. |
| `apps/api/src/auth/refresh-route.ts` | `apps/api/src/modules/auth/auth.router.ts`; `apps/api/src/modules/auth/controllers/refresh.controller.ts` | Refresh route mount and controller | SPLIT | Router owns route registration; controller retains validation and response behavior. |
| `apps/api/src/auth/logout-service.ts` | `apps/api/src/modules/auth/services/logout.service.ts` | Current/all-session logout use case | RENAME | Preserve current-vs-all-session semantics. |
| `apps/api/src/auth/logout-repository.ts` | `apps/api/src/modules/auth/repositories/logout.repository.ts` | Logout/revocation persistence | RENAME | Preserve token/session revocation and audit writes. |
| `apps/api/src/auth/logout-route.ts` | `apps/api/src/modules/auth/auth.router.ts`; `apps/api/src/modules/auth/controllers/logout.controller.ts` | Logout route mounts and controllers | SPLIT | Router owns registrations; controller retains auth/permission composition and existing status/error behavior. |
| `apps/api/src/auth/openapi.ts` | `apps/api/src/modules/auth/auth.openapi.ts` | Module-owned OpenAPI contribution for authentication | RENAME | Preserve exact documented auth paths/schemas/status codes; global aggregation imports this module contribution. |
| `apps/api/src/auth/permission-service.ts` | `apps/api/src/modules/rbac/services/permission.service.ts` | Permission resolution use case | RENAME | RBAC ownership; preserve denies and audit behavior. |
| `apps/api/src/auth/permission-repository.ts` | `apps/api/src/modules/rbac/repositories/permission.repository.ts` | User-role-permission lookup | RENAME | Preserve query and permission result behavior. |
| `apps/api/src/audit/audit-service.ts` | `apps/api/src/modules/audit/services/audit.service.ts` | Generic audit validation/recording/cleanup | RENAME | Preserve input validation, required/informational semantics, and safe metadata rules. |
| `apps/api/src/audit/audit-repository.ts` | `apps/api/src/modules/audit/repositories/audit.repository.ts` | Generic audit persistence | RENAME | Preserve append/cleanup behavior and schema import. |

Migration action totals for the original inventory: KEEP 4; MOVE 0; RENAME 27; SPLIT 6; MERGE 0; DELETE AFTER MOVE 0. All 37 original source files are represented exactly once. The reconciled final tree has 42 TypeScript files, including predecessor additions and `modules/auth/auth.module.ts`. Old directories are removed only as a result of moved/split files; no standalone compatibility files remain.

## 11. Runtime Behavior

1. `server.ts` validates environment, initializes logging/database/Redis/JWT and confirmed queue infrastructure, creates the Auth module through its factory, creates app with named module/infrastructure dependencies, listens, and wires graceful shutdown exactly as before.
2. `app.ts` creates Express, installs request logging, global HTTP security middleware, access logging, mounts health/readiness routes, global OpenAPI `/docs` and `/openapi.json`, the auth router, and the protected read-only `/ops/queues` monitor in the existing order, then installs fallback 404 and centralized error middleware.
3. Health requests flow through `modules/health/health.router.ts`; `/health` remains public liveness and `/ready` remains public readiness with unchanged two-second dependency probes, statuses, bodies, and logging.
4. Global OpenAPI infrastructure aggregates module-owned auth and health contributions, preserves `/docs`, `/openapi.json`, reusable components, security schemes, and excludes `/ops/queues` from public OpenAPI.
5. Auth requests flow through relevant global middleware, module router, focused controller, service, repository, and Drizzle client with unchanged payload/status/error semantics. Protected routes use `middleware/authentication.middleware.ts` and `middleware/permission.middleware.ts`, which delegate to auth/RBAC services without moving business lookup logic into middleware.
6. Audit service calls remain module service → module repository → Drizzle schema/client. Queue monitor configuration remains infrastructure-owned, retains Basic Auth and read-only mode, and does not become a business module.
7. Startup, request, and shutdown failures retain current sanitized logging/error behavior; import path changes alone must not alter runtime order.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Moved import resolves wrong symbol or stale path | Typecheck/test fails before old directory removal. | Fix direct import; do not add compatibility re-export. |
| Route/controller split changes validation or error mapping | Existing auth tests fail; restore exact handler behavior. | Preserve generic auth failures and safe messages. |
| Shared token-fingerprint extraction changes bytes/algorithm | Login/refresh tests fail; helper must use existing SHA-256 hex algorithm exactly. | Never persist/log raw refresh token. |
| Middleware move introduces cycle | Static import inspection/typecheck fails. | Restore allowed direction; move only actual shared primitive if needed. |
| Drizzle or queue path changes | Drizzle config/rollback/schema tests or bootstrap typecheck fail. | Update paths only; do not generate migration or queue feature. |
| Old directory remains imported | Repository-wide legacy-path search for `auth`, `audit`, `database`, `health`, `jwt`, `logging`, `openapi`, `password`, `queue`, `redis`, or `security` returns a runtime/test import match. | Update import/reference or remove stale compatibility code before completion. |
| Unrelated user changes present | Leave untouched and exclude from this task diff review. | Never reset, overwrite, or fold them into this task. |

## 13. Security Requirements

- Preserve Zod boundary validation, generic public auth failures, current safe error envelopes, Helmet/CORS/rate limit/body limit/request ID, logger redaction, JWT RS256 claim validation, Argon2id password handling, session/revocation checks, RBAC deny-by-default, and audit metadata restrictions.
- No plaintext password, JWT, refresh token, authorization header, cookie, private key, environment secret, or database credential enters new logs, tests, docs, or compatibility code.
- Preserve authentication-vs-authorization status distinction: invalid authentication remains `401`; denied permission remains `403`.
- Do not change middleware order or introduce module imports into configuration/infrastructure.
- Preserve `/ops/queues` Basic Auth, read-only mode, operational-only audience, and public OpenAPI exclusion.

## 14. Test Requirements

### Happy Path

- Existing login, refresh, logout, RBAC, audit, database, Redis, JWT, logging, security, and app tests retain current assertions after import updates.

### Validation

- Existing request/body validation, environment validation, JWT validation, password policy, security body-limit, and audit metadata tests remain unchanged in meaning.

### Negative / Failure

- Existing invalid login/refresh/logout/authentication/permission, startup/configuration, database/Redis, logger, safe-error, and shutdown failure tests remain intact.

### Security

- Existing generic authentication failures, permission denials, token handling, redaction, safe errors, and audit sensitive-metadata rejection assertions continue to pass.

### Regression

- `apps/api/tests/app.test.ts`: logger import changes.
- `apps/api/tests/audit-trail.test.ts`: audit service import changes.
- `apps/api/tests/bullmq-foundation.test.ts`: queue infrastructure and Redis config imports change; preserve queue lifecycle, shutdown-order, default, isolation, and redaction assertions.
- `apps/api/tests/database.test.ts`: database client/config imports change.
- `apps/api/tests/identity-schema.test.ts`: Drizzle schema/rollback imports change.
- `apps/api/tests/jwt.test.ts`: JWT import changes.
- `apps/api/tests/logging.test.ts`: logger import changes.
- `apps/api/tests/queue-monitor.test.ts`: queue monitor, queue foundation, and logger import changes; preserve Basic Auth, read-only, queue registration, and OpenAPI-exclusion assertions.
- `apps/api/tests/openapi.test.ts`: global OpenAPI infrastructure import changes; preserve `/docs`, `/openapi.json`, document, security-scheme, and contribution assertions.
- `apps/api/tests/health-readiness.test.ts`: health router and global OpenAPI infrastructure import changes; preserve `/health`, `/ready`, timeout, safe logging, rate-limit exemption, and OpenAPI assertions.
- `apps/api/tests/login-session.test.ts`: JWT/logger/password imports and auth route composition imports change.
- `apps/api/tests/logout-revocation.test.ts`: auth service and authentication-middleware imports change.
- `apps/api/tests/password.test.ts`: password helper import changes.
- `apps/api/tests/rbac-permissions.test.ts`: authentication/permission middleware, access-auth service, RBAC service, JWT/logger/error middleware imports change.
- `apps/api/tests/redis.test.ts`: Redis client/config imports change.
- `apps/api/tests/refresh-token.test.ts`: JWT/logger and auth route composition imports change.
- `apps/api/tests/security.test.ts`: logger/security/error middleware imports change.
- `apps/api/tests/env.test.ts`: no import-path edit expected because `config/env.ts` remains in place; run unchanged as configuration regression evidence.

### Isolation

- Preserve current test-created temporary log directories, in-memory repositories, generated UUIDs/keys, and explicit resource closure. Do not weaken tests or add order dependence due to module paths.
- Inspection found no `jest.mock`, `jest.unstable_mockModule`, or equivalent module mock targeting current source paths; verify this remains true after refactor.

## 15. Task-Level Expected Results

- Current source root has no unexplained legacy top-level feature/infrastructure directory.
- Auth, RBAC, and audit each have deterministic ownership and no invented endpoint/module.
- Middleware, configuration, helpers, and reserved common boundary have bounded responsibilities.
- Every previous source import, test import, Drizzle config import, and rollback-script import is updated for new paths.
- Obsolete path imports are absent before old directories are removed.
- `AGENTS.md`, architecture documentation, and relevant project skills make future backend filesystem ownership explicit.

### 15.1 Required Rule, Architecture, and Skill Updates

- Add this mandatory `AGENTS.md` section during implementation, without changing its existing higher-authority rules:

  ```md
  ## Backend Module Organization

  Backend uses module-first organization.

  Business/domain capabilities live under `apps/api/src/modules/<module>/`.

  A module owns its controller, router, service/use case, repository, validation, schema, types, and module-specific helpers.

  Cross-cutting Express middleware lives under `apps/api/src/middleware/`.

  Infrastructure/configuration lives under `apps/api/src/config/`.

  Reusable non-domain primitives live under `apps/api/src/common/`.

  Small stateless technical helpers live under `apps/api/src/helpers/`.

  Do not create new top-level feature/infrastructure directories under `apps/api/src`.

  Do not organize business behavior into global technical-layer folders.

  Request flow remains `middleware → router → controller → service/use case → repository → database`.

  Module ownership and filesystem organization are mandatory architecture rules.
  ```

- Update `docs/ARCHITECTURE.md` with concise module-first directory responsibilities, auth/RBAC/audit ownership, unchanged layered request flow, allowed dependency direction, forbidden reverse dependencies, and infrastructure separation. Do not repeat `AGENTS.md` verbatim.
- Update `.codex/skills/planning/document-planning/references/document-planning.md` so every future backend plan explicitly answers: (1) owning module, (2) existing files changing, (3) whether new module files are required, (4) module/config/middleware/common/helper classification, and (5) whether it creates a forbidden new `apps/api/src` root directory.
- Update `.codex/skills/engineering/architecture/references/architecture.md` and `.codex/skills/engineering/backend-patterns/references/backend-patterns.md` to replace their stale flat/current-source guidance with this approved module-first structure and import direction.
- Update `.codex/skills/quality/code-review/references/code-review.md` only where its current API source baseline names obsolete paths; preserve its review workflow.
- Do not update unrelated skills. `AGENTS.md` remains authoritative over every skill.

## 16. Acceptance Criteria

- [x] `be/20-backend-quality-gate` passes before implementation begins.
- [x] Final `apps/api/src` tree matches `references/target-source-tree.md`, with no tracked empty `common/` placeholder.
- [x] All current business behavior is under `modules`: auth under `modules/auth`, RBAC under `modules/rbac`, and generic audit under `modules/audit`.
- [x] Cross-cutting Express middleware exists only under `middleware`; module services/repositories do not move into middleware.
- [x] Environment, database/Drizzle, Redis, confirmed BullMQ queue infrastructure, logger, JWT/key, and HTTP security configuration exist under `config`.
- [x] `helpers` contains only password and deterministic token-fingerprint technical helpers; `common` remains bounded and is not a dumping ground.
- [x] Every row in section 10.1 is completed and no old `src/auth`, `src/audit`, `src/database`, `src/jwt`, `src/logging`, `src/password`, `src/redis`, or `src/security` directory remains without a documented exception.
- [x] `src/health/` no longer exists; capability lives in `modules/health`.
- [x] `src/openapi/` no longer exists; global infrastructure lives in `config/openapi`.
- [x] `src/queue/monitor.ts` moves to `config/queue/queue-monitor.ts`.
- [x] `/health`, `/ready`, `/docs`, `/openapi.json`, and `/ops/queues` behavior remains unchanged.
- [x] `/ops/queues` retains Basic Auth, read-only policy, operational-only audience, and public OpenAPI exclusion.
- [x] Health-specific OpenAPI contribution remains module-owned; global OpenAPI aggregation remains infrastructure-owned.
- [x] API paths/methods/payloads/responses/status codes/error contract, auth/session/RBAC/audit/Redis/logger/security/environment behavior remain unchanged.
- [x] No database schema change, migration, generated migration artifact, or Drizzle semantic change occurs.
- [x] Tests pass without deletion/weakened assertions; lint and typecheck pass.
- [x] Code Anti-Slop passes.
- [x] Repository-wide obsolete import/path search has no runtime or test import result.
- [x] `AGENTS.md`, `docs/ARCHITECTURE.md`, and applicable skills document module-first ownership; future backend task plans answer module/files/new-file/concern/root-directory questions.
- [x] Final source tree, `git diff --check`, `git status`, and full diff are reviewed.

### 16.1 Reconciliation Status — 2026-09-23

| Area | Contract | Actual State | Status | Remaining Work |
| --- | --- | --- | --- | --- |
| be/20 prerequisite | be/20 passes first | be/20 is COMPLETE with recorded quality-gate evidence | PASS | None. |
| Filesystem/module relocation | Target tree and no legacy directories | 42-file final tree matches updated target; no tracked `common/` placeholder | PASS | None. |
| Auth ownership | Auth module owns auth internals and router | `modules/auth` owns controllers, services, repositories, OpenAPI, router, and `auth.module.ts` | PASS | None. |
| RBAC/audit/health ownership | Modules own confirmed business/operational behavior | RBAC, audit, and health live under `modules/` | PASS | None. |
| Config/middleware/helpers | Infrastructure, middleware, and helpers stay bounded | `config/`, `middleware/`, and `helpers/` contain approved ownership only | PASS | None. |
| App composition | No positional feature dependency soup | `createApp` receives named `{ logging, security, auth, health, queueMonitor }` dependencies | PASS | None. |
| Server composition | Server does not build auth internals | `server.ts` calls `createAuthModule({ db, jwt })` only | PASS | None. |
| Auth router boundary | One module-relative router mounted at `/auth` | `auth.router.ts` uses `express.Router()` with `/login`, `/refresh`, `/logout`, and `/logout-all` | PASS | None. |
| API/operational behavior | Preserve existing routes and policies | Focused regression tests pass for auth, health, OpenAPI, security, and queue monitor | PASS | None. |
| OpenAPI ownership | Module contributions; global aggregator | Existing module contributions and `config/openapi` remain unchanged | PASS | None. |
| Database/migrations | No schema or migration change | No Drizzle/migration diff | PASS | None. |
| Rules/docs/skills | Module-first guidance exists | `AGENTS.md`, architecture docs, and applicable skills already contain required guidance | PASS | None. |
| Legacy imports | No obsolete top-level runtime/test imports | Legacy directories absent; scoped active-import search returns no matches | PASS | None. |
| Tests/static | Focused/full tests, lint, typecheck, format | All commands pass | PASS | None. |
| Code Anti-Slop | Required diff audit | Core project skill reviewed; zero blocking findings | PASS | None. |
| Scope/review | Diff, status, and secret review | `git diff --check` passes; no committed secrets or generated output found | PASS | None. |

## 17. Anti-Slop Requirements

Code Anti-Slop: required during implementation.

- Reject duplicate old/new implementations, dead compatibility files, speculative base classes, `BaseRepository`/`BaseService` abstractions without concrete need, global controllers/services/repositories directories, empty module templates, unnecessary barrel files, common dumping ground, helpers with business logic, unrelated refactors, behavior changes hidden in cleanup, stale imports, and hidden `TODO`/`FIXME`/`HACK`.
- Verify extracted `token-fingerprint.helper.ts` replaces real duplicated SHA-256 behavior and does not duplicate business behavior.
- UI Anti-Slop: NOT APPLICABLE — no UI source change.
- Visual Verification: NOT APPLICABLE — no rendered UI change.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `bun run --cwd apps/api format:check`
- `git diff --check`
- `git status --short`
- `git diff --check` and full `git diff` review, including secret exposure review.

### Automated Tests

- Focused affected Jest tests discovered in section 14, then `bun run --cwd apps/api test`.

### Build

Not applicable — `apps/api/package.json` has no build script; TypeScript typecheck is required.

### Database

- Do not run `db:generate` or create a migration.
- Run existing schema/rollback tests and inspect `apps/api/drizzle.config.ts` plus `apps/api/scripts/db-rollback.ts` import updates.

### UI

Not applicable — no UI change.

### Anti-Slop

- Run the project-local Code Anti-Slop skill audit during implementation. No fixed repository CLI is required; report loaded skill, audited diff, findings, fixes, and final blocking-findings count. If the skill is unavailable, report `NOT RUN — <reason>` and do not call task complete without human resolution.

### Legacy Path Search

Run after obsolete directories are removed:

```sh
rg -n "src/(auth|audit|database|health|jwt|logging|openapi|password|queue|redis|security)/|\./(auth|audit|database|health|jwt|logging|openapi|password|queue|redis|security)/|\.\./(auth|audit|database|health|jwt|logging|openapi|password|queue|redis|security)/" apps/api --glob '!drizzle/**'
```

Expected result: no runtime/test import match. Documentation/history matches require deliberate review and update only where current architecture references must change.

## 19. Completion Evidence

| Acceptance Criterion | Evidence |
| --- | --- |
| Source ownership/tree | Final `find apps/api/src -type f | sort` compared to `references/target-source-tree.md`; section 10.1 checklist review. |
| API behavior freeze | Focused auth/security/RBAC/audit tests plus `bun run --cwd apps/api test`. |
| No DB/migration change | `git diff -- apps/api/drizzle apps/api/drizzle.config.ts`; existing schema/rollback tests; no generated migration files. |
| Imports and scripts | `rg` legacy-path search; review `apps/api/drizzle.config.ts` and `apps/api/scripts/db-rollback.ts`. |
| Static correctness | `bun run --cwd apps/api lint`, `typecheck`, and `format:check`. |
| Code Anti-Slop | Actual tool output, or exact required `NOT RUN` blocker. |
| Scope hygiene | `git diff --check`, `git status --short`, full `git diff`, source-tree inspection, and secret review. |
| Architecture rules | Changed `AGENTS.md`, `docs/ARCHITECTURE.md`, relevant skills, and future task-plan checklist review. |

### 19.1 Execution Evidence — 2026-09-23

- Dependency: be/20 completion evidence verified before validation.
- Focused composition/regression tests: 8 suites, 47 tests passed with `--detectOpenHandles`.
- Full API suite: 18 suites passed, 2 integration suites skipped, 124 tests passed, 6 skipped with `--detectOpenHandles`; skipped live integration evidence remains valid from be/19 because `apps/api/**` had no later source diff.
- Static checks: `lint`, `typecheck`, and `format:check` passed.
- Architecture checks: `server.ts` has no direct auth repository/service factory imports; `app.ts` has no individual auth route installers; auth router uses module-relative paths.
- Legacy checks: old top-level source directories are absent; scoped runtime/test legacy import search returned no matches.
- Scope checks: final source tree has 42 TypeScript files; no Drizzle/migration change; `git diff --check` passed; changed-file and secret reviews completed.
- Code Anti-Slop: project-local core skill loaded; audit found zero blocking findings (no duplicate old/new route implementation, DI framework, compatibility shim, dead abstraction, or secret/debug addition).
- Rule checks: `AGENTS.md`, `docs/ARCHITECTURE.md`, `.codex/skills/planning/document-planning/references/document-planning.md`, `.codex/skills/engineering/architecture/references/architecture.md`, and `.codex/skills/engineering/backend-patterns/references/backend-patterns.md` contain module-first ownership guidance.

## 20. Traceability

| Trace Type | References |
| --- | --- |
| PRD | Not applicable — no PRD ID system; product docs contain unresolved requirements. |
| Feature | Backend architecture / `be/21-api-module-architecture-refactor` |
| Requirement | `AGENTS.md`; `docs/ARCHITECTURE.md`; `docs/DEVELOPMENT.md`; `docs/DATABASE.md`; `docs/SECURITY.md`; `docs/API.md` |
| Acceptance Criteria | Section 16 |
| API Operation | Existing `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout/all`; unchanged |
| Database | Existing Drizzle schema and migrations; no change |
| Test IDs | Existing API Jest files listed in section 14 |
| Design/Figma | Not applicable — no UI change |

## 21. Open Points

None.

## 22. Definition Of Done

- [x] `be/20-backend-quality-gate` passes first.
- [x] Every acceptance criterion passes with mapped evidence.
- [x] Scope stays structural; no behavior, API, database, migration, dependency, or unrelated change exists.
- [x] Every section 10.1 source file moves/splits exactly once and final tree is reviewed.
- [x] Tests, lint, typecheck, and format check pass.
- [x] Required Code Anti-Slop executes and passes; unavailable remains an unresolved `NOT RUN` gate.
- [x] No migration is generated; schema/rollback semantics remain unchanged.
- [x] `AGENTS.md`, architecture docs, and applicable skills contain module-first future-planning rule.
- [x] Obsolete-path search returns no runtime/test imports.
- [x] `git diff --check`, changed-file review, `git status`, full diff, and secret review pass.
- [x] No tracked empty common directory, compatibility shim, stale import, or unrelated change remains.
