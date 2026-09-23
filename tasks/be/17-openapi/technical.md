# be/17-openapi — OpenAPI Infrastructure

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/17-openapi` |
| Batch | N/A |
| Owning Feature | API foundation |
| Workstream | Backend |
| Task Category | OpenAPI infrastructure |
| Repository/App | `apps/api` |
| Status | Implemented — visual verification pending |
| Priority | Foundation execution order 17 |
| Suggested Size | Small — one documented API contract boundary |
| Depends On | `be/07-security-foundation`; current auth contracts from `be/08`, `be/10`, `be/11`, `be/12`; operational-route exclusion from `be/16` |
| Blocks | `be/18-health-readiness` |
| Execution Order | 17 |

## 2. Outcome

Generate one startup-built OpenAPI `3.0.3` document for current application routes, serve its JSON at `/openapi.json`, and mount public Swagger UI at `/docs`. The document has reusable bearer and actual error components, uses explicit route contributions, and excludes operational Bull Board routes.

## 3. Context

- `apps/api` uses Express `5.2.1`, Bun `1.4.0`, `swagger-jsdoc`, and `swagger-ui-express` from its lockfile. No OpenAPI implementation currently exists.
- `apps/api/package.json` has no `version`; use `0.1.0` for `info.version`.
- Current application routes are `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, and `POST /auth/logout-all`.
- `/ops/queues` is a Basic-Auth-protected third-party operational dashboard. It is not a public JSON API operation.
- `docs/API.md`, `docs/SECURITY.md`, `docs/ARCHITECTURE.md`, route controllers, and centralized error middleware are source evidence.

## 4. Dependencies

- Security middleware and centralized safe errors from `be/07` remain intact.
- JWT/session/logout contracts define existing auth route security and outcomes.
- `be/16` defines `/ops/queues` as excluded operational tooling.
- Existing runtime dependencies `swagger-jsdoc` and `swagger-ui-express` are reused. Do not add another OpenAPI framework or dependency.

## 5. In Scope

- OpenAPI `3.0.3` root document, static validation, and deterministic startup generation.
- Public `GET /openapi.json` and public Swagger UI under `GET /docs`.
- Explicit registration convention for current and future module route contributions.
- Documentation for verified current auth routes and actual centralized error shapes.
- Bearer security scheme with route-level use only.
- Focused tests, documentation updates, and validation evidence.

## 6. Out of Scope

- API URL versioning, `/v1` or `/api/v1` route rewrites, and deployment-host configuration.
- Business routes, business tags, fake examples, client generation, and a custom Swagger UI design.
- OpenAPI documentation for `/ops/queues`, Bull Board assets, or Bull Board internal APIs.
- New environment variables, database migrations, CMS work, queue changes, JWT/RBAC changes, and successor tasks.

## 7. Existing Implementation

- `apps/api/src/app.ts`: global middleware and current route registration.
- `apps/api/src/auth/login-route.ts`, `refresh-route.ts`, `logout-route.ts`: actual public/protected route behavior.
- `apps/api/src/auth/access-auth-middleware.ts`: bearer-auth rejection envelope.
- `apps/api/src/security/index.ts`: shared `400`, `413`, `429`, and `500` JSON envelopes.
- `apps/api/src/queue/monitor.ts`: operational route excluded from application API docs.
- `apps/api/package.json`: existing Swagger dependencies; no package version.
- `apps/api/tests/`: current route and security test patterns.

Expected paths are guidance; inspect repository before implementation.

## 8. Implementation Requirements

- Use `swagger-jsdoc` to build one OpenAPI document during application initialization. Validate static document invariants before mounting routes. Initialization failure is a sanitized startup failure; do not start a false-ready API.
- Use `swagger-ui-express` at exactly `/docs`. Serve the already-built JSON document at exactly `/openapi.json` with `application/json`.
- Set `openapi: '3.0.3'`, `info.title: 'API'`, `info.version: '0.1.0'`, and `servers: [{ url: '/' }]`.
- `info.version` is API-document metadata only. Do not add URL versioning or change existing route paths.
- Keep `/docs` and `/openapi.json` public in all environments. Do not add a docs enable/disable environment variable or auth guard.
- Define `components.securitySchemes.bearerAuth` as HTTP bearer JWT. Do not set global bearer security.
- Document public `POST /auth/login` and `POST /auth/refresh` without bearer security. Document `POST /auth/logout` and `POST /auth/logout-all` with `bearerAuth`.
- Reuse actual JSON error envelope schema `{ message: string }`. Reusable responses may cover actual `400`, `401`, `403`, `413`, `429`, and `500` behavior only. Do not document invented error codes or fields.
- Document only verified current routes. Current auth tag is `Auth`; do not pre-create business tags.
- Exclude `/ops/queues` and every Bull Board implementation route from `paths`.
- Do not include runtime secrets, credential defaults, tokens, connection strings, keys, stack traces, or real credential examples in descriptions, schemas, or examples.

