# be/06-logging-foundation — Logging Foundation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/06-logging-foundation` |
| Batch | N/A |
| Owning Feature | N/A |
| Workstream | Backend |
| Task Category | Logging foundation |
| Repository/App | `apps/api` |
| Status | Ready: approved for implementation |
| Priority | Foundation execution order 6 |
| Suggested Size | Small — focused logging infrastructure and tests |
| Depends On | `be/02-environment-validation` |
| Blocks | `be/07-security-foundation` |
| Execution Order | 6 |

## 2. Outcome

Provide request-correlated Morgan HTTP access logging and Pino application/error logging for `apps/api`, with sensitive-field redaction, bounded disk logs, and safe degraded behavior when file logging fails.

## 3. Context

Follow `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DEVELOPMENT.md`, `apps/api/package.json`, `apps/api/src/config/env.ts`, and existing Express bootstrap conventions. Existing dependencies include `morgan`, `pino`, and `pino-http`; no logging module exists yet. `be/02-environment-validation` establishes validated configuration before infrastructure startup.

## 4. Dependencies

- Validated environment/configuration from `be/02-environment-validation`.
- Existing Bun, Express, Morgan, Pino, and Node-compatible filesystem capabilities.
- No external log collector, hosted destination, or compliance retention system.

## 5. In Scope

- Morgan HTTP access logging and Pino application/error logging.
- Repository request-ID correlation in meaningful logs.
- Sensitive-field redaction at logger boundaries.
- Terminal/stderr logging plus bounded disk logging.
- `10 MB` active-file rotation, timestamped distinct rotated files, `14 days` retention, and expired-file cleanup.
- Safe fallback behavior for file write/rotation failures.
- Focused tests and completion evidence for this foundation.

## 6. Out of Scope

- Audit-record implementation or mixing audit records into ordinary logs.
- ELK, Loki, OpenTelemetry, Fluentd, Winston, cloud shipping, or another observability stack.
- Login, sessions, JWTs, authorization, request-ID redesign, metrics, tracing, alerting, dashboards, or production retention/compliance policy.
- Environment variables for log rotation size or retention unless implementation inspection proves an existing project-compatible operational need.
- Application features unrelated to logging.

## 7. Existing Implementation

- `apps/api/package.json` — available dependencies and scripts.
- `apps/api/src/config/env.ts` — Zod environment validation.
- `apps/api/src/app.ts` and `apps/api/src/server.ts` — Express/bootstrap integration points.
- `apps/api/tests/app.test.ts` — existing API test style.
- `AGENTS.md` and `docs/` — architecture, security, development, and logging rules.

Expected paths are guidance. Implementation agent must inspect repository before finalizing files, transport destinations, and exact log names.

## 8. Implementation Requirements

- Use Morgan only for HTTP access logging. Use Pino only for application and error logging. Keep audit records separate.
- Correlate relevant logs with repository request ID. Include method, path, status, duration, and authenticated user ID only when safely available and meaningful.
- Configure logger-level redaction. Never rely only on callers omitting sensitive fields.
- Redact passwords, password hashes, access tokens, refresh tokens, sensitive JWT contents, authorization headers, credential/session cookies, private keys, secrets, and raw credentials.
- Initialize logging after validated configuration and before normal request handling relies on logging.
- Provide terminal/stderr logging and bounded disk destinations. Do not duplicate every event across destinations without purpose; preserve access versus application/error separation.
- Use existing dependencies and Bun/Node-compatible filesystem capability first. Add a dependency only if inspection proves no compatible existing/platform implementation can satisfy rotation and retention. Do not replace Morgan or Pino.
- Treat `10 MB` rotation size and `14 days` retention as internal initial foundation constants. Do not add log configuration variables unless existing environment conventions and operational need justify them. Any added variable must use `apps/api/src/config/env.ts`, explicit bounded validation, documented default, tests, and no secret value.
- Rotate before unbounded active-file growth. Rotated output must use distinct historical files and timestamp/date naming when supported. Remove files outside the 14-day retention window.
- Detect file transport and rotation failures. Report only sanitized operational detail through terminal/stderr fallback. Do not send transport-failure reports through failed file transport or create a recursion loop.
- When terminal/stderr remains safe and functional, file transport or rotation failure is degraded observability; API continues serving requests and does not claim file logging is healthy.
- When all required logger destinations fail during initialization and no safe operational logging path exists, fail startup deterministically and visibly with sanitized information.

## 9. Applicable Contracts

