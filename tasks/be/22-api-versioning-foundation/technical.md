# be/22-api-versioning-foundation — API Versioning Foundation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/22-api-versioning-foundation` |
| Batch | N/A |
| Owning Feature | API versioning foundation |
| Workstream | Backend |
| Task Category | API architecture / transport composition |
| Repository/App | `apps/api` |
| Status | Planned — approved planning contract |
| Priority | Foundation execution order 22 |
| Suggested Size | Medium — route composition and auth module boundary |
| Depends On | `be/21-api-module-architecture-refactor` |
| Blocks | `be/23-versioned-openapi-swagger` |
| Execution Order | 22 |

## 2. Outcome

Create a module-composition boundary that mounts the first business API version at `/api/v1` without duplicating auth services, repositories, database access, or business logic. After completion, auth v1 owns module-relative routes, `app.ts` mounts the v1 auth router at `/api/v1/auth`, `server.ts` composes the auth module instead of each auth dependency, and operational routes remain unversioned.

This task creates only v1. It does not create v2 routes or implement versioned OpenAPI/Swagger.

## 3. Context

- `AGENTS.md` requires module-first ownership, explicit task contracts, transport/business separation, and no unapproved public-contract drift.
- `docs/ARCHITECTURE.md` defines `middleware → router → controller → service/use case → repository → database` and module/config boundaries.
- `tasks/be/21-api-module-architecture-refactor/technical.md` established `modules/auth`, shared auth services/repositories, health ownership, and config ownership.
- Current composition evidence is recorded in `references/current-route-composition.md`.
- Target composition and version rules are recorded in `references/target-route-composition.md` and `references/versioning-rules.md`.
- `be/23-versioned-openapi-swagger` is the successor for full versioned OpenAPI/Swagger behavior.

## 4. Dependencies

- `be/21-api-module-architecture-refactor` must be complete before execution.
- Existing auth services, repositories, JWT, database, Redis, logging, security middleware, and health/queue infrastructure remain available.
- No database, migration, external service, or new runtime infrastructure is required.
- `pino-pretty` logging behavior from current implementation remains unchanged.

## 5. In Scope

- Add explicit auth module composition through `modules/auth/auth.module.ts`.
- Move auth HTTP boundary toward `modules/auth/v1/` with module-relative route definitions.
- Mount auth v1 at exactly `/api/v1/auth` from application composition.
- Change current auth logical routes from `/auth/*` to `/api/v1/auth/*` without duplicate legacy routes.
- Change `app.ts` to receive named module/router dependencies rather than positional auth services.
- Change `server.ts` to compose auth at module granularity.
- Preserve shared auth services and repositories unless inspection proves a concrete incompatibility.
- Keep `/health`, `/ready`, `/docs`, `/openapi/*`, and `/ops/queues` outside `/api/v1`.
- Make the smallest OpenAPI path update required to keep current documentation/tests aligned with actual v1 routes; defer versioned OpenAPI architecture to `be/23`.
- Add/update architecture guidance in `AGENTS.md` and `docs/ARCHITECTURE.md` for module-level composition and transport-boundary versioning.

## 6. Out of Scope

- Any v2 route, router, controller, validation, or OpenAPI contribution.
- Versioned Swagger/OpenAPI document architecture, servers, tags, schemas, or document selection beyond minimal route-path synchronization.
- Service/repository/database version directories created only because HTTP routes are versioned.
- New auth behavior, credentials, claims, permissions, roles, session rules, or authorization policy.
- Backward-compatible duplicate `/auth/*` routes.
- Health/readiness migration under `/api/v1`.
- Queue monitor migration under `/api/v1`.
- Database schema, migration, seed, dependency, or external integration changes.
- DI containers, decorators, reflection, service locators, generic route registries, or framework abstractions.
- Deprecation or retirement of v1; that requires a separate approved task.

## 7. Existing Implementation

Inspect these actual files before editing:

