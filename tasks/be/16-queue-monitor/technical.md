# be/16-queue-monitor — Queue Monitor

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/16-queue-monitor` |
| Batch | N/A |
| Owning Feature | Queue operations |
| Workstream | Backend |
| Task Category | Operational monitor |
| Repository/App | `apps/api` |
| Status | Implemented — visual verification pending |
| Priority | Foundation execution order 16 |
| Suggested Size | Small — one protected third-party dashboard boundary |
| Depends On | `be/05-redis-foundation`, `be/07-security-foundation`, `be/13-rbac-permissions`, `be/15-bullmq-foundation` |
| Blocks | `be/17-openapi` |
| Execution Order | 16 |

## 2. Outcome

Mount a read-only Bull Board dashboard at `/ops/queues` for trusted operational users. It exposes only the application-owned `default` BullMQ queue and requires environment-backed HTTP Basic Auth before Bull Board receives a request.

## 3. Context

- `apps/api` uses Express `5.2.1`, BullMQ `5.81.5`, and Bun `1.4.0` from the current lockfile/runtime.
- `@bull-board/api` `9.10.1` supports BullMQ `^5.56.0`; `@bull-board/express` is the approved Express adapter. Resolve matching package versions at implementation time and add only required runtime packages.
- `apps/api/src/queue/index.ts` owns one initialized `default` queue and its lifecycle. `apps/api/src/app.ts` installs request ID, Helmet, CORS, JSON limits, and rate limiting before routes.
- `QUEUE_MONITOR_USERNAME` and `QUEUE_MONITOR_PASSWORD` already exist in `apps/api/src/config/env.ts`, but implementation must strengthen monitor-password validation to the approved minimum length.
- Existing auth/session/RBAC remains product identity infrastructure. This operational route deliberately uses separate environment credentials.

## 4. Dependencies

- `be/05` Redis configuration and initialization are implemented.
- `be/07` baseline security middleware is present in `apps/api/src/security/index.ts`; its task-status text is stale but the dependency capability exists.
- `be/13` RBAC exists but is deliberately not used by this route.
- `be/15` queue foundation is complete and exposes the explicit `default` queue.
- Required runtime packages: `@bull-board/api` and `@bull-board/express`. Do not install `@bull-board/ui` separately unless selected compatible package resolution explicitly requires a direct dependency.

## 5. In Scope

- Bull Board Express integration for the explicit `default` queue only.
- Exact mount path `/ops/queues`.
- Required environment credentials, HTTP Basic Auth guard, timing-resistant comparison, safe failure logging, and read-only Bull Board configuration.
- Startup wiring using the existing queue instance and focused route/configuration tests.
- Browser verification of the third-party dashboard when browser capability exists.

## 6. Out of Scope

- CMS navigation, customer-facing UI, public queue APIs, custom dashboard UI/theme, iframe, standalone monitor service, BullMQ Pro, or a second dashboard package.
- JWT/session/RBAC protection, audit-read capability, business queues/producers/processors, PostgreSQL migration, and OpenAPI business operation.
- Queue administration: add, retry, promote, delete, clean, pause/resume, or other mutation.
- CSRF middleware, custom scheduler, Prometheus/Grafana/SaaS monitoring, and `be/17` work.

## 7. Existing Implementation

- `apps/api/src/queue/index.ts`: initialized `default` Queue and shutdown owner.
- `apps/api/src/config/env.ts`: Zod environment boundary.
- `apps/api/src/app.ts`: global middleware order and routes.
- `apps/api/src/security/index.ts`: Helmet, exact-origin CORS, request body limits, rate limit, safe errors.
- `apps/api/src/logging/index.ts`: request IDs and Pino redaction.
- `apps/api/src/server.ts`: Redis/queue startup and shared shutdown.
- `apps/api/tests/env.test.ts`, `security.test.ts`, and `bullmq-foundation.test.ts`: adjacent conventions.

Expected paths are guidance; inspect repository before finalizing implementation.

## 8. Implementation Requirements

- Add `@bull-board/api` and `@bull-board/express` only after confirming their selected versions remain compatible with locked Express, BullMQ, and Bun versions.
- Create one focused queue-monitor module. It receives the existing Queue and logger; it never creates a second Redis client, Queue, Worker, or lifecycle owner.
- Construct exactly one `BullMQAdapter` for `DEFAULT_QUEUE_NAME`; never auto-discover Redis keys or queues from unrelated applications.
- Configure Bull Board's Express adapter base path as `/ops/queues` and mount it at the same path.
- Configure the BullMQ adapter/dashboard with its supported server-side read-only option. CSS hiding is insufficient.
- Basic Auth middleware runs after global security middleware and before the Bull Board router:
  `request → request ID/Helmet/CORS/body limit/rate limit → Basic Auth → Bull Board router`.
- Require `QUEUE_MONITOR_USERNAME` non-empty and `QUEUE_MONITOR_PASSWORD` non-empty with minimum length `16`. No defaults. Update `.env.example` only with a non-secret placeholder that satisfies validation.
- Parse only valid `Authorization: Basic <base64(username:password)>` input. Missing, malformed, wrong-user, and wrong-password paths all return the same `401` with `WWW-Authenticate: Basic realm="Queue Monitor"`.
- Compare supplied username/password with Node's timing-resistant primitive when lengths match; never use plain equality as the credential decision.
- Log authentication failure at most once per failed monitor request using safe metadata only: request ID, path, status, and source IP where current logging policy permits. Never log Basic/Auth headers, credentials, request headers, queue payloads, or errors containing them.
- Do not require JWT, session, permission, or RBAC state. Dedicated environment credentials are mandatory in every environment where this API runs.
- Keep existing Helmet and CORS behavior. Do not add wildcard CORS, monitor-specific cross-origin credentials, or global CSP weakening. Apply a narrow path-specific Helmet adjustment only if browser verification proves one is required.
- Read-only means no intentional mutating monitor operation exists. Therefore CSRF middleware is not required for this task. A future mutation task must explicitly add CSRF, stronger authorization, audit, and operation-level policy.
- Initialization failure is required-capability failure: close partial monitor resources if applicable and fail startup with a sanitized error. Do not start a false-ready API.
- Bull Board router responses remain its own HTML/CSS/JS responses. Do not wrap them in the API JSON envelope or treat their internal assets/API as stable product API.

## 9. Applicable Contracts

### Configuration Contract

| Variable | Required | Type | Validation | Default | Secret |
| --- | --- | --- | --- | --- | --- |
| `QUEUE_MONITOR_USERNAME` | Yes | string | trimmed, non-empty | None — startup fails | Yes |
| `QUEUE_MONITOR_PASSWORD` | Yes | string | trimmed, minimum 16 characters | None — startup fails | Yes |

### API Contract

| Method / path | Authentication | Audience | Response | Status |
| --- | --- | --- | --- | --- |
| `GET` and Bull Board assets under `/ops/queues` | HTTP Basic Auth from queue-monitor environment credentials | Trusted developers/operators only | Bull Board HTML/CSS/JS/dashboard responses; no API envelope | `200`, `401`, sanitized `5xx` |

- `401` includes `WWW-Authenticate: Basic realm="Queue Monitor"` and exposes no credential detail.
- This is not a public JSON API or an OpenAPI business operation.

### Database Contract

Not applicable — no PostgreSQL schema, data change, or migration.

### UI Contract

Not applicable — embedded third-party operational UI only. Do not redesign or add custom CSS.

## 10. File Impact

### Expected Create

- `apps/api/src/queue/monitor.ts` focused Bull Board and Basic Auth boundary.
- `apps/api/tests/queue-monitor.test.ts`.

### Expected Modify

- `apps/api/package.json` and lockfile for approved runtime packages.
- `apps/api/src/config/env.ts`, `apps/api/.env.example`, and `apps/api/tests/env.test.ts` for monitor credential validation.
- `apps/api/src/app.ts` and `apps/api/src/server.ts` for explicit monitor mounting with existing queue instance.
- Relevant security/architecture documentation only when implementation evidence changes it.

### Expected Not Modified

- Redis contract/client, queue foundation lifecycle, workers/processors, auth/session/RBAC behavior, database schema/migrations, CMS, normal public OpenAPI operations, and `be/17` files.

## 11. Runtime Behavior

1. Load and validate environment, including required monitor credentials.
2. Initialize database, Redis, and existing BullMQ foundation queue.
3. Create one read-only BullMQ adapter for that Queue.
4. Create Bull Board Express adapter with base path `/ops/queues`.
5. Build Basic Auth guard with validated credentials and mount guard before router.
6. Start API only after monitor initialization succeeds.
7. Authorized operational request reaches read-only Bull Board; missing/invalid credentials receive generic Basic challenge before dashboard content.
8. Shutdown remains owned by existing queue/Redis lifecycle; monitor does not close shared resources.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Missing/empty monitor username or password | Sanitized startup config failure | Never print value |
| Password shorter than 16 characters | Sanitized startup config failure | Update secret, restart |
| Missing/malformed Basic header | `401` plus fixed challenge | No router access, no parsing detail |
| Wrong username/password | Generic `401` plus fixed challenge | Timing-resistant comparison; no identity hint |
| BullMQ/Redis/monitor initialization fails | Sanitized startup failure | No false-ready API; close partial monitor resource if needed |
| Read-only mutation attempt | Unavailable/rejected by Bull Board read-only configuration | No queue state change |
| Cross-origin monitor request | Existing exact CORS behavior only | No wildcard or credentials relaxation |
| Dashboard asset/CSP failure | Diagnose exact issue, use narrow path adjustment only if necessary | Never disable Helmet globally |
| Runtime dashboard failure | Sanitized `5xx` handling | Never leak environment credentials or payloads |

## 13. Security Requirements

- Operational dashboard is never public by default: Basic Auth protects every monitor request in every environment.
- Basic credentials live only in validated environment; never hard-code, commit, return, or log them.
- Node timing-resistant comparison applies to parsed supplied credentials.
- Read-only server-side configuration disables queue mutation; no CSRF middleware is needed while no mutating operation exists.
- Existing Helmet, request IDs, body limit, rate limit, CORS, error handling, and logging stay active.
- Monitor may show BullMQ job data. Future producers must not enqueue secrets, credentials, raw tokens, or sensitive payloads.
- Monitor does not expose unrelated Redis queues or claim Bull Board internals as public API.

## 14. Test Requirements

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| No/malformed Basic header | `401` plus fixed Basic challenge | Focused route |
| Wrong username/password | Generic `401`; no credential leakage | Focused route/security |
| Correct credentials | `/ops/queues` dashboard/router reaches authorized response | Focused route/integration |
| Exact path | Mounted at `/ops/queues`, not `/` or a business route | Focused route |
| Read-only configuration | Actual Bull Board/BullMQ adapter read-only option asserted; mutation unavailable/rejected where integration permits | Focused integration |
| Queue scope | `default` registered; unrelated Redis queue not registered | Unit/integration |
| Environment | Missing/empty/short username/password rejects; valid values pass | Unit |
| Global security | Helmet/CORS/rate-limit behavior remains; no wildcard CORS | Regression |
| Logging | Failed auth logs omit Basic/Auth headers and credentials | Focused security |
| Regression | Existing BullMQ/API/security tests still pass | Full suite |

- Use synthetic credentials and isolated Redis keys/database only.
- Do not snapshot Bull Board internal HTML or assert its undocumented internal API format.
- Browser verification is required when browser capability exists: authenticate, load `/ops/queues`, see `default`, verify assets/CSP work, and verify read-only behavior. Otherwise report `Visual verification: NOT RUN — <reason>`.

## 15. Task-Level Expected Results

- One protected, read-only operational queue monitor exists at `/ops/queues`.
- Only the explicit `default` queue is registered.
- Missing/invalid credentials never reach Bull Board and return a generic Basic challenge.
- Existing public API, database, queue lifecycle, and product authentication stay unchanged.

## 16. Acceptance Criteria

- [ ] Uses `@bull-board/api` and `@bull-board/express`; no duplicate monitor package exists.
- [ ] Mounts exactly at `/ops/queues`.
- [ ] Targets trusted internal developers/operators only.
- [ ] Requires environment-backed HTTP Basic Auth on every request.
- [ ] Credentials validate at startup and never appear in logs/errors/responses.
- [ ] Uses timing-resistant credential comparison where lengths permit it.
- [ ] Registers only explicit `default` queue adapter.
- [ ] Uses supported server-side read-only configuration; queue mutation is unavailable.
- [ ] Does not add CSRF middleware because monitor mutations are disabled; future mutation requires explicit CSRF/auth/audit contract.
- [ ] Does not add permissive CORS or weaken global Helmet/security middleware.
- [ ] Adds no JWT/RBAC requirement, public OpenAPI operation, CMS UI, database migration, business queue, or queue lifecycle duplicate.
- [ ] Focused tests, browser verification when available, lint, typecheck, Code Anti-Slop, and diff check pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Reject custom dashboard recreation, redundant dashboard packages, custom CSS/theme, fake queue data, generic monitor abstraction, duplicate Redis/BullMQ clients, weak authentication, credential/header logging, global Helmet/CORS weakening, hidden TODO/FIXME/HACK, unchecked `any`/assertions, and enabled mutation despite read-only contract.

UI Anti-Slop: not applicable — no custom UI design. Browser verification remains required for third-party dashboard correctness when available.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api format:check`
- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused queue-monitor auth/path/read-only/configuration tests.
- Full `bun run --cwd apps/api test` regression suite.