### Configuration Contract

No log-specific environment variable is required for initial implementation. Rotation and retention are internal constants unless inspection establishes a project-compatible need for configuration.

| Setting | Required | Value | Validation | Default | Secret |
| --- | --- | --- | --- | --- | --- |
| Active file rotation size | Yes | `10 MB` | Internal constant; positive bounded size | `10 MB` | No |
| Rotated file retention | Yes | `14 days` | Internal constant; positive bounded duration | `14 days` | No |

### API Contract

Not applicable — no API endpoint, request shape, response shape, status code, or OpenAPI contract changes.

### Database Contract

Not applicable — no schema, migration, or data changes.

### UI Contract

Not applicable — no UI change.

### Logging Contract

| Concern | Required behavior |
| --- | --- |
| Access logs | Morgan handles HTTP access records. |
| Application/error logs | Pino handles structured application and error records. |
| Correlation | Relevant records carry repository request ID; include safe request metadata where meaningful. |
| Sensitive data | Logger-boundary redaction prevents prohibited values from terminal and file output. |
| File growth | Active persisted file rotates at `10 MB`; rotated history is distinct and timestamp/date identifiable when supported. |
| Retention | Cleanup removes rotated files older than `14 days`; no indefinite local retention. |
| Failure mode | File failure reports sanitized degraded state through safe fallback without recursion; all-destination initialization failure stops startup. |

## 10. File Impact

**Expected Create**

- Focused logger/transport module and focused logging tests at paths discovered from existing `apps/api/src` and `apps/api/tests` conventions.

**Expected Modify**

- `apps/api/src/app.ts` and/or `apps/api/src/server.ts` only where bootstrap/middleware integration requires it.
- `apps/api/src/config/env.ts` only if configuration is proven necessary under section 8.

**Expected Not Modified**

- Database schema/migrations, API contracts, frontend, authentication/authorization modules, unrelated configuration, or dependencies without demonstrated need.

## 11. Runtime Behavior

1. Load and validate existing configuration.
2. Initialize request correlation and terminal/stderr logging.
3. Initialize Pino application/error logger and bounded file destinations.
4. Register Morgan access logging with request correlation.
5. Start normal API handling only after a safe logger path exists.
6. On normal file growth, rotate active output at `10 MB`, retain distinct rotated files for `14 days`, then clean expired files.
7. On file transport/rotation failure, emit sanitized degraded-state notice through fallback terminal/stderr logging and continue requests if fallback remains usable.
8. On total logging initialization failure with no safe fallback, stop startup deterministically without exposing sensitive data.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Logging initializes normally | Terminal and bounded file logging become available. | Access and application/error streams remain purposefully separated. |
| File reaches rotation threshold | Active file remains bounded; distinct historical file is created. | Use `10 MB` production policy; tests use smaller injected threshold. |
| Retention cleanup runs | Files older than `14 days` are removed. | Do not remove unrelated files or retain expired rotations indefinitely. |
| File transport becomes unavailable | Sanitized degraded-state error reaches terminal/stderr; API remains healthy when fallback works. | Do not swallow failure or claim healthy file logging. |
| Rotation operation fails | Sanitized failure is visible through fallback. | Prevent recursive failure logging through failed transport. |
| All logger destinations fail during initialization | Startup fails deterministically and visibly. | Error contains no secrets or log payload. |
| Sensitive value reaches logger input | Value is redacted; never persisted or printed. | Applies to protected fields in section 8. |
| Request is logged | Correlation is present where applicable. | Include user ID only when safely available. |
| Existing API behavior | No unrelated regression. | Preserve existing responses and middleware behavior. |

## 13. Security Requirements

- Apply redaction before terminal or file transport output.
- Never log prohibited credentials, secret material, or sensitive JWT content.
- Sanitize logger initialization, file transport, and rotation failure messages.
- Do not weaken existing Helmet, CORS, rate limiting, body limits, startup validation, request IDs, or error behavior.
- Keep audit records separate from ordinary access and application logs.

## 14. Test Requirements

### Happy Path

- Prove request-correlated Morgan access logging and Pino application/error logging.
- Prove access and application/error logs remain separate.
- Prove active-file rotation and 14-day retention cleanup.

### Validation

- Prove redaction for protected fields and no leakage in normal or error paths.
- Prove request ID propagates to applicable logger output.

### Negative / Failure

- Prove file transport and rotation failures report sanitized degraded state through fallback without logging recursion.
- Prove complete logger initialization failure prevents startup when no safe destination exists.

