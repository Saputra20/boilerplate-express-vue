# be/15-bullmq-foundation — BullMQ Foundation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/15-bullmq-foundation` |
| Batch | N/A |
| Owning Feature | Queue foundation |
| Workstream | Backend |
| Task Category | Redis / worker infrastructure |
| Repository/App | `apps/api` |
| Status | Complete — validation evidence recorded below |
| Priority | Foundation execution order 15 |
| Suggested Size | Small — one queue infrastructure boundary |
| Depends On | `be/05-redis-foundation`, `be/06-logging-foundation` |
| Blocks | `be/16-queue-monitor` |
| Execution Order | 15 |

## 2. Outcome

Create BullMQ infrastructure over existing Redis: one reusable `default` queue, worker registration support, bounded retry/retention defaults, sanitized queue failure logging, and graceful shutdown. No business job is created.

## 3. Context

`apps/api` already depends on BullMQ `5.81.5` and ioredis. Redis configuration/lifecycle lives in `apps/api/src/redis/`; server startup initializes Redis before the HTTP server and shutdown closes it. No queue or worker code currently exists. See `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, `docs/SECURITY.md`, and completed Redis/logging foundations.

## 4. Dependencies

- Reuse validated Redis environment and lifecycle from `be/05`; do not add queue-specific environment variables.
- Reuse request-correlated/sanitized Pino conventions from `be/06`.
- BullMQ `5.81.5` is already installed. Use its installed API; add no dependency.
- Redis must be reachable before required queue infrastructure reports ready.

## 5. In Scope

- One centralized foundation queue constant: `default`.
- Queue creation, optional explicit worker registration, lifecycle close support, and safe event logging.
- Default job options: exactly three total attempts, exponential backoff beginning at 1000 ms, `removeOnComplete: true`, and failed-job age retention of seven days.
- Lazy failed-job cleanup documentation and focused tests using synthetic job names/payloads.
- Server startup/shutdown integration only when queue infrastructure is required by the running API process.

## 6. Out of Scope

- Business queues, producers, processors, job names, payload schemas, recurring jobs, scheduling, and queue-specific concurrency tuning.
- Queue monitor/dashboard/API; `be/16` owns it.
- Public enqueue/test HTTP endpoints, PostgreSQL schema/migrations, generic job CRUD, and dead-letter workflows.
- Exact cleanup scheduler, cron, repeatable job, Job Scheduler, QueueScheduler, timer loop, `clean()` loop, or cleanup worker.

## 7. Existing Implementation

- `apps/api/src/redis/config.ts` and `client.ts`: validated Redis configuration and initialized ioredis client.
- `apps/api/src/server.ts`: startup order and shared shutdown call.
- `apps/api/src/shutdown.ts`: database/Redis/logging lifecycle boundary to extend minimally.
- `apps/api/src/logging/index.ts`: Pino redaction and request-correlated operational logging.
- No existing `Queue`, `Worker`, `QueueEvents`, producer, or processor module exists.

Expected paths are guidance; inspect repository before finalizing changes.

## 8. Implementation Requirements

- Centralize `DEFAULT_QUEUE_NAME = 'default'` in the queue infrastructure boundary. Do not scatter the literal.
- Build Queue/Worker connections from the existing validated Redis configuration. Do not reuse a connected ioredis instance if BullMQ requires dedicated connection options/resources; follow BullMQ `5.81.5` requirements.
- Default queue options are exact:
  - `attempts: 3` means first attempt plus at most two retries.
  - `backoff: { type: 'exponential', delay: 1000 }`.
  - `removeOnComplete: true`.
  - `removeOnFail: { age: 7 * 24 * 60 * 60 }` using one named constant for retention seconds.
- Future producer tasks may override attempts/backoff only with an approved task-level reason. Foundation code must not provide hidden arbitrary overrides.
- Do not create fake production processors or job names. Worker creation accepts an explicit processor supplied by an owning capability.
- Unsupported job name at an explicit worker dispatch boundary must fail deterministically, never complete silently.
- Use BullMQ default worker concurrency. Do not set a production number without an owning workload contract.
- Create only useful listeners: worker error and failed-job events. Log queue/job name, job ID, attempt count, and request ID only when supplied as safe context. Never log full job data or error objects that may expose payload/secrets.
- Queue readiness failure must fail startup safely when queue infrastructure is required. Do not report ready after failed initialization.
- Shutdown closes workers before queues and BullMQ-owned Redis resources. Reuse existing shutdown framework; helper modules never terminate the process.
- Failed-job retention is lazy BullMQ cleanup: seven days is an eligibility threshold, not an exact physical deletion time. Cleanup can occur after later queue activity.

## 9. Applicable Contracts

### Configuration Contract

No new environment variables. Queue name, retries, backoff, completion removal, and failed retention are internal approved constants. Redis uses existing `REDIS_*` configuration.

### API Contract

Not applicable — `be/15` exposes no public HTTP endpoint.

### Database Contract

Not applicable — BullMQ uses Redis; no PostgreSQL schema or migration is created.

### Queue Contract

| Item | Approved value |
| --- | --- |
| Foundation queue | `default` |
| Job names | Explicitly supplied by future producer tasks; no foundation production job name |
| Attempts | `3` total attempts |
| Backoff | Exponential, initial `1000 ms` |
| Completed jobs | `removeOnComplete: true` |
| Failed jobs | `removeOnFail.age = 604800` seconds |
| Cleanup | BullMQ lazy cleanup only; no exact scheduler |
| Worker concurrency | BullMQ default |

## 10. File Impact

### Expected Create

- `apps/api/src/queue/` focused constants/factory/lifecycle modules.
- `apps/api/tests/bullmq-foundation.test.ts`.

### Expected Modify

- `apps/api/src/server.ts` and `apps/api/src/shutdown.ts` only as needed for queue lifecycle.
- Relevant docs/rules when implementation evidence changes them.

### Expected Not Modified

- Redis configuration contract, auth modules, database schema/migrations, HTTP routes/OpenAPI, CMS, and `be/16` monitor code.

## 11. Runtime Behavior

1. Environment and Redis configuration validate through existing foundation.
2. Required process creates the centralized `default` Queue with approved defaults.
3. A worker exists only when an owning capability supplies its processor; no fallback processor accepts unknown jobs.
4. Failed execution retries up to three total attempts with exponential 1000 ms initial backoff.
5. Success removes completed job. Final failure remains in Redis until BullMQ later performs eligible lazy cleanup after seven days.
6. Shutdown stops workers, closes queues/BullMQ resources, then continues existing shutdown lifecycle. Failure is sanitized and produces no secret/payload dump.

## 12. Error And Edge Cases

| Scenario | Expected result | Security / recovery |
| --- | --- | --- |
| Redis unavailable during required initialization | Sanitized deterministic startup failure | No false-ready process |
| Queue creation fails | Sanitized initialization failure | Close partial BullMQ resources |
| Worker creation fails | Sanitized initialization failure | Close queue/resources |
| Job execution fails before final attempt | BullMQ retries under approved policy | Safe failure logging only |
| Final attempt fails | Job remains failed and age-retained | Lazy cleanup, no exact deletion claim |
| Unsupported job name | Deterministic failure | Never mark as completed |
| Repeated shutdown | Safe/idempotent close where BullMQ supports it | No process exit in helper |

## 13. Security Requirements

- Job payload is untrusted application data. Future producer owns typed schema; no global arbitrary-object payload contract.
- Pino logging omits passwords, Redis credentials, tokens, secrets, private keys, raw credentials, and full job payloads.
- Do not create a public enqueue endpoint or let client input declare trusted job names/payloads.
- Do not add scheduler resources solely to force exact retention timing.

## 14. Test Requirements

| Scenario | Expected result | Test type |
| --- | --- | --- |
| Queue initialization | Exactly one `default` queue, using Redis-derived connection | Unit/integration |
| Defaults | Attempts 3; exponential 1000 ms; completion removal; failed age 604800 | Unit |
| Retry behavior | Synthetic processor retries no more than three attempts; eventual success/final failure states | BullMQ integration with test-safe timing |
| Completion cleanup | Successful synthetic job follows `removeOnComplete` | BullMQ integration |
| Failed retention | Age-based setting is seven days | Unit/integration without seven-day wait |
| Lazy cleanup | No custom scheduler/cleanup loop exists; no exact deletion assertion | Code review/test |
| Shutdown | Worker and queue close safely, including repeat close where supported | Unit/integration |
| Security | Failure logs omit sensitive synthetic payload values and Redis credentials | Unit |
| Regression | Redis/logging/API suite remains passing | Full suite |

Tests use isolated Redis keys/database or an isolated Redis instance, synthetic job names, and deterministic cleanup. Do not sleep through real backoff delays.

## 15. Task-Level Expected Results

- One reusable BullMQ queue boundary exists with approved defaults.
- Worker lifecycle is available for future explicit processors without a fake production job.
- Queue failure/shutdown behavior is sanitized and testable.
- No HTTP endpoint, database migration, monitor, scheduler, business queue, or payload framework exists.

## 16. Acceptance Criteria

- [x] One foundation queue is named exactly `default`.
- [x] Queue name is centralized; no speculative business queue exists.
- [x] Default attempts equal three total attempts.
- [x] Default backoff is exponential with exactly 1000 ms initial delay.
- [x] `removeOnComplete` is true.
- [x] Failed-job retention age threshold is exactly seven days (`604800` seconds).
- [x] Documentation/tests state cleanup is lazy; no exact physical deletion at day seven is claimed.
- [x] No cleanup scheduler, cron, repeatable job, timer, or cleanup worker exists.
- [x] Existing Redis foundation/configuration is reused without new environment knobs.
- [x] Required startup/shutdown is graceful and does not falsely report readiness.
- [x] Queue logging omits secrets and full sensitive payloads.
- [x] No public HTTP queue endpoint or PostgreSQL migration is added.
- [x] `be/16` remains monitor owner.
- [x] Focused tests, full tests, format, lint, typecheck, Code Anti-Slop, and diff check pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: required during implementation and after fixes. Reject generic job/payload frameworks, business queues, fake processor, fallback unknown-job success, arbitrary concurrency/config knobs, second Redis contract, custom cleanup scheduler, QueueEvents without a use case, hidden TODO/FIXME/HACK, unchecked `any`/assertions, unused dependencies, and payload/secret logging. UI Anti-Slop and visual verification: not applicable — no UI.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api format:check`
- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused BullMQ defaults/lifecycle/retry/logging tests.
- Full `bun run --cwd apps/api test` regression suite.

