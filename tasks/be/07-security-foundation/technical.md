# be/07-security-foundation — Security Foundation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/07-security-foundation` |
| Batch | N/A |
| Owning Feature | N/A |
| Workstream | Backend |
| Task Category | Security foundation |
| Repository/App | `apps/api` |
| Status | Ready: approved for implementation |
| Priority | Foundation execution order 7 |
| Suggested Size | Small — focused API middleware, startup lifecycle, and tests |
| Depends On | `be/02-environment-validation`, `be/06-logging-foundation` |
| Blocks | `be/08-jwt-foundation` |
| Execution Order | 7 |

## 2. Outcome

Provide baseline HTTP security for `apps/api`: Helmet headers, exact-origin CORS, global IP rate limiting, retained `1mb` JSON body limit, sanitized centralized errors, request correlation, and graceful shutdown.

## 3. Context

Follow `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/SECURITY.md`, `docs/DEVELOPMENT.md`, `apps/api/src/config/env.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, and `apps/api/src/logging/index.ts`.

Existing repository evidence:

- `helmet`, `cors`, and `express-rate-limit` are installed in `apps/api/package.json`.
- API environment validation has a singular `CORS_ORIGIN` URL. This task replaces it with the plural allowlist setting in section 9.
- API JSON parsing already uses `express.json({ limit: '1mb' })`; preserve this limit.
- `be/06-logging-foundation` generates server-side UUID request IDs with `pino-http`; it does not trust inbound IDs or expose a response request-ID header.
- API has no `trust proxy` configuration. Preserve Express default proxy behavior; do not trust arbitrary forwarded-IP headers.
- API `.env.example` and tests document `http://localhost:5173` as the local CMS origin. CMS uses Vite default development origin; `apps/cms/vite.config.ts` does not override it.

## 4. Dependencies

- Validated environment/configuration from `be/02-environment-validation`.
- Request-correlated Pino/Morgan logging from `be/06-logging-foundation`.
- Existing `helmet`, `cors`, and `express-rate-limit` dependencies.
- Existing database, Redis, logging, and HTTP server resources for shutdown.

## 5. In Scope

- Helmet baseline middleware with no speculative CSP exceptions.
- Exact-origin CORS allowlist from validated configuration.
- Global `100 requests / 15 minutes / client IP` in-process rate limiter.
- Standard rate-limit headers when supported by installed middleware.
- Existing `1mb` JSON body limit and deterministic malformed/oversized-body errors.
- Centralized sanitized API errors and safe Pino operational error logging.
- Existing server-generated request IDs and graceful shutdown of current resources.
- Focused tests and completion evidence.

## 6. Out of Scope

- JWT issuance or verification, authentication, login, refresh tokens, account lockout, RBAC, permissions, CSRF tokens, cookie/session auth, WAF, bot detection, CAPTCHA, API gateway, cloud security services, or audit records.
- Login/auth/write-operation specific throttles.
- Redis/distributed rate limiting or arbitrary proxy trust configuration.
- Deployed-origin values, wildcard CORS, cross-origin credentials, custom CORS/preflight middleware, and CMS changes.
- Future services not present during this task.

## 7. Existing Implementation

- `apps/api/src/config/env.ts` — Zod API configuration.
- `apps/api/.env.example` and `apps/api/tests/env.test.ts` — environment examples/tests.
- `apps/api/src/app.ts` — Express middleware order and `1mb` JSON parser.
- `apps/api/src/server.ts` — startup and current database/Redis/logger lifecycle.
- `apps/api/src/logging/index.ts` — Pino/Morgan request ID and safe redaction.
- `apps/api/tests/app.test.ts` and `apps/api/tests/logging.test.ts` — API and logging test patterns.
- `apps/cms/vite.config.ts`, `apps/cms/.env.example` — CMS local development evidence.

## 8. Implementation Requirements