### Regression

- Prove existing API shell behavior remains functional.

### Isolation

- Use isolated temporary directories and deterministic cleanup for filesystem tests.
- Use a test-only injected/configured threshold smaller than `10 MB`; do not generate `10 MB` fixtures.
- Avoid slow or flaky timing-dependent filesystem tests.

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Request correlation | Relevant access/application record includes request ID. | Focused unit/integration |
| Sensitive-field input | Protected values are redacted from all outputs. | Focused unit |
| Logger separation | Morgan access and Pino application/error destinations are distinct by purpose. | Focused integration |
| Rotation threshold | Small injected test threshold rotates active output. | Filesystem integration |
| Retention cleanup | Expired rotated files are removed; in-window files remain. | Filesystem unit/integration |
| File transport failure | Sanitized fallback notice appears; API can continue with fallback. | Focused unit/integration |
| Total initialization failure | Startup rejects deterministically when no safe destination exists. | Focused unit/integration |
| Existing API | Existing route behavior remains passing. | Regression |

## 15. Task-Level Expected Results

- Request-correlated Morgan and Pino logging exists at documented API boundaries.
- Persisted logs have bounded rotation and retention behavior.
- File logging degrades safely; total logger initialization failure is fatal.
- Required focused tests and truthful completion evidence exist.
- No external observability framework or unrelated feature is added.

## 16. Acceptance Criteria

- [ ] Morgan handles HTTP access logging.
- [ ] Pino handles application and error logging.
- [ ] Relevant logs include repository request correlation.
- [ ] Sensitive values are redacted before terminal or file output.
- [ ] Active persisted logs follow a `10 MB` rotation policy.
- [ ] Rotated logs have distinct historical output and are retained for `14 days`.
- [ ] Cleanup removes expired rotated logs.
- [ ] File logging/rotation failure surfaces sanitized degraded state and API continues when safe terminal/stderr fallback remains.
- [ ] Total logger initialization failure without a safe fallback stops startup safely.
- [ ] Access, application/error, and audit-record concerns remain separate.
- [ ] No unrelated logging or observability framework is introduced.
- [ ] Focused tests demonstrate required behavior without large fixtures or flaky filesystem timing.
- [ ] Applicable Anti-Slop, lint, typecheck, tests, and `git diff --check` pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Reject speculative abstractions, duplicate transports, dead or unused dependencies, fake fallback behavior, hidden TODO/FIXME/HACK, unjustified `any` or assertions, misleading comments, and unrelated refactors. UI Anti-Slop and visual verification: not applicable — no UI change.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused logging tests for section 14.
- `bun run --cwd apps/api test`

### Build

Not applicable — `apps/api` has no build script; typecheck is required.

### Database / UI

Not applicable — no database or UI change.

### Anti-Slop

- Run Code Anti-Slop after implementation and again after any fix.

## 19. Completion Evidence

| Acceptance Criteria | Evidence |
| --- | --- |
| Access/app separation and correlation | Focused test output for Morgan/Pino destinations and request ID. |
| Redaction | Focused test output showing prohibited values absent from normal and failure paths. |
| Rotation and retention | Isolated filesystem test output using test threshold and aged fixture files. |
| Failure behavior | Focused tests for degraded fallback and fatal total initialization failure. |
| Regression | `bun run --cwd apps/api test` output. |
| Static correctness | `bun run --cwd apps/api lint` and `bun run --cwd apps/api typecheck` output. |
| Scope and hygiene | Code Anti-Slop evidence, `git diff --check`, `git diff`, and `git status` review. |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture | `docs/ARCHITECTURE.md`; `AGENTS.md` logging rules |
| Security | `docs/SECURITY.md`; `AGENTS.md` security rules |
| Development | `docs/DEVELOPMENT.md` |
| Dependency | `be/02-environment-validation` |
| Test IDs | Not applicable — project has no test-ID system. |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] Scope and acceptance criteria are satisfied without unrelated changes.
- [ ] Morgan/Pino, correlation, redaction, rotation, retention, and failure behavior have focused test evidence.
- [ ] Code Anti-Slop passes; UI Anti-Slop and visual verification are not applicable.
- [ ] Lint, typecheck, applicable tests, and `git diff --check` pass.
- [ ] Changed-file, secret-exposure, `git diff`, and `git status` reviews are complete.
- [ ] No dependency, external observability stack, API, database, or authentication scope was added without explicit approval.