### Registration Convention

- `apps/api/src/openapi/index.ts` owns root metadata, reusable components, explicit contribution imports, document assembly, and static invariant checks.
- Route-owning modules export their contribution beside route code, for example `apps/api/src/auth/openapi.ts` exports Auth paths/tags/schemas for existing auth routes.
- The root explicitly registers each contribution. No automatic filesystem discovery, plugin system, or global mutable registry.
- A future module adds one local contribution and one explicit import/entry in `src/openapi/index.ts`. `be/21` may move that file with its owning module; do not perform that refactor here.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — OpenAPI path, version, and server policy are fixed code-level foundation configuration. No `SWAGGER_ENABLED`, `SWAGGER_PATH`, `OPENAPI_VERSION`, or `OPENAPI_SERVER_URL` variable is added.

### API Contract

| Method / path | Authentication | Response | Status |
| --- | --- | --- | --- |
| `GET /docs` and Swagger assets | None | Swagger UI HTML/assets; no JSON envelope | `200` |
| `GET /openapi.json` | None | Generated OpenAPI JSON, `application/json` | `200` |
| `POST /auth/login` | None | Existing `accessToken`, `refreshToken`, `tokenType`, `expiresIn` response | `200`, `400`, `401`, `413`, `429`, `500` |
| `POST /auth/refresh` | None; refresh token stays in JSON request body | Existing rotated token response | `200`, `400`, `401`, `413`, `429`, `500` |
| `POST /auth/logout` | `bearerAuth` | No body | `204`, `401`, `413`, `429`, `500` |
| `POST /auth/logout-all` | `bearerAuth` | No body | `204`, `401`, `413`, `429`, `500` |

- `/docs` and `/openapi.json` are public documentation, not product JSON API operations.
- Swagger UI "Try it out" sends ordinary requests through normal CORS, authentication, validation, and rate-limit middleware. It receives no bypass or prefilled credentials.
- `/ops/queues` is absent from this contract and `paths`.

### Database Contract

Not applicable — this task creates no PostgreSQL schema, data change, or migration.

### UI Contract

Not applicable — third-party Swagger UI is mounted without custom design or custom CSS.

## 10. File Impact

### Expected Create

- `apps/api/src/openapi/index.ts`
- `apps/api/src/auth/openapi.ts`
- `apps/api/tests/openapi.test.ts`

### Expected Modify

- `apps/api/src/app.ts`
- `apps/api/src/server.ts` only if startup construction needs explicit OpenAPI initialization.
- `docs/API.md`
- `tasks/be/17-openapi/technical.md`
- `tasks/be/17-openapi/explanation.md`

### Expected Not Modified

- Existing route paths/controllers/services, auth/session/RBAC behavior, queue monitor, Redis/BullMQ lifecycle, database schema/migrations, package dependencies, and CMS code.

## 11. Runtime Behavior

1. Application startup builds the static OpenAPI document from explicit module contributions.
2. Static validation confirms `3.0.3`, `info.version`, `/` server URL, `bearerAuth`, actual registered paths, and absence of `/ops/queues`.
3. Invalid document construction fails startup with a sanitized error before the server listens.
4. Application mounts `/openapi.json`, then `/docs`, then existing application routes; all normal security middleware remains active.
5. Requests retrieve prebuilt documentation; normal API requests remain unchanged.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Static document invariant fails | Startup fails deterministically | No server start; no internal generation detail in public response |
| `/docs` request | Public Swagger UI response | No auth, injected token, secret, or custom bypass |
| `/openapi.json` request | Public JSON document | `application/json`; contains no secret/runtime values |
| Public auth route | No bearer security declaration | Mirrors actual login/refresh access |
| Protected auth route | Requires `bearerAuth` declaration | Mirrors actual logout access middleware |
| Operational dashboard route | Not registered in OpenAPI | No Bull Board paths/assets leak |
| Future module lacks verified API contract | No speculative documentation added | Owning task defines contract first |

## 13. Security Requirements

- Keep Helmet, CORS, body limits, rate limits, request IDs, and centralized safe errors unchanged.
- Documentation endpoints are public but must expose contract metadata only; never serialize environment, headers, credentials, JWTs, private keys, stack traces, or connection details.
- Bearer security applies only to actual protected application routes. Refresh tokens are not authorization bearer tokens.
- No special CSRF middleware is needed: Swagger UI uses normal bearer-token requests and creates no cookie-authenticated docs session.
- Do not derive server URLs from request Host headers or hard-code development/production hostnames.

