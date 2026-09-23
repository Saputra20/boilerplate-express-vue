# be/18-health-readiness — Health And Readiness

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/18-health-readiness` |
| Batch | N/A |
| Owning Feature | Operational API foundation |
| Workstream | Backend |
| Task Category | Health and readiness |
| Repository/App | `apps/api` |
| Status | Ready — approved execution contract |
| Priority | Foundation execution order 18 |
| Suggested Size | Small — two bounded operational routes |
| Depends On | Database capability from `be/03`, Redis capability from `be/05`, safe middleware from `be/07`, OpenAPI registration from `be/17` |
| Blocks | `be/19-backend-testing` |
| Execution Order | 18 |

## 2. Outcome

Add public `GET /health` liveness and public `GET /ready` dependency readiness endpoints. Liveness always reports only process responsiveness. Readiness concurrently probes PostgreSQL and Redis with a two-second bound and returns a minimal `503` response if either required dependency fails.

## 3. Context

- `apps/api/src/app.ts` installs request IDs, Helmet, CORS, JSON limits, and rate limiting before routes.
- `apps/api/src/database/client.ts` owns the PostgreSQL pool/Drizzle client; a readiness probe must use a trivial `SELECT 1` only.
- `apps/api/src/redis/client.ts` exposes the initialized ioredis client; a readiness probe must use `PING` only.
- `apps/api/src/openapi/index.ts` owns explicit module contributions and public OpenAPI endpoints.
- `/ops/queues` remains a separate Basic-Auth operational dashboard and is not a health/readiness route.

## 4. Dependencies

- Current repository code contains database and Redis clients despite stale predecessor task-status text.
- Existing security middleware, logging, and OpenAPI foundation are reused; no new infrastructure, dependency, environment value, or server is added.
- BullMQ has no separate readiness probe because it uses the approved Redis transport and `be/15` defines no independent required worker service.

## 5. In Scope

- Distinct `GET /health` and `GET /ready` routes.
- Minimal public JSON response contracts and direct deterministic readiness failure handling.
- Concurrent PostgreSQL/Redis probes, each bounded to `2000` ms.
- Scoped exemption from client/API abuse rate limiting for these infrastructure probes while retaining Helmet, request IDs, CORS, logging, and safe error handling.
- Health OpenAPI contribution, focused tests, and documentation updates.

## 6. Out of Scope

- Kubernetes/Docker health configuration, metrics, Prometheus, Grafana, latency telemetry, version/build diagnostics, queue/worker health, migration status, business/downstream probes, and CMS UI.
- New configuration variables, dependency registry/framework, additional Redis/database clients, probe writes, and database migrations.
- JWT/RBAC/Basic Auth requirements, special CORS, or detailed public dependency diagnostics.

## 7. Existing Implementation

- `apps/api/src/app.ts`: route and middleware order.
- `apps/api/src/security/index.ts`: current global rate limiter, Helmet, CORS, request-body limit, safe error handler.
- `apps/api/src/database/client.ts`: PostgreSQL client lifecycle.
- `apps/api/src/redis/client.ts`: ioredis lifecycle and PING capability.
- `apps/api/src/logging/index.ts`: request IDs and Pino logger.
- `apps/api/src/openapi/index.ts` and `apps/api/src/auth/openapi.ts`: explicit OpenAPI contribution convention.
- `apps/api/tests/security.test.ts`, `openapi.test.ts`, `database.test.ts`, and `redis.test.ts`: adjacent test patterns.

Expected paths are guidance; inspect repository before implementation.

## 8. Implementation Requirements

- Add `GET /health` with no dependency probe. It responds `200` with exactly `{ "status": "ok" }` and `application/json`.
- Add `GET /ready` with concurrent PostgreSQL and Redis probes. It responds `200` with exactly `{ "status": "ready" }` only when both succeed.
- If either readiness probe rejects, throws, returns an unexpected Redis result, or exceeds its individual `2000` ms timeout, respond `503` with exactly `{ "status": "not_ready" }`.
- PostgreSQL probe: a trivial query equivalent to `SELECT 1` through the existing client. No migration, table inspection, business query, or write.
- Redis probe: existing client `PING`, accepting library-equivalent `PONG`. No key write, scan, BullMQ inspection, or metadata read.
- Start both probes before awaiting either. Do not serialize independent dependency checks.
- Timeout rejection must not cause an unhandled late-probe rejection. Ignore/cancel late completion safely according to client/runtime capability.
- Route expected dependency failure directly to the approved `503` body. Unexpected programming failures continue to centralized sanitized error handling.
- Log readiness failure once per request with safe request ID, dependency category (`database` or `redis`), and failure class (`timeout` or `operational`). Never log URI, host, port, username, password, raw error, stack, or secret.
- Exempt exactly `/health` and `/ready` from the global API rate limiter. Do not weaken Helmet, request IDs, safe logging, body limits, CORS, or centralized errors; do not add permissive CORS.
- Register a `Health` OpenAPI contribution beside the health route. It documents public `/health` `200`, public `/ready` `200`, and `/ready` `503`; no bearer security and no dependency-specific error fields.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — `2000` ms is a code-level foundation constant. Do not add `HEALTH_TIMEOUT`, `READINESS_TIMEOUT`, `HEALTH_ENABLED`, or `READINESS_ENABLED`.

### API Contract

| Method / path | Authentication | Request | Success | Failure |
| --- | --- | --- | --- | --- |
| `GET /health` | None | No body or query | `200` `{ "status": "ok" }` | Centralized sanitized error only for unexpected programming failure |
| `GET /ready` | None | No body or query | `200` `{ "status": "ready" }` | `503` `{ "status": "not_ready" }` for expected dependency failure/timeout |

- Both endpoints are public operational endpoints for orchestration, load balancers, uptime checks, and operator tooling.
- Neither endpoint requires JWT, session, RBAC permission, or queue-monitor Basic Auth.
- Public responses never include dependency state, error text, hostnames, ports, credentials, topology, uptime, memory, PID, build/version, or environment.

### Database Contract

Not applicable — no PostgreSQL schema, data change, or migration. The readiness query is read-only and trivial.

### UI Contract

Not applicable — JSON operational endpoints; browser verification is not required.

## 10. File Impact

### Expected Create

- `apps/api/src/health/index.ts`
- `apps/api/src/health/openapi.ts`
- `apps/api/tests/health-readiness.test.ts`

### Expected Modify

- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/security/index.ts`
- `apps/api/src/openapi/index.ts`
- `docs/API.md`
- `tasks/be/18-health-readiness/technical.md`
- `tasks/be/18-health-readiness/explanation.md`