- `apps/api/src/server.ts`: current infrastructure initialization and manual auth repository/service construction.
- `apps/api/src/app.ts`: current positional `createApp` parameters and individual auth route installation.
- `apps/api/src/modules/auth/auth.router.ts`: current route installation functions with hard-coded `/auth/*` paths.
- `apps/api/src/modules/auth/controllers/login.controller.ts`
- `apps/api/src/modules/auth/controllers/refresh.controller.ts`
- `apps/api/src/modules/auth/controllers/logout.controller.ts`
- `apps/api/src/modules/auth/services/access-auth.service.ts`
- `apps/api/src/modules/auth/services/login.service.ts`
- `apps/api/src/modules/auth/services/refresh-token.service.ts`
- `apps/api/src/modules/auth/services/logout.service.ts`
- `apps/api/src/modules/auth/repositories/access-auth.repository.ts`
- `apps/api/src/modules/auth/repositories/login.repository.ts`
- `apps/api/src/modules/auth/repositories/refresh-token.repository.ts`
- `apps/api/src/modules/auth/repositories/logout.repository.ts`
- `apps/api/src/modules/auth/auth.openapi.ts`: current unversioned auth path contribution.
- `apps/api/src/modules/health/health.router.ts`: operational health/readiness routes.
- `apps/api/src/config/openapi/openapi.ts`: global OpenAPI aggregation and operational path exclusion.
- `apps/api/src/config/queue/queue-monitor.ts`: unversioned operational queue monitor.
- `apps/api/tests/app.test.ts`, `login-session.test.ts`, `refresh-token.test.ts`, `logout-revocation.test.ts`, `openapi.test.ts`, `health-readiness.test.ts`, and `queue-monitor.test.ts`.

## 8. Implementation Requirements

### 8.1 Module composition

- Add a small `createAuthModule({ db, jwt })` composition function in `apps/api/src/modules/auth/auth.module.ts`.
- The function creates auth repositories and services, creates the v1 router, and returns a small public interface containing `v1.router`.
- `server.ts` may pass infrastructure dependencies to the module factory, but must not construct auth repositories/services itself after this change.
- `app.ts` receives named dependencies such as `{ logging, security, routers: { authV1, health }, queueMonitor }` or an equally small explicit object.
- `app.ts` knows module routers, not login/refresh/logout services or repositories.
- No positional optional dependency list remains for auth composition.

### 8.2 Router boundary

- Use `express.Router()` for auth v1.
- Router definitions use exactly `/login`, `/refresh`, `/logout`, and `/logout-all`.
- Router must not contain `/api/v1/auth` or another global prefix.
- Existing controllers keep transport validation, status codes, response bodies, and error handling semantics.
- Existing auth services/repositories remain shared under `modules/auth/services/` and `modules/auth/repositories/`.

### 8.3 Mount ownership

- Application composition mounts `auth.v1.router` at exactly `/api/v1/auth`.
- Do not duplicate `/api/v1/auth` across endpoint definitions.
- If constants are useful, use small explicit constants such as `API_V1_PREFIX` and `AUTH_V1_PREFIX`; do not build a route registry.

### 8.4 Operational routes

- Preserve `/health` and `/ready` exactly.
- Preserve `/docs`, `/openapi.json`, and `/openapi/*` exactly.
- Preserve `/ops/queues` and its Basic Auth/read-only behavior exactly.
- Do not mount health or queue monitor under `/api/v1`.

### 8.5 OpenAPI compatibility

- Update auth OpenAPI path keys only as required to represent `/api/v1/auth/*` after the route migration.
- Keep auth OpenAPI contribution owned by auth module.
- Keep global aggregation in `config/openapi`.
- Do not add v2 documentation or version-selection infrastructure; that belongs to `be/23`.

### 8.6 Future v2

Document and preserve this extension shape without implementing it:

```text
modules/auth/
  auth.module.ts
  v1/
    auth.router.ts
    controllers/
    validation/
  v2/
    auth.router.ts
    controllers/
    validation/
  services/
  repositories/
  types/
```

Future composition may mount both `auth.v1.router` and `auth.v2.router`. A v2 route does not imply `services/v2`, `repositories/v2`, or `database/v2`; split business logic only after an approved incompatible business requirement exists.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no new or changed environment variable.

### API Contract