### Redis / Browser

- Isolated Redis queue integration when required to prove adapter scope/read-only behavior.
- Browser verification against local protected monitor when browser capability exists.

### Build / Database

Not applicable — no API build script and no PostgreSQL migration.

### Anti-Slop

- Code Anti-Slop during implementation and after fixes.

## 19. Completion Evidence

| Acceptance criterion | Evidence |
| --- | --- |
| Package/runtime compatibility | `package.json`/lockfile review and install output against current Express/BullMQ/Bun |
| Basic Auth/path/credential safety | Focused route/environment/security tests |
| Read-only and explicit queue | Adapter configuration test plus Redis integration where supported |
| Global security/no public API | App/security/OpenAPI changed-file review |
| Browser dashboard correctness | Browser screenshot/inspection, or explicit `NOT RUN` reason |
| Quality gates | Prettier, ESLint, TypeScript, Jest, Code Anti-Slop, diff check |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture | `docs/ARCHITECTURE.md` Redis/BullMQ transport and backend boundaries |
| Security | `docs/SECURITY.md`, `AGENTS.md`, `be/07-security-foundation` |
| Queue dependency | `be/15-bullmq-foundation`, `apps/api/src/queue/index.ts` |
| Package compatibility | Locked Express `5.2.1`, BullMQ `5.81.5`, Bun `1.4.0`; Bull Board package resolution at implementation |
| API | `/ops/queues` operational route; excluded from public OpenAPI |
| Database | Not applicable — no schema change |
| Test IDs | Not applicable — project has no test-ID system |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] Approved scope and acceptance criteria implemented without monitor mutation or successor behavior.
- [ ] Environment credential validation and Basic Auth protect `/ops/queues` before Bull Board router.
- [ ] Explicit `default` queue is read-only; no extra queue client/lifecycle owner exists.
- [ ] No public API/OpenAPI, CMS, database migration, JWT/RBAC, or permissive CORS change is added.
- [ ] Focused and regression tests pass.
- [ ] Browser verification passes when available, or is reported truthfully.
- [ ] Code Anti-Slop passes.
- [ ] Format, lint, typecheck, and `git diff --check` pass.
- [ ] Changed-file and secret review complete.