### Redis

- Isolated Redis integration validation for synthetic job execution/cleanup where local infrastructure is available.

### Build / Database / UI

Not applicable — no build script, PostgreSQL migration, or UI work.

### Anti-Slop

- Code Anti-Slop during implementation and after fixes.

## 19. Completion Evidence

| Acceptance criterion | Evidence |
| --- | --- |
| Queue/default options | `tests/bullmq-foundation.test.ts` |
| Retry/completion/failed retention | `REDIS_INTEGRATION=true bun run --cwd apps/api test -- bullmq-foundation.test.ts --detectOpenHandles` against isolated Redis DB 15 |
| Lazy cleanup/no scheduler | Changed-file review and focused test |
| Lifecycle/logging | Focused shutdown and sanitization tests |
| No API/migration/business scope | Route/schema/dependency diff review |
| Quality gates | Prettier, ESLint, TypeScript, focused/full Jest, Redis evidence, Code Anti-Slop, diff check |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture | `docs/ARCHITECTURE.md` Redis/BullMQ transport and backend boundaries |
| Dependency tasks | `be/05-redis-foundation`, `be/06-logging-foundation` |
| Queue dependency | `apps/api/package.json` BullMQ `5.81.5` |
| Security | `docs/SECURITY.md`, `AGENTS.md` |
| Test IDs | Not applicable — no test-ID system |

## 21. Open Points

None.

## 22. Definition Of Done

- [x] Scope and acceptance criteria complete without successor behavior.
- [x] Queue defaults and lazy retention semantics are proven with isolated Redis evidence.
- [x] No business processor/queue, scheduler, monitor, HTTP endpoint, or database migration is added.
- [x] Focused and full tests pass.
- [x] Code Anti-Slop passes.
- [x] Format, lint, typecheck, and `git diff --check` pass.
- [x] Changed-file/secret review complete.