| Method | Current Path | Target Path | Auth / Permission | Request / Response | Status / Error |
| --- | --- | --- | --- | --- | --- |
| POST | `/auth/login` | `/api/v1/auth/login` | Public | Existing login request and token response | Existing `200`, `400`, `401`, `413`, `429`, `500` behavior |
| POST | `/auth/refresh` | `/api/v1/auth/refresh` | Public | Existing refresh request and token response | Existing `200`, `400`, `401`, `413`, `429`, `500` behavior |
| POST | `/auth/logout` | `/api/v1/auth/logout` | Bearer auth; existing revoked-token policy | Existing empty request and response | Existing `204`, `401`, `500` behavior |
| POST | `/auth/logout-all` | `/api/v1/auth/logout-all` | Bearer auth; existing revoked-token policy | Existing empty request and response | Existing `204`, `401`, `500` behavior |
| GET | `/health` | `/health` | Public operational | `{ status: "ok" }` | Existing `200` behavior |
| GET | `/ready` | `/ready` | Public operational | `{ status: "ready" }` or `{ status: "not_ready" }` | Existing `200` / `503` behavior |
| GET | `/docs` | `/docs` | Existing operational policy | Existing Swagger UI | Existing behavior |
| GET | `/openapi.json` | `/openapi.json` | Existing operational policy | Existing OpenAPI document | Existing behavior, with auth paths synchronized to v1 |
| `*` | `/ops/queues/*` | `/ops/queues/*` | Existing Basic Auth | Existing read-only monitor | Existing behavior |

The `/auth/*` to `/api/v1/auth/*` change is intentional public path migration. No legacy duplicate routes are retained because repository inspection found no approved external-consumer compatibility requirement.

### Database Contract

No schema, table, column, index, constraint, migration, or data impact.

### UI Contract

Not applicable — no UI change.

## 10. File Impact

### Expected Create

- `apps/api/src/modules/auth/auth.module.ts` — module composition boundary; classification: module.
- `apps/api/src/modules/auth/v1/auth.router.ts` — v1 module-relative router; classification: module.
- `apps/api/src/modules/auth/v1/controllers/*` and `apps/api/src/modules/auth/v1/validation/*` only when existing controller/validation responsibilities require those exact files; no empty templates.
- Focused route-composition tests only where existing files cannot express the new boundary.

### Expected Modify

- `apps/api/src/app.ts` — named app dependencies and router mounts.
- `apps/api/src/server.ts` — infrastructure root and module-level composition.
- Existing auth controllers/validation files — move or rename into v1 only when they own transport concerns.
- `apps/api/src/modules/auth/auth.openapi.ts` — minimal auth path synchronization.
- `apps/api/src/config/openapi/openapi.ts` only if route aggregation needs a minimal compatibility update.
- `apps/api/tests/app.test.ts`, `login-session.test.ts`, `refresh-token.test.ts`, `logout-revocation.test.ts`, `openapi.test.ts`, `health-readiness.test.ts`, and `queue-monitor.test.ts` — route/path and composition assertions.
- `AGENTS.md` — module composition and transport-boundary versioning guidance.
- `docs/ARCHITECTURE.md` — concise version-prefix ownership and composition guidance.
- Applicable architecture/backend-patterns/review references only if their current guidance is stale; do not update unrelated skills.

### Expected Not Modified

- `apps/api/src/modules/auth/services/*`
- `apps/api/src/modules/auth/repositories/*`
- `apps/api/src/modules/health/health.router.ts`
- `apps/api/src/config/queue/queue-monitor.ts`
- Database schema and migrations.
- Redis, BullMQ, JWT, security, logger, shutdown, and environment behavior.
- No source move may occur without checking actual responsibility and consumer imports first.

Expected paths are guidance; implementer must inspect repository before finalizing file moves or additions.

## 11. Runtime Behavior

1. `server.ts` validates environment and initializes database, Redis, JWT, logger, and BullMQ infrastructure.
2. `server.ts` creates `authModule = createAuthModule({ db, jwt })`; auth module owns auth repositories, services, and v1 router creation.
3. `server.ts` creates health and queue-monitor dependencies without exposing auth internals to `app.ts`.
4. `createApp({ ... })` installs security, access, and logging middleware, then mounts health and OpenAPI operational routes.
5. `createApp` mounts `auth.v1.router` at `/api/v1/auth`.
6. Auth requests resolve module-relative routes and preserve existing validation/service/repository behavior.
7. `/health`, `/ready`, `/docs`, `/openapi.json`, and `/ops/queues` remain outside the business version prefix.
8. The server listens only after all infrastructure and module composition succeeds.
9. Invalid infrastructure or composition setup fails safely with sanitized errors and no partial listener.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Request uses `/api/v1/auth/*` | Existing auth behavior executes | Preserve auth failures and redaction |
| Request uses legacy `/auth/*` | `404` | No unapproved duplicate compatibility route |
| Request uses `/api/v1/health` | `404` | Health remains operational at `/health` |
| Request uses `/api/v1/ops/queues` | `404` | Queue monitor remains unversioned and authenticated |
| Auth module missing required dependency | Startup fails before listen | Sanitized error; no credentials or tokens |
| Auth v1 router imports service internals directly into app | Contract violation | Fix composition boundary before completion |
| Future v2 requires changed business behavior | Separate approved task required | Do not invent version-specific services now |
| Existing OpenAPI test expects `/auth/*` | Update path expectation to `/api/v1/auth/*` | No v2 OpenAPI implementation |