## 14. Test Requirements

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| `GET /docs` | Public HTML Swagger UI response | Integration |
| `GET /openapi.json` | `200`, JSON content type, `openapi: 3.0.3`, `info.version: 0.1.0`, server `/` | Integration |
| Security component | `bearerAuth` is HTTP bearer JWT | Unit/integration |
| Current auth paths | Login/refresh public; logout routes require `bearerAuth` | Unit/integration |
| Operational exclusion | `/ops/queues` and Bull Board paths absent | Unit/integration |
| Route truth | Only current auth paths plus documentation endpoints; no fake business paths/tags | Unit/integration |
| Secret safety | Spec omits supplied test secrets, monitor credentials, private-key material, database/Redis URL values, and bearer values | Unit/integration |
| Regression | Existing auth, queue monitor, and security tests remain passing | Full Jest |

- Tests remain isolated, deterministic, and do not require production credentials or a live queue/database.
- Browser verification is required when a browser runtime is available.

## 15. Task-Level Expected Results

- One startup-built OpenAPI document describes verified current application routes.
- Public `/docs` and `/openapi.json` work without changing application route paths.
- Auth security declarations match actual middleware behavior.
- Operational tooling, secrets, and speculative business contracts remain absent.

## 16. Acceptance Criteria

- [ ] OpenAPI version is exactly `3.0.3`.
- [ ] Swagger UI mounts exactly at `/docs`; raw JSON mounts exactly at `/openapi.json`.
- [ ] Both documentation endpoints are public and contain no secrets.
- [ ] `info.version` is `0.1.0`; no API URL versioning or route rewrite is introduced.
- [ ] Server URL is exactly relative `/`; no deployment hostname is hard-coded.
- [ ] `bearerAuth` exists and only actual protected routes declare it.
- [ ] Current public login/refresh routes are not incorrectly bearer-protected.
- [ ] `/ops/queues`, Bull Board paths, fake endpoints, and speculative tags are absent.
- [ ] No new environment variable, dependency, PostgreSQL migration, or custom Swagger UI is added.
- [ ] Focused tests, regression tests, lint, typecheck, Code Anti-Slop, browser verification when available, and diff check pass.

## 17. Anti-Slop Requirements

- Code Anti-Slop: required. Reject fake routes, duplicate API catalogs, a giant speculative schema/tag catalog, wrappers/plugin frameworks, dependency additions, hostnames, secret examples, `any`, hidden TODO/FIXME/HACK, and unrelated refactors.
- UI Anti-Slop: not applicable — third-party Swagger UI receives no custom design.
- Visual Verification: required when browser capability exists. Confirm `/docs` loads, assets work, title/version/routes render, bearer Authorize control exists, `/ops/queues` is absent, and no secret is visible.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api format:check`
- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused `apps/api/tests/openapi.test.ts`.
- `bun run --cwd apps/api test -- --detectOpenHandles`.

### Build / Database

Not applicable — no API build script and no database migration.

### UI

- Browser verification of `/docs` when browser capability exists; otherwise report `Visual verification: NOT RUN — <reason>`.

### Anti-Slop

- Code Anti-Slop during implementation and after fixes.

## 19. Completion Evidence

| Acceptance criterion | Evidence |
| --- | --- |
| Document metadata, server, paths, and security | Focused OpenAPI test |
| Public docs and raw JSON | Focused route integration test |
| Operational/secret exclusion | Focused spec assertions and changed-file review |
| Regression | Full Jest output |
| Static correctness | Prettier, ESLint, TypeScript output |
| Browser correctness | Browser inspection or explicit `NOT RUN` reason |
| Scope hygiene | Code Anti-Slop, `git diff --check`, diff, status, and secret review |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture | `docs/ARCHITECTURE.md`; `AGENTS.md` backend boundaries |
| API | `docs/API.md`; current auth routes |
| Security | `docs/SECURITY.md`; `be/07`, `be/08`, `be/10`–`be/13` |
| Operational exclusion | `be/16-queue-monitor` |
| Database | Not applicable — no schema change |
| Test IDs | Not applicable — project has no test-ID system |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] Scope and acceptance criteria implemented without successor or business-module work.
- [ ] `/docs` and `/openapi.json` are public, deterministic, and secret-free.
- [ ] OpenAPI metadata, route security, actual paths, and operational exclusion are verified.
- [ ] No route versioning, hostname configuration, package/dependency, database, or queue-monitor change is added.
- [ ] Focused and regression tests, format, lint, typecheck, Code Anti-Slop, and diff check pass.
- [ ] Browser verification passes when available, or its unavailable status is reported truthfully.
- [ ] Changed-file, secret, and human reviews complete.