### Expected Not Modified

- Database schema/migrations, database/Redis connection configuration, auth/session/RBAC behavior, queue monitor, BullMQ lifecycle, CMS, and successor tasks.

## 11. Runtime Behavior

### Health

`request → standard safe middleware except rate-limit exemption → liveness handler → 200 { status: "ok" }`

### Ready

`request → standard safe middleware except rate-limit exemption → start PostgreSQL SELECT 1 and Redis PING concurrently with 2000 ms bound → both pass: 200 { status: "ready" } → any failure/timeout: safe log + 503 { status: "not_ready" }`

Once the process runs, `/health` remains independent of current PostgreSQL/Redis state. `/ready` reflects current probe state. Existing startup failure behavior for unavailable required initialization remains unchanged.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| PostgreSQL probe fails; Redis succeeds | `503` `{ "status": "not_ready" }` | Safe database-category log; no DB detail public |
| Redis probe fails; PostgreSQL succeeds | `503` `{ "status": "not_ready" }` | Safe Redis-category log; no Redis detail public |
| Both probes fail | One deterministic `503` body | Log safe categories; no raw errors |
| Either probe exceeds 2000 ms | `503` body | Late completion cannot change sent response or create unhandled rejection |
| `/health` during dependency outage | `200` `{ "status": "ok" }` | No dependency probe occurs |
| Probe route has no auth | Public response works | Product auth remains unchanged for other routes |
| Normal API rate limit exhausted | `/health` and `/ready` remain exempt | All other security middleware stays applied |

## 13. Security Requirements

- Public operational access does not authorize product behavior and uses minimal static status payloads only.
- Preserve Helmet, request IDs, safe application/access logging, no-wildcard CORS policy, body limit, and centralized error handling.
- Exempt only exact health/readiness paths from the normal global API rate limiter. Do not create a permissive secondary server or rate-limit bypass for other routes.
- Bound each probe to `2000` ms and never write/read business data, scan Redis, or reveal connection details.
- No JWT/RBAC/Basic Auth or CSRF change is needed because these endpoints are public, stateless GET probes.