## 13. Security Requirements

- Preserve public login/refresh failure behavior and authenticated logout behavior exactly.
- Preserve `401` versus `403` semantics, JWT claims, session/revocation checks, RBAC middleware, and audit writes.
- Do not expose service/repository dependencies through the public app composition interface.
- Do not log credentials, tokens, authorization headers, cookies, private keys, or database values.
- Preserve security middleware order and queue-monitor Basic Auth/read-only policy.
- Do not treat URL versioning as authorization or permission versioning.

## 14. Test Requirements

### Happy Path

- `POST /api/v1/auth/login` preserves login success response.
- `POST /api/v1/auth/refresh` preserves rotation success response.
- `POST /api/v1/auth/logout` preserves current-session logout.
- `POST /api/v1/auth/logout-all` preserves all-session logout.
- Auth router uses `/login`, `/refresh`, `/logout`, and `/logout-all`, not full global prefixes.
- App mounts auth v1 at exact `/api/v1/auth`.
- `/health`, `/ready`, `/docs`, `/openapi.json`, and `/ops/queues` remain reachable at existing paths.

### Validation

- Existing login, refresh, logout request schemas and status assertions remain intact after path changes.
- OpenAPI auth path assertions reflect `/api/v1/auth/*`; operational paths remain unchanged.

### Negative / Failure

- Legacy `/auth/*` routes return `404`.
- `/api/v1/health` and `/api/v1/ops/queues` are not accidentally mounted.
- Missing auth module dependency fails startup before listen with sanitized output.

### Security

- Auth status/body/error semantics remain unchanged under v1 paths.
- Bearer auth remains required for logout routes.
- Queue monitor remains Basic Auth protected and excluded from public OpenAPI.

### Regression

- Existing auth, health, readiness, OpenAPI, queue-monitor, security, RBAC, audit, Redis, database, and app tests retain their behavior assertions.
- No duplicate legacy auth route exists.

### Isolation

- Router composition tests use isolated app instances and close logging/resources.
- Tests do not rely on execution order or shared mutable module state.
- Full API suite remains deterministic with existing PostgreSQL/Redis/BullMQ opt-in isolation rules.

## 15. Task-Level Expected Results

- Auth module exposes one explicit v1 router boundary.
- Auth route paths are module-relative and globally mounted once at `/api/v1/auth`.
- `server.ts` no longer constructs auth internals individually.
- `app.ts` no longer accepts positional auth services/repositories.
- Shared auth services/repositories remain shared across versions.
- Operational endpoints remain unversioned.
- Legacy auth paths are removed rather than duplicated.
- Existing OpenAPI path documentation is minimally synchronized; full versioned Swagger remains deferred.
- Architecture guidance records transport-boundary versioning and module-granularity composition.

## 16. Acceptance Criteria