- Add Helmet before application routes. Keep default protections; do not add CSP exceptions without explicit compatibility requirement.
- Replace `CORS_ORIGIN` with `CORS_ORIGINS`, parsed and validated as one or more comma-separated absolute origins. Trim values, reject empty entries and duplicates, and match origins exactly. Do not retain a compatibility alias.
- Update API `.env.example` and environment tests with the documented local origin `http://localhost:5173`; deployed origins remain supplied by deployment configuration.
- Configure CORS with only approved origins, methods, and headers from section 9. Never use `*`, partial-domain matching, reflected request headers, or credentials.
- Let supported CORS middleware handle valid `OPTIONS` preflight. A disallowed origin or unapproved method/header must not receive permissive CORS headers. CORS is browser-origin policy, not authentication or authorization.
- Use installed `express-rate-limit` default in-process store. Limit each client IP to 100 requests per 15-minute window. Enable standard headers when supported; do not add custom headers or Redis storage.
- Do not set Express `trust proxy`. Rate-limit client identity uses Express default request IP behavior. A future deployment task must explicitly configure trusted proxies before forwarded headers can affect client identity.
- Preserve `express.json({ limit: '1mb' })`; do not increase it. Apply safe centralized error middleware after routes and distinguish malformed JSON, oversized JSON, limiter errors, and unexpected errors.
- Preserve existing `{ "message": string }` response envelope. Use fixed sanitized messages: `Bad request` for malformed JSON, `Payload too large` for oversized JSON, `Too many requests` for rate limiting, and `Internal server error` for unexpected failures. Log unexpected operational details through request-correlated Pino without returning stacks, filesystem paths, SQL details, secrets, tokens, or key material.
- Keep `be/06` server-generated UUID request IDs. Do not adopt arbitrary inbound `X-Request-Id`; do not add a response ID header in this task.
- On `SIGINT` or `SIGTERM`, stop accepting new HTTP connections, close current HTTP server/database/Redis/logging resources, and exit deterministically. Shutdown only current resources; no future-service lifecycle abstraction.

## 9. Applicable Contracts

### Configuration Contract

| Variable | Required | Type | Validation | Default | Secret |
| --- | --- | --- | --- | --- | --- |
| `CORS_ORIGINS` | Yes | Comma-separated absolute origins | At least one `http`/`https` origin; trim; reject empty, duplicate, path, query, or fragment entries | None — startup fails if missing/invalid | No |

`CORS_ORIGINS=http://localhost:5173` is the local development example only. It derives from existing API environment examples/tests; do not allow arbitrary localhost ports.

### API Error Contract

| Scenario | Status | Response |
| --- | --- | --- |
| Malformed JSON | `400` | `{ "message": "Bad request" }` |
| JSON exceeds `1mb` | `413` | `{ "message": "Payload too large" }` |
| Global rate limit exceeded | `429` | `{ "message": "Too many requests" }` |
| Unknown internal error | `500` | `{ "message": "Internal server error" }` |

### Security Middleware Contract