## 14. Test Requirements

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Health success | Exact `200` `{ status: "ok" }`, no auth | Integration |
| Health isolation | DB/Redis probe doubles would fail, but health still succeeds and calls neither | Unit/integration |
| Readiness success | Concurrent DB/Redis success produces exact `200` ready body | Integration |
| Database failure | `503` exact not-ready body; no DB detail | Integration |
| Redis failure | `503` exact not-ready body; no Redis detail | Integration |
| Both failure | Deterministic `503` minimal body | Integration |
| Timeout | Either probe exceeding `2000` ms produces `503` without real repeated two-second sleeps | Unit with injected probes/fake timers |
| Concurrency | Both probes begin before either resolves; no brittle elapsed-time assertion | Unit |
| Rate limit | Health/readiness exempt; normal API route remains rate limited | Integration |
| OpenAPI | Health routes public, health `200`, ready `200`/`503`, no `/ops/queues` leak | Unit/integration |
| Security/regression | No secret/log leak; existing API, OpenAPI, and queue-monitor tests pass | Full Jest |

- Tests use injected probe functions/doubles, temporary logging directories, deterministic cleanup, and no live production dependency/credential.

## 15. Task-Level Expected Results

- Process liveness stays available independently of dependency outages.
- Dependency readiness is bounded, concurrent, minimal, and safe.
- Infrastructure probes work without product auth and without normal API rate-limit interference.
- OpenAPI documents the operational API routes but retains queue-monitor exclusion.

## 16. Acceptance Criteria

- [ ] `GET /health` and `GET /ready` exist as separate public routes.
- [ ] Neither route requires JWT, RBAC, session, or Basic Auth.
- [ ] `/health` returns exactly `200` `{ "status": "ok" }` and never probes PostgreSQL/Redis.
- [ ] `/ready` concurrently probes PostgreSQL `SELECT 1` and Redis `PING` with exactly `2000` ms per-probe timeout.
- [ ] Both readiness probes passing returns exactly `200` `{ "status": "ready" }`.
- [ ] Any probe failure or timeout returns exactly `503` `{ "status": "not_ready" }`.
- [ ] Public payloads/logs expose no dependency internals, credentials, stack, or topology.
- [ ] Health/readiness are exempt from only the normal global API rate limiter; other security middleware remains intact.
- [ ] OpenAPI documents public health/readiness and keeps `/ops/queues` absent.
- [ ] No dependency write, environment variable, additional client, migration, or unrelated operational capability is added.
- [ ] Focused tests, full Jest, format, lint, typecheck, Code Anti-Slop, and diff check pass.

## 17. Anti-Slop Requirements

- Code Anti-Slop: required. Reject a generic health framework/registry, fake probes, write probes, verbose diagnostic payloads, env knobs, extra clients, all-infrastructure probing, readiness-coupled liveness, hidden TODO/FIXME/HACK, `any`, and unrelated refactors.
- UI Anti-Slop: not applicable — no UI change.
- Visual Verification: not applicable — JSON operational endpoints only.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api format:check`
- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused `apps/api/tests/health-readiness.test.ts`.
- `bun run --cwd apps/api test -- --detectOpenHandles`.

### Build / Database / UI

Not applicable — no build script, migration, or meaningful UI.

### Anti-Slop

- Code Anti-Slop during implementation and after fixes.

## 19. Completion Evidence

| Acceptance criterion | Evidence |
| --- | --- |
| Separate health/readiness semantics | Focused route/probe tests |
| Timeout/concurrency/rate-limit policy | Focused injected-probe and middleware tests |
| Minimal payload/security | Focused response/log assertions and changed-file review |
| OpenAPI coverage | Focused OpenAPI assertion |
| Regression | Full Jest output |
| Static correctness | Prettier, ESLint, TypeScript output |
| Scope hygiene | Code Anti-Slop, diff check, diff/status, and secret review |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture | `docs/ARCHITECTURE.md`; `AGENTS.md` backend boundaries |
| API | `docs/API.md`; `be/17-openapi` |
| Security | `docs/SECURITY.md`; `be/07-security-foundation` |
| Dependencies | `be/03-database-foundation`; `be/05-redis-foundation` |
| Database | Not applicable — no schema change |
| Test IDs | Not applicable — project has no test-ID system |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] Approved scope and acceptance criteria implemented without successor work.
- [ ] Public liveness/readiness routes use exact approved bodies/statuses and no auth.
- [ ] Readiness uses only concurrent bounded PostgreSQL/Redis read probes; liveness uses none.
- [ ] Security, rate-limit exemption, logs, OpenAPI, and queue-monitor separation are verified.
- [ ] No migration, env knob, extra client, business route, or diagnostic payload is added.
- [ ] Focused/full tests, format, lint, typecheck, Code Anti-Slop, and diff check pass.
- [ ] Changed-file, secret, and human reviews complete.
