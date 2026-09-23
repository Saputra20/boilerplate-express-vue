# be/23-versioned-openapi-swagger — Versioned OpenAPI and Swagger

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/23-versioned-openapi-swagger` |
| Batch | N/A |
| Owning Feature | Versioned API documentation and Swagger testing |
| Workstream | Backend |
| Task Category | API documentation / developer tooling |
| Repository/App | `apps/api` |
| Status | Complete — implementation and automated validation pass; browser verification unavailable, fallback validation passed on 2026-09-23. |
| Priority | Foundation execution order 23 |
| Suggested Size | Medium — YAML migration, serving, validation, browser verification |
| Depends On | `be/22-api-versioning-foundation` |
| Blocks | N/A |
| Execution Order | 23 |

## 2. Outcome

Create a version-aware OpenAPI foundation that serves one validated v1 document and a v1 Swagger UI. `/docs` redirects to `/docs/v1`; `/docs/v1` renders Swagger UI with `Try it out` and JWT `Authorize`; `/openapi/v1.json` serves the machine-readable document. Auth and health contracts live beside their owning module, while global infrastructure loads, validates, serves, and aggregates them.

This task implements only v1. It does not create v2, versioned business routes, or a versioned OpenAPI UI for v2.

## 3. Context

- `AGENTS.md` requires explicit API contracts, safe examples, no secrets, module ownership, and truthful validation evidence.
- `docs/ARCHITECTURE.md`, `docs/API.md`, and `docs/SECURITY.md` define API routing, OpenAPI boundaries, and credential/logging rules.
- `be/21-api-module-architecture-refactor` established module-owned OpenAPI contributions and global `config/openapi` infrastructure.
- `be/22-api-versioning-foundation` establishes `/api/v1/auth/*`, unversioned operational routes, module-relative routers, and module-level composition. It must complete first.
- Current OpenAPI implementation is TypeScript object based in `apps/api/src/config/openapi/openapi.ts`, with module contributions in `apps/api/src/modules/auth/auth.openapi.ts` and `apps/api/src/modules/health/health.openapi.ts`.
- Current dependencies include `swagger-jsdoc` and `swagger-ui-express`; no YAML parser or OpenAPI resolver is currently installed.
- Current route/spec evidence is recorded in `references/current-openapi.md`.

## 4. Dependencies

- `be/22-api-versioning-foundation` must be complete and verified before execution.
- Existing v1 route composition, auth behavior, health/readiness behavior, queue monitor behavior, and security middleware remain available.
- No database, migration, or external service is required.
- Planning identifies `yaml` as the minimal YAML parser candidate and `@apidevtools/swagger-parser` as the minimal candidate if runtime `$ref` resolution/bundling and OpenAPI validation need a dedicated library. Do not install packages during this planning run; execution must confirm current compatibility and pin exact versions.

## 5. In Scope

- Create v1 YAML contracts colocated with auth v1 and health module ownership.
- Remove duplicate TypeScript module path/schema contract definitions after migration, retaining only runtime aggregation/serving logic.
- Serve `/openapi/v1.json` as validated JSON.
- Serve `/docs/v1` as Swagger UI for the v1 document.
- Redirect `/docs` to `/docs/v1`.
- Keep `Try it out` enabled and `persistAuthorization: false`.
- Define reusable JWT bearer security scheme and attach it only to protected operations.
- Keep public login, refresh, health, and readiness operations unauthenticated in OpenAPI.
- Use stable semantic operation IDs, module tags, explicit versioned schema names, relative server URL `/`, strict request schemas where runtime validation is strict, and synthetic examples only.
- Add focused contract/serving tests and browser verification when the execution environment provides browser capability; otherwise require the documented automated fallback validation.
- Update concise architecture/governance guidance for YAML ownership, global aggregation, Swagger as primary manual API testing, and v1/v2 coexistence.

## 6. Out of Scope

- Any v2 YAML, v2 JSON, v2 Swagger UI, or v2 route.
- Changing business routes or auth behavior; route migration belongs to `be/22`.
- New API endpoint, request field, response field, status code, permission, role, auth rule, or database behavior.
- Queue monitor documentation as public JSON API.
- Moving health/readiness under `/api/v1`.
- Postman collections or Postman as project infrastructure.
- Dozens of schema/path YAML fragments before module size requires them.
- Automatic Express route reflection or a generic route registry.
- Database schema, migration, seed, or data changes.
- Deprecating or removing v1.

## 7. Existing Implementation

Inspect these files after `be/22` completes:

- `apps/api/src/config/openapi/openapi.ts`: current document generation, Swagger UI mounting, `/docs`, `/openapi.json`, security scheme, contribution aggregation, and queue-monitor exclusion.
- `apps/api/src/modules/auth/auth.openapi.ts`: current auth schemas and unversioned `/auth/*` paths.
- `apps/api/src/modules/health/health.openapi.ts`: current `/health` and `/ready` paths.
- `apps/api/src/modules/auth/v1/auth.router.ts` and `apps/api/src/modules/auth/v1/auth.openapi.yaml`: target v1 module ownership from `be/22`.
- `apps/api/src/modules/health/health.router.ts`: operational routes remain `/health` and `/ready`.
- `apps/api/tests/openapi.test.ts`: current document/path/security assertions.
- `apps/api/tests/health-readiness.test.ts`: health/readiness and OpenAPI assertions.
- `apps/api/tests/queue-monitor.test.ts`: queue monitor and OpenAPI exclusion assertions.
- `apps/api/tests/login-session.test.ts`, `refresh-token.test.ts`, and `logout-revocation.test.ts`: actual auth route behavior.
- `apps/api/package.json`: existing `swagger-jsdoc`, `swagger-ui-express`, and test tooling.
- `docs/DEVELOPMENT.md`: local API and browser testing instructions.

## 8. Implementation Requirements

### 8.1 Document paths and serving

- `/docs` responds with a convenience redirect to `/docs/v1`.
- `/docs/v1` renders Swagger UI backed only by the v1 document.
- `/openapi/v1.json` returns the validated v1 OpenAPI JSON document.
- Future `/docs/v2` and `/openapi/v2.json` are documented extension points only; do not create them.
- Swagger UI keeps `Try it out` enabled and `persistAuthorization: false` unless the installed package requires an equivalent secure option.
- Swagger UI must render the correct document in isolation; do not rely only on object-level TypeScript tests.

### 8.2 YAML ownership and loading

- Auth v1 contract lives at `apps/api/src/modules/auth/v1/auth.openapi.yaml`.
- Health operational contract lives adjacent to health at `apps/api/src/modules/health/health.openapi.yaml`.
- Global `apps/api/src/config/openapi/` owns file loading, optional `$ref` bundling/resolution, validation, aggregation, serving, and `/docs` redirect.
- Module YAML owns module paths, schemas, tags, operation IDs, request/response contracts, and operation security declarations.
- Do not retain duplicate old TypeScript auth/health path/schema objects after migration.
- Prefer one YAML file per module/version. Split into paths/schemas/responses only after real size requires it.

### 8.3 Security and schemas

- Define one reusable HTTP bearer JWT scheme named `bearerAuth`.
- Protected logout operations declare `security: [{ bearerAuth: [] }]`.
- Public login, refresh, health, and readiness operations declare no bearer requirement.
- Use explicit versioned schema names such as `AuthV1LoginRequest`, `AuthV1RefreshRequest`, and `AuthV1TokenResponse`; use globally shared names only for truly stable generic contracts.
- Match runtime request validation and response behavior exactly.
- Use `additionalProperties: false` where runtime strict validation applies.
- Use only synthetic examples. Never include passwords, JWTs, monitor credentials, database credentials, Redis credentials, private keys, or environment secrets.

### 8.4 Operations and version metadata

- Document auth v1 operations: `login`, `refreshToken`, `logoutCurrentSession`, and `logoutAllSessions`.
- Document health operations: `getHealth` and `getReadiness`.
- Use module/capability tags `Auth` and `Health`; never tag by HTTP method.
- Use `servers: [{ url: '/' }]`.
- Keep API major URL version `v1` separate from `info.version` document metadata.
- Changing `info.version` alone must not create `/api/v2`.

### 8.5 Operational exclusion

- Document `/health` and `/ready`.
- Do not document `/ops/queues`; bull-board remains a separate operational UI, not a public JSON API contract.
- Preserve existing queue monitor authentication and read-only policy.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no new runtime environment variable.

### API Contract

| Method | Path | Auth | Required OpenAPI Evidence |
| --- | --- | --- | --- |
| GET | `/docs` | Public | Redirect to `/docs/v1` |
| GET | `/docs/v1` | Public | Swagger UI renders v1 document with Try it out and Authorize |
| GET | `/openapi/v1.json` | Public | Valid OpenAPI 3 document for v1 |
| POST | `/api/v1/auth/login` | Public | Request, 200/400/401/413/429/500 responses, no bearer requirement |
| POST | `/api/v1/auth/refresh` | Public | Request, 200/400/401/413/429/500 responses, no bearer requirement |
| POST | `/api/v1/auth/logout` | Bearer JWT | 204/401/500 responses and bearer requirement |
| POST | `/api/v1/auth/logout-all` | Bearer JWT | 204/401/500 responses and bearer requirement |
| GET | `/health` | Public | Liveness response and no bearer requirement |
| GET | `/ready` | Public | Readiness 200/503 responses and no bearer requirement |

`/ops/queues` is intentionally absent from this JSON API contract.

### Database Contract

No schema, migration, table, column, index, constraint, or data impact.

### UI Contract

| Surface | Behavior | Verification |
| --- | --- | --- |
| `/docs` | Redirects to `/docs/v1` | Browser and HTTP test |
| `/docs/v1` | Renders v1 Swagger UI | Browser verification |
| Auth section | Shows request bodies, responses, status codes, Try it out, and Authorize | Browser verification |
| Protected auth operations | Accept bearer token through Authorize | Browser/manual verification |

## 10. File Impact

### Expected Create

- `apps/api/src/modules/auth/v1/auth.openapi.yaml` — Auth v1 contract; module/version-owned.
- `apps/api/src/modules/health/health.openapi.yaml` — health/readiness operational contract; health-owned.
- Minimal loader/bundler/validator test fixture only if required by actual implementation.

### Expected Modify

- `apps/api/src/config/openapi/openapi.ts` — YAML load/resolve/validate, v1 serving, Swagger UI, `/docs` redirect, shared security setup.
- `apps/api/tests/openapi.test.ts` — v1 spec, serving, security, operation IDs, queue exclusion, and redirect assertions.
- `apps/api/tests/health-readiness.test.ts` — health paths and v1 document assertions.
- `apps/api/tests/queue-monitor.test.ts` — queue monitor remains absent from OpenAPI.
- Auth route tests from `be/22` only where paths changed by the prerequisite.
- `docs/DEVELOPMENT.md` — Swagger browser testing workflow.
- `AGENTS.md` and `docs/ARCHITECTURE.md` — YAML/module ownership and versioned OpenAPI guidance.
- Applicable architecture/API/code-review references only where current guidance is stale.

### Expected Delete After Move

- `apps/api/src/modules/auth/auth.openapi.ts` after all needed contract content is represented in v1 YAML.
- `apps/api/src/modules/health/health.openapi.ts` after all needed content is represented in health YAML.

### Expected Not Modified

- Auth services, repositories, controllers, validation, database, Redis, BullMQ, logger, security middleware, and health route behavior.
- Database schema and migrations.
- Queue monitor implementation and route behavior.
- No v2 files or compatibility UI.

Expected paths are guidance; implementation must inspect post-be/22 paths before finalizing file changes.

## 11. Runtime Behavior

1. Application startup loads the v1 YAML contributions from module-owned paths.
2. Global OpenAPI infrastructure resolves only approved local references, validates the v1 document, and fails startup or document generation safely if invalid.
3. The generated v1 document is served at `/openapi/v1.json`.
4. `/docs` redirects to `/docs/v1`.
5. `/docs/v1` serves Swagger UI configured with the v1 document, Try it out enabled, and authorization persistence disabled.
6. Developers use login Try it out, copy the synthetic/local access token returned by the API, select `Authorize`, and test protected logout operations.
7. Public operations remain usable without bearer authorization.
8. `/health`, `/ready`, and `/ops/queues` retain their existing runtime paths and behavior.
9. A future v2 document can load and serve beside v1 without changing the v1 loader contract or UI mount.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Missing YAML file | OpenAPI initialization fails clearly before serving invalid documentation | Do not silently serve stale/empty spec |
| Invalid YAML/OpenAPI | Validation fails with sanitized file/path context | Never print secrets or full credential examples |
| Duplicate operation ID | Validation/test fails before completion | Fix contract; do not generate IDs automatically |
| Public operation has bearer security | Contract test fails | Remove accidental inherited security |
| `/ops/queues` appears in spec | Contract test fails | Remove it; preserve bull-board separately |
| `/docs` points to wrong spec | HTTP/browser test fails | Keep redirect exact to `/docs/v1` |
| Swagger UI loads wrong document | Browser/spec isolation test fails | Bind each UI instance to explicit document |
| Future v2 added | v1 remains served | Require separate approved v2 implementation/deprecation decisions |

## 13. Security Requirements

- Keep Swagger UI and OpenAPI JSON public as current policy permits.
- Preserve JWT bearer scheme without injecting, storing, or hard-coding credentials.
- Keep `persistAuthorization: false`.
- Public login, refresh, health, and readiness must not appear protected.
- Protected logout operations must require bearer auth in documentation consistent with middleware.
- Redact or exclude credential fields from examples, YAML, generated output, and logs.
- Do not resolve untrusted remote `$ref` URLs. Local approved references only unless a later security decision explicitly permits another source.
- Preserve operational dashboard exclusion and Basic Auth policy.

## 14. Test Requirements

### Happy Path

- v1 document loads and validates.
- `/openapi/v1.json` returns JSON v1 document.
- `/docs` redirects to `/docs/v1`.
- `/docs/v1` renders Swagger UI.
- Auth v1 operations and health operations appear with correct methods.

### Validation

- Request schemas, response schemas, status codes, tags, and operation IDs match actual routes.
- `additionalProperties: false` appears where runtime request validation is strict.
- `servers.url` is `/`.

### Negative / Failure

- Invalid/missing YAML does not produce a silently valid empty document.
- Duplicate operation IDs fail validation.
- `/ops/queues` is absent.
- Old `/auth/*` paths are absent after `be/22` route migration.

### Security

- `bearerAuth` exists as reusable HTTP bearer scheme.
- Logout operations declare bearer security.
- Login, refresh, health, and readiness do not declare bearer security.
- Synthetic examples contain no real credentials, tokens, or private keys.

### Regression

- Auth behavior and route paths remain as established by `be/22`.
- Health/readiness remain `/health` and `/ready`.
- Queue monitor remains independently available at `/ops/queues` and absent from OpenAPI.

### Functional Swagger Verification

Mandatory regardless of browser capability. Automated evidence must verify:

- `/docs` returns the expected redirect to `/docs/v1`, with the correct status code and no redirect loop;
- `/docs/v1` returns successful HTML, has an HTML content type, contains Swagger UI bootstrap/content markers, reaches Swagger assets where practical, and does not return a server error;
- `/openapi/v1.json` returns `200` JSON containing a valid OpenAPI `3.0.3` document, expected v1 auth paths, `/health`, and `/ready`, while excluding `/ops/queues`;
- the bearer security scheme exists and public/protected security declarations are correct;
- Swagger configuration keeps Try it out enabled, keeps `persistAuthorization: false`, binds `/docs/v1` explicitly to the v1 document, and contains no hard-coded real bearer token, credential, or secret example;
- version isolation is explicit: `/docs/v1` serves the v1 document and does not alias an unversioned stale document.

### Browser Verification

`REQUIRED WHEN CAPABILITY IS AVAILABLE`

Required when browser capability is available. Verify `/docs` and `/docs/v1` interactively/visually:

- redirect works;
- Swagger UI assets load;
- Auth and Health sections render;
- Try it out exists and works;
- Authorize control exists;
- request fields and response schemas render;
- protected operation security is visible;
- no secrets or queue-monitor entries appear.

When browser capability is unavailable, report exactly:

`Browser verification: NOT RUN — browser capability unavailable in execution environment`

Then run all Functional Swagger Verification fallback checks. Browser unavailability alone does not block completion when fallback evidence passes. Do not claim visual layout verified, Authorize button visually observed, Try it out manually clicked, or rendered fields visually inspected; report each as `NOT RUN — browser capability unavailable`.

### Isolation

- Spec tests use deterministic local YAML fixtures and do not depend on route test order.
- Swagger serving tests close app/logging resources.
- v1 document/UI tests remain isolated from any future v2 document/UI.

## 15. Task-Level Expected Results

- Auth v1 and health contracts are YAML and colocated with owning modules.
- Global OpenAPI infrastructure loads, validates, aggregates, and serves v1.
- `/docs` redirects to `/docs/v1`.
- `/docs/v1` and `/openapi/v1.json` are explicit v1 surfaces.
- Swagger UI supports Try it out and JWT Authorize without persisted credentials.
- OpenAPI security declarations match public/protected runtime routes.
- Queue monitor stays outside the JSON OpenAPI contract.
- No duplicate TypeScript auth/health contract source remains.
- v1 remains independently extensible when v2 is eventually approved.

## 16. Acceptance Criteria

- [ ] `be/22-api-versioning-foundation` is complete and verified before execution.
- [ ] `auth.openapi.yaml` exists under auth v1 ownership.
- [ ] `health.openapi.yaml` exists beside health module ownership.
- [ ] TypeScript auth/health path/schema definitions are removed after YAML migration; no duplicate contract source remains.
- [ ] `/docs` redirects to `/docs/v1`.
- [ ] `/docs/v1` renders Swagger UI using v1 document only.
- [ ] `/openapi/v1.json` serves valid v1 OpenAPI JSON.
- [ ] Try it out remains enabled and `persistAuthorization` remains false.
- [ ] JWT bearer security configuration supports protected operations through `Authorize` without hard-coded credentials.
- [ ] Auth v1 documents exactly the four `/api/v1/auth/*` operations.
- [ ] `/health` and `/ready` are documented and remain outside `/api/v1`.
- [ ] `/ops/queues` is absent from OpenAPI and remains operationally unchanged.
- [ ] Operation IDs are unique and semantic.
- [ ] Schema names are version-safe and match runtime behavior.
- [ ] Public/protected security declarations are correct.
- [ ] `servers.url` is `/`; `info.version` remains distinct from API major URL version.
- [ ] Functional Swagger verification passes for `/docs`, `/docs/v1`, `/openapi/v1.json`, Swagger configuration, security declarations, and v1 version isolation.
- [ ] Browser visual/interactive verification passes for `/docs` and `/docs/v1` when browser capability is available; otherwise it is reported as unavailable and all fallback validation passes.
- [ ] No v2 implementation, Postman infrastructure, database change, or unrelated dependency change is added.
- [ ] Architecture/governance guidance is updated for YAML ownership and v1/v2 coexistence.

## 17. Anti-Slop Requirements

Code Anti-Slop: required during implementation.

- Reject duplicate TypeScript/YAML contracts, stale path definitions, generated machine operation IDs, ambiguous unversioned schema names, fake v2 files, empty YAML fragments, global module-specific schema directories, automatic route reflection, and unrelated framework additions.
- Reject hard-coded secrets, real tokens, persisted Swagger authorization, remote untrusted `$ref` resolution, and queue-monitor leakage into public OpenAPI.
- Reject over-splitting small module specs into dozens of files.
- Check hidden TODO/FIXME/HACK, unused dependencies, dead loaders, unjustified `any`/assertions, and duplicated v1/v2 infrastructure.
- UI Anti-Slop: required when browser capability is available for Swagger UI review; check hierarchy, readable schema display, usable controls, visible errors, no fake content, and no broken assets. Without browser capability, perform source/HTTP checks and report visual checks as unavailable.
- Visual Verification: required when browser capability is available; otherwise `NOT RUN — browser capability unavailable in execution environment`, with Functional Swagger Verification fallback mandatory.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `bun run --cwd apps/api format:check`
- `git diff --check`
- Validate YAML/OpenAPI documents with the selected project-compatible validator.

### Automated Tests

- Focused OpenAPI, Swagger-serving, auth route, health/readiness, and queue-monitor tests.
- `bun run --cwd apps/api test`
- Existing applicable PostgreSQL/Redis/BullMQ regression tests.

### Build

Not applicable — `apps/api` has no build script; typecheck is required.

### Database

Not applicable — no schema or migration change.

### UI

- Browser verification of `/docs`, `/docs/v1`, Auth, Health, Try it out, Authorize, schemas, and asset loading when browser capability is available.
- Without browser capability, automated fallback validation of redirect behavior, HTML/Swagger markers and assets, OpenAPI JSON/schema/security, Swagger configuration, secret absence, and explicit v1 document binding.

### Anti-Slop

- Run project-local Code Anti-Slop and applicable UI Anti-Slop during implementation and again before completion.
- Report actual findings and final blocking count.

## 19. Completion Evidence

| Acceptance Area | Required Evidence |
| --- | --- |
| YAML ownership | File review showing auth v1 and health YAML beside owning modules |
| Spec validity | Validator output and focused v1 document tests |
| Serving | HTTP tests for `/openapi/v1.json`, `/docs`, and `/docs/v1` |
| Functional Swagger verification | Automated HTTP/spec/configuration evidence for `/docs`, `/docs/v1`, `/openapi/v1.json`, Swagger options, security declarations, secret absence, assets, and explicit v1 binding |
| Browser UX | Browser screenshots/inspection proving Try it out, Authorize, schemas, and assets when capability is available; otherwise `NOT RUN — browser capability unavailable in execution environment` |
| Security | Tests proving bearer scheme, protected logout, public login/refresh/health/readiness, no secrets |
| Contract consistency | Tests proving auth/health paths and absence of `/ops/queues` |
| Version isolation | v1 document/UI bound explicitly; no v2 implementation |
| Static correctness | Lint, typecheck, format check, `git diff --check` |
| Scope/security | Full diff, changed-file review, secret review, dependency review, no migration diff |
| Anti-Slop | Code/UI audit output with zero blocking findings |

### 19.1 Execution Evidence — 2026-09-23

| Gate | Evidence | Result |
| --- | --- | --- |
| Dependency | be/22 completion evidence verified before implementation. | PASS |
| YAML ownership | Auth v1 contract at `modules/auth/v1/auth.openapi.yaml`; health contract at `modules/health/health.openapi.yaml`. | PASS |
| Spec validity | `@apidevtools/swagger-parser` validates loaded v1 document during module initialization; OpenAPI contract tests pass. | PASS |
| Serving | Tests pass for `/docs` redirect, `/docs/v1`, Swagger assets, and `/openapi/v1.json`. | PASS |
| Swagger options | Served init script contains `persistAuthorization: false` and `tryItOutEnabled: true`. | PASS |
| Security/contract | Tests verify bearer scheme, protected logout, public auth/health/readiness, version-safe schemas, and `/ops/queues` exclusion. | PASS |
| Version isolation | No v2 route, YAML, JSON, or UI implementation found. | PASS |
| Static checks | `lint`, `typecheck`, `format:check`, and `git diff --check` pass. | PASS |
| Full tests | 18 suites passed, 2 skipped; 124 tests passed, 6 skipped with `--detectOpenHandles`. | PASS |
| Functional Swagger fallback | Automated tests verify `/docs` redirect/status/no loop, `/docs/v1` HTML/Swagger markers/assets, `/openapi/v1.json` status/content type/OpenAPI 3.0.3/paths/security, Swagger options, secret absence, and explicit v1 document binding. | PASS |
| Browser verification | No browser automation tool or installed browser binary available in execution environment. | NOT RUN — browser capability unavailable in execution environment |
| Scope/security | No database/migration diff; changed-file, secret, generated-junk, dependency, and final diff reviews completed. | PASS |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| PRD | Not applicable — no traceability ID system. |
| Feature | Versioned OpenAPI and Swagger developer experience |
| Requirement | `AGENTS.md`; `docs/ARCHITECTURE.md`; `docs/API.md`; `docs/SECURITY.md`; `docs/DEVELOPMENT.md` |
| Acceptance Criteria | Section 16 |
| API Operation | Auth v1, health, readiness, docs, and OpenAPI serving paths in Section 9 |
| Database | Not applicable — no schema change |
| Test IDs | Existing API Jest files plus new spec/serving/browser tests |
| Design/Figma | Not applicable — developer tooling UI; browser verification is conditional on environment capability |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] All acceptance criteria pass with mapped evidence.
- [ ] v1 YAML is the sole module contract source after migration.
- [ ] `/docs`, `/docs/v1`, and `/openapi/v1.json` behave exactly as specified.
- [ ] Functional Swagger verification proves public testing, protected-operation configuration, assets, security declarations, and v1 document binding.
- [ ] When browser capability is available, Swagger browser workflow supports public testing and protected testing through Authorize. When unavailable, browser verification is explicitly reported as not run and automated fallback validation passes.
- [ ] Health/readiness and queue-monitor boundaries remain correct.
- [ ] No v2, database, migration, Postman, or unrelated behavior is added.
- [ ] Focused/full tests, validator, lint, typecheck, and format checks pass; browser verification passes when capability is available or fallback validation passes when unavailable.
- [ ] Code/UI Anti-Slop passes with zero blocking findings.
- [ ] `git diff --check`, changed-file review, secret review, dependency review, and final diff review pass.
- [ ] Architecture/governance guidance is updated and no later task is started.