| Concern | Required behavior |
| --- | --- |
| Helmet | Installed with baseline defaults before routes. |
| CORS origins | Exact validated `CORS_ORIGINS` allowlist only; never wildcard. |
| CORS methods | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`. |
| CORS request headers | `Content-Type`, `Authorization`, and existing request-correlation header `X-Request-Id`; normal HTTP case-insensitive matching applies. |
| CORS credentials | `false`; never send `Access-Control-Allow-Credentials`. |
| CORS exposed headers | None. Do not expose a request-ID response header because none exists yet. |
| Preflight | Approved `OPTIONS` preflight succeeds through CORS middleware; disallowed inputs receive no permissive approval. |
| Rate limit | 100 requests per 15 minutes per Express-resolved client IP using in-process store and standard middleware headers when available. |
| Request ID | Existing server-generated UUID is used for logging/error correlation; inbound IDs are not trusted. |
| Body limit | Existing JSON limit remains `1mb`. |

### Database / UI Contract

Not applicable — no schema, migration, data, CMS UI, or frontend contract change.

## 10. File Impact

**Expected Create**

- Focused security middleware/error helper and focused tests at paths verified from existing `apps/api/src` and `apps/api/tests` conventions.

**Expected Modify**

- `apps/api/src/app.ts` — middleware order and centralized error boundary.
- `apps/api/src/server.ts` — HTTP server ownership and shutdown signals.
- `apps/api/src/config/env.ts`, `apps/api/.env.example`, and `apps/api/tests/env.test.ts` — `CORS_ORIGINS` validation and example.

**Expected Not Modified**

- Logging design, database schema/migrations, Redis client behavior, authentication/JWT/RBAC modules, CMS code, package dependencies, and unrelated API behavior.

## 11. Runtime Behavior

1. Validate environment, including `CORS_ORIGINS`.
2. Initialize logging, database, Redis, and current Express app.
3. Register request IDs, Helmet, exact-origin CORS, `1mb` JSON parsing, global rate limiting, access logging, routes, then centralized errors.
4. Permit approved browser origins, methods, headers, and normal `OPTIONS` preflight without credentials.
5. Reject limit overflow with `429` sanitized response and standard headers when available.
6. Log unexpected failures through request-correlated Pino and return only fixed safe error messages.
7. On `SIGINT`/`SIGTERM`, stop listening, close current resources, and exit deterministically.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Approved origin | Exact origin receives approved CORS response. | No wildcard or credential header. |
| Disallowed origin | Request receives no permissive CORS approval. | Not authentication/authorization; no origin information leaked. |
| Invalid preflight | No permissive CORS method/header approval. | Use middleware behavior; no custom bypass. |
| Request 101 in 15 minutes from one IP | `429` with fixed safe message. | No limiter counters/state exposed; request correlation remains in logs. |
| Malformed JSON | `400` safe message. | No parser detail or stack exposed. |
| JSON above `1mb` | `413` safe message. | Request is not processed further. |
| Unknown error | `500` safe message. | Log safely through Pino; never return internals. |
| Termination signal | Current server stops accepting work and current resources close. | Deterministic exit; no future-resource handling. |

## 13. Security Requirements

- Never permit wildcard CORS or credentialed cross-origin cookies.
- Never trust arbitrary forwarded headers or inbound request IDs.
- Never leak limiter state, stack traces, paths, SQL, secrets, tokens, credentials, or key content.
- Keep Helmet defaults, request IDs, logging redaction, `1mb` body limit, and existing API 404 behavior intact.
- Do not treat CORS as authorization; future authentication and authorization remain server-enforced tasks.

## 14. Test Requirements

### Happy Path

- Approved origin, method, headers, and `OPTIONS` preflight receive correct CORS approval without credentials.
- Requests below global limit and JSON below `1mb` proceed normally.
- Helmet baseline headers and request correlation are present where applicable.

### Validation / Failure

- Request 101 in one 15-minute window returns `429` with no limiter state.
- Disallowed origins, unsupported methods, and unapproved headers receive no permissive CORS approval.
- Malformed JSON, oversized JSON, and unexpected errors return the section 9 safe envelope without internal detail.

### Isolation

- Use fake timers or a test-safe injected rate-limit configuration; never wait 15 minutes.
- Use a smaller injected body-limit fixture only when proving identical behavior; production remains `1mb`.
- Isolate middleware/app instances and deterministically clean temporary resources.

### Shutdown

- Unit/integration test signal/close path where practical, proving current HTTP server and current resource close calls are deterministic.

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Request 1–100 | Normal API behavior | Integration |
| Request 101 | `429` safe response and request correlation | Integration with test-safe limiter |
| Approved CORS origin/preflight | Exact CORS approval; no credentials | Integration |
| Disallowed CORS origin/method/header | No permissive CORS approval | Integration |
| Helmet | Baseline security headers exist | Integration |
| Body below/above limit | Normal behavior / `413` safe response | Integration |
| Malformed JSON | `400` safe response | Integration |
| Unknown error | `500` contains no internal detail | Integration |
| Request ID | Valid server-generated correlation ID is logged | Focused integration |
| Shutdown | Current resources close in deterministic order | Focused unit/integration |
| Existing shell | Existing unknown route remains `404` JSON | Regression |

## 15. Task-Level Expected Results

- Baseline security middleware is configured at current API boundary.
- CORS and rate limits are explicit, validated, and testable.
- Errors and shutdown paths are safe and request-correlated.
- No authentication, authorization, distributed limiter, or session behavior is added.

## 16. Acceptance Criteria

- [ ] Helmet baseline is installed and configured.
- [ ] CORS uses exact configured allowlisted origins, never `*`.
- [ ] CORS permits only `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS`.
- [ ] CORS permits only `Content-Type`, `Authorization`, and `X-Request-Id` request headers.
- [ ] CORS credentials are disabled and no response headers are exposed.
- [ ] Approved `OPTIONS` preflight works; disallowed CORS inputs receive no permissive approval.
- [ ] Global limiter enforces 100 requests per 15 minutes per Express-resolved client IP.
- [ ] Rate-limit overflow returns `429` with safe response and no internal limiter state.
- [ ] Existing `1mb` request body limit remains bounded; malformed/oversized JSON errors are sanitized.
- [ ] Unknown internal errors are sanitized and operational details are logged safely.
- [ ] Existing server-generated request IDs remain correlated; arbitrary inbound IDs are not trusted.
- [ ] Current HTTP server/database/Redis/logging resources close deterministically on `SIGINT`/`SIGTERM`.
- [ ] No JWT, authentication, RBAC, cookie/session, Redis limiter, or unrelated framework is introduced.
- [ ] Focused tests, lint, typecheck, full applicable tests, Code Anti-Slop, and `git diff --check` pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Reject duplicated middleware, generic security wrappers, unused configuration/dependencies, fake CORS or limiter behavior, hidden TODO/FIXME/HACK, unjustified `any`/assertions, unsafe error logging, and unrelated refactors. UI Anti-Slop and visual verification: not applicable — no UI change.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused security middleware/shutdown tests.
- `bun run --cwd apps/api test`

### Build / Database / UI

Not applicable — API has no build script; no database or UI change.

### Anti-Slop

- Run Code Anti-Slop after implementation and again after fixes.

## 19. Completion Evidence

| Acceptance Criteria | Evidence |
| --- | --- |
| CORS/Helmet/body limit | Focused integration test output. |
| Rate limiting | Fake-timer/test-safe limiter test output proving request 101 is `429`. |
| Sanitized errors/request IDs | Focused test output with prohibited internals absent and correlation present. |
| Graceful shutdown | Focused server/resource close test output. |
| Regression/static | API test, lint, typecheck, and diff-check output. |
| Scope/hygiene | Code Anti-Slop, changed-file, secret, `git diff`, and `git status` review. |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture | `docs/ARCHITECTURE.md`; `AGENTS.md` backend/security rules |
| Security | `docs/SECURITY.md`; `AGENTS.md` security rules |
| Development | `docs/DEVELOPMENT.md` |
| Dependency | `be/02-environment-validation`, `be/06-logging-foundation` |
| Test IDs | Not applicable — project has no test-ID system. |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] Scope and acceptance criteria are satisfied without unrelated changes.
- [ ] CORS, limiter, Helmet, body-limit, error, request-ID, and shutdown tests pass.
- [ ] Code Anti-Slop passes; UI Anti-Slop and visual verification are not applicable.
- [ ] Lint, typecheck, full applicable tests, and `git diff --check` pass.
- [ ] Changed-file, secret-exposure, `git diff`, and `git status` reviews are complete.
- [ ] No auth/JWT/RBAC/session/distributed-limiter scope is added.