- [ ] `be/21-api-module-architecture-refactor` is complete and verified before execution.
- [ ] `createAuthModule({ db, jwt })` exists with plain TypeScript composition only.
- [ ] Auth v1 router uses `express.Router()` and only module-relative paths.
- [ ] `app.ts` mounts auth v1 at exactly `/api/v1/auth` through named router dependencies.
- [ ] `server.ts` composes auth at module granularity and does not manually construct auth internals.
- [ ] No positional optional dependency soup remains in `createApp`.
- [ ] `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, and `/api/v1/auth/logout-all` work with existing semantics.
- [ ] Legacy `/auth/*` routes are absent and return `404`.
- [ ] `/health` and `/ready` remain unchanged; `/api/v1/health` is absent.
- [ ] `/docs`, `/openapi.json`, and `/ops/queues` remain unversioned.
- [ ] `/ops/queues` retains Basic Auth, read-only behavior, and OpenAPI exclusion.
- [ ] No v2 route or v2 OpenAPI implementation exists.
- [ ] Services, repositories, database, JWT, RBAC, audit, and auth security semantics are not version-duplicated or changed.
- [ ] No database schema, migration, or dependency change occurs.
- [ ] Focused route/composition tests and full applicable API tests pass.
- [ ] No circular dependency, DI framework, generic route registry, or hidden compatibility route exists.
- [ ] `AGENTS.md` and architecture guidance state module composition and transport-boundary versioning.

## 17. Anti-Slop Requirements

Code Anti-Slop: required during implementation.

- Reject v2 placeholders, empty validation/controller folders, duplicate auth services/repositories, compatibility shims, generic route registries, DI containers, service locators, decorators, reflection, positional dependency soup, and global feature-layer folders.
- Reject hard-coded `/api/v1/auth` strings inside individual routes.
- Reject version-specific business layers without a concrete incompatible business requirement.
- Check circular imports, unused exports, stale legacy routes, hidden TODO/FIXME/HACK, unjustified assertions/`any`, and unrelated API behavior changes.
- UI Anti-Slop: NOT APPLICABLE — no UI change.
- Visual Verification: NOT APPLICABLE — no rendered UI change.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `bun run --cwd apps/api format:check`
- `git diff --check`
- Legacy route/import search for `/auth/*`, `/api/v1/health`, `/api/v1/ops/queues`, and duplicate auth mounts.

### Automated Tests

- Focused auth route, app composition, health/readiness, OpenAPI path, and queue-monitor tests.
- `bun run --cwd apps/api test`
- Existing opt-in PostgreSQL/Redis/BullMQ isolation tests where applicable.

### Build

Not applicable — `apps/api` has no build script; typecheck is required.

### Database

Not applicable — no schema or migration change. Confirm `apps/api/drizzle` is unchanged.

### UI

Not applicable — no UI change.

### Anti-Slop

- Run project-local Code Anti-Slop during implementation and again before completion.
- Report loaded skill, audit scope, findings, fixes, and final blocking findings.

## 19. Completion Evidence

| Acceptance Area | Required Evidence |
| --- | --- |
| Route map | Focused tests proving all four `/api/v1/auth/*` routes and legacy 404s |
| Composition | Changed `server.ts`/`app.ts` review showing named module routers and no auth internals in app |
| Router boundary | Test or source review proving module-relative router paths |
| Operational routes | Health/readiness, OpenAPI, and queue-monitor tests proving unversioned paths |
| Behavior freeze | Auth regression tests proving status, request, response, error, and auth semantics |
| OpenAPI compatibility | OpenAPI test proving v1 auth paths and unchanged operational paths |
| No v2 | Source-tree and route search showing no v2 implementation |
| Static correctness | Lint, typecheck, format check, `git diff --check` |
| Scope/security | Full diff, changed-file review, secret review, dependency review, and no migration diff |
| Anti-Slop | Actual audit output with final blocking findings `0` |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| PRD | Not applicable — no traceability ID system. |
| Feature | Backend API versioning foundation |
| Requirement | `AGENTS.md`; `docs/ARCHITECTURE.md`; `docs/API.md`; `docs/SECURITY.md` |
| Acceptance Criteria | Section 16 |
| API Operation | Existing auth operations migrated to `/api/v1/auth/*`; operational routes unchanged |
| Database | Not applicable — no schema change |
| Test IDs | Existing API Jest files listed in Section 7 and Section 14 |
| Design/Figma | Not applicable — no UI change |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] All acceptance criteria pass with mapped evidence.
- [ ] Only v1 exists; no fake v2 route or versioned OpenAPI implementation is added.
- [ ] Auth composition is module-level and app composition uses named dependencies.
- [ ] Existing auth behavior and security semantics remain intact under new v1 paths.
- [ ] Operational routes remain unversioned.
- [ ] No schema, migration, dependency, or unrelated behavior change exists.
- [ ] Focused and full applicable tests pass.
- [ ] Code Anti-Slop runs and passes with zero blocking findings.
- [ ] Lint, typecheck, format check, and applicable integration checks pass.
- [ ] `git diff --check`, changed-file review, secret review, and final diff review pass.
- [ ] Architecture guidance is updated and no later task is started.
