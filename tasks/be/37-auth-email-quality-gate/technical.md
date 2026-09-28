# be/37-auth-email-quality-gate — Transactional Auth Email Quality Gate

## 1. Metadata

| Field           | Value                                                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID         | `be/37-auth-email-quality-gate`                                                                                                                                                   |
| Batch           | Authentication email infrastructure                                                                                                                                               |
| Owning Feature  | Authentication                                                                                                                                                                    |
| Workstream      | Backend                                                                                                                                                                           |
| Task Category   | Verification and scoped remediation                                                                                                                                               |
| Repository/App  | `apps/api`                                                                                                                                                                        |
| Status          | COMPLETE                                                                                                                                                                          |
| Priority        | High                                                                                                                                                                              |
| Suggested Size  | Small                                                                                                                                                                             |
| Depends On      | `be/31-email-foundation`, `be/32-email-template-foundation`, `be/33-email-queue-worker`, `be/34-email-verification`, `be/35-password-recovery`, `be/36-email-queue-observability` |
| Blocks          | None                                                                                                                                                                              |
| Execution Order | 37                                                                                                                                                                                |

## 2. Outcome

Produce final, reproducible evidence that the approved transactional-auth-email chain works safely from challenge request through asynchronous delivery, verification/reset consumption, queue inspection, shutdown, and failure handling.

## 3. Context

Tasks 31–36 introduce cross-cutting SMTP infrastructure, templates, a BullMQ worker, security challenges, auth flows, and queue visibility. This final task verifies their integration without inventing a new product capability or bypassing existing authentication, authorization, session, audit, or logging controls.

## 4. Dependencies

Predecessor implementations and approved contracts from tasks 31–36 are available for this gate. Their explicitly pending database, migration, Redis, monitor HTTP, and full-suite evidence is consumed and verified here; those task statuses must not be advanced unless this gate produces the required executable evidence. Local test PostgreSQL/Redis and loopback socket binding are mandatory. Use the existing fake `EmailTransport` or an approved local catcher. No live provider credentials or real recipients are required.

## 5. In Scope

- Run the predecessor tasks’ required static, integration, database, security, queue, and shutdown validations as one chain.
- Add narrowly scoped regression tests or fixes only when they close a discovered requirement gap within tasks 31–36.
- Review token secrecy, account-enumeration behavior, audit safety, worker lifecycle, queue retention, operational visibility, and documentation consistency.

## 6. Out of Scope

New email types, product features, new endpoints, provider migration, UI work, API redesign, RBAC changes, operational authentication changes, unrelated cleanup, and changes to approved password/session semantics.

## 7. Existing Implementation

Inspect all artifacts from tasks 31–36, `apps/api/src/server.ts`, shutdown/config/logging/queue code, relevant module OpenAPI contracts, test setup, Drizzle migrations, package scripts, `docs/DEVELOPMENT.md`, and current AGENTS governance before execution.

## 8. Implementation Requirements

- Verify only the approved final contracts; do not resolve predecessor open points by implementation guesswork.
- Run end-to-end integration with synthetic users and fake transport: request → persisted one-way challenge → opaque queued delivery → worker send → consume → approved audit/session result.
- Confirm unknown/deleted/disabled account paths retain generic responses where required.
- Confirm raw tokens, passwords, hashes, recipients, bodies, SMTP credentials, headers, provider payloads, and stacks are absent from schema plaintext, jobs, Queue Monitor, logs, audit records, public responses, and test snapshots.
- Verify startup validation and graceful shutdown close initialized queue/email resources in the approved order.
- Where a task adds migrations, run isolated UP, matching DOWN, and reapply validation using the repository-compatible rollback executor.
- Only minimal repairs that directly meet existing predecessor acceptance criteria are permitted; document each repair and re-run all affected evidence.

## 9. Applicable Contracts

### API Contract

No new contract. Verify that implemented verification/recovery endpoints exactly match their approved task-34/task-35 contracts and module OpenAPI documentation.

### Database Contract

No new schema. Verify approved challenge and any delivery model migrations, constraints, indexes, data safety, and matching DOWN operations.

### Configuration Contract

| Concept                   | Required  | Validation                              | Default                        | Secret           |
| ------------------------- | --------- | --------------------------------------- | ------------------------------ | ---------------- |
| Test SMTP/fake transport  | Test only | no real recipient/provider credential   | isolated test implementation   | credentials: N/A |
| Test PostgreSQL and Redis | Test only | repository documented isolated services | `docs/DEVELOPMENT.md` services | No               |

### UI Contract

Not applicable — no CMS or frontend screen is introduced. Queue Monitor inspection remains operational verification only.

## 10. File Impact

Expected modify: focused predecessor tests or implementation files only when a verified scoped defect exists. Expected create: integration/regression tests or evidence documentation only where existing tests cannot prove an approved requirement. Expected paths are guidance; do not add unrelated dependencies, environment files, or source roots.

## 11. Runtime Behavior

Isolated services start → email configuration uses fake/test transport → synthetic request creates safe state → opaque job is queued and processed → message rendering/send succeeds or fails safely → recipient flow consumes challenge → audit/session effects are asserted → resources shut down cleanly → protected monitor/log surfaces are inspected for leakage.

## 12. Error And Edge Cases

| Scenario                             | Expected Result                              | Security / Recovery                  |
| ------------------------------------ | -------------------------------------------- | ------------------------------------ |
| SMTP config invalid                  | sanitized startup failure                    | no credential values in output       |
| Provider transient/permanent failure | approved category, retry/retention behavior  | no content or provider stack exposed |
| Repeated/expired challenge use       | no duplicate account/password change         | lifecycle state remains consistent   |
| Queue/email shutdown during work     | approved close behavior, no hanging resource | test cleanup remains deterministic   |
| Migration rollback/reapply           | schema returns/reapplies safely              | isolated database only               |

## 13. Security Requirements

Review authentication, generic failures, rate limiting, one-way challenge storage, token secrecy, Argon2id handling, session/revocation approval boundaries, access controls, Pino/Morgan redaction, audit allowlists, Queue Monitor data, provider configuration, and no-secret repository diff. Production behavior must remain unchanged except for the explicitly approved capabilities.

## 14. Test Requirements

| Scenario                                 | Expected Result                                       | Test Type            |
| ---------------------------------------- | ----------------------------------------------------- | -------------------- |
| End-to-end verification delivery/consume | approved user state and audit result                  | integration          |
| End-to-end password recovery/reset       | approved password/session result                      | integration          |
| Enumeration and challenge replay         | generic response/no duplicate mutation                | integration/security |
| Secret/PII surface scan                  | no sensitive values in persisted/observable artifacts | regression/security  |
| Worker startup/shutdown and retry        | deterministic lifecycle and safe failures             | integration          |
| Migration UP/DOWN/reapply                | reversible entity changes                             | database             |

All tests use isolated databases, Redis, fake SMTP, and synthetic values.

## 15. Task-Level Expected Results

- Every predecessor acceptance criterion has current evidence.
- The integration chain has no sensitive-data leak or auth-policy regression.
- Any scoped defect found is fixed and revalidated, or reported as a blocker without inventing behavior.

## 16. Acceptance Criteria

- [ ] Tasks 31–36 have no unresolved approval-dependent open points.
- [ ] Required end-to-end verification and recovery tests pass with isolated dependencies.
- [ ] Required static checks, migrations, secret/PII checks, and lifecycle tests pass.
- [ ] Queue Monitor and logs expose only approved safe delivery metadata.
- [ ] No unrelated changes or new capability are introduced.

## 17. Anti-Slop Requirements

Code Anti-Slop is required across predecessor changes: check unnecessary abstractions, duplicated flows, dead dependencies, fake transport success, hidden TODO/FIXME/HACK, unsafe assertions, and secret-bearing test fixtures. UI Anti-Slop and visual verification are not applicable; no product UI is in scope.

## 18. Validation Requirements

- Static: applicable lint, typecheck, formatting, package build, `git diff --check`, and changed-file review.
- Automated tests: all predecessor focused tests plus integrated happy/failure/security regressions.
- Database: isolated migration UP/DOWN/reapply for each new migration.
- Runtime: startup, worker lifecycle, queue retry/monitor behavior, and graceful shutdown.
- Security: manual review of sensitive surfaces and production configuration boundaries.
- Anti-Slop: Code Anti-Slop pass, then rerun after any repair.

## 19. Completion Evidence

Environment gate was rechecked on 2026-09-27 before any application changes. No application code or predecessor implementation was changed for be/37.

| Requirement                                 | Status | Evidence                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test PostgreSQL available                   | PASS   | Started repository test profile with `docker compose --profile test up -d postgres-test redis-test`; `pg_isready -h 127.0.0.1 -p 5433 -t 2` reported accepting connections.                                                                                                                                         |
| Test Redis available                        | PASS   | Redis test profile returned `PONG` at `127.0.0.1:6380` using the documented test ACL credentials.                                                                                                                                                                                                                   |
| Local HTTP/socket bind available            | PASS   | Ephemeral Node loopback server bound successfully; Supertest suites executed.                                                                                                                                                                                                                                       |
| Test encryption and fake SMTP               | PASS   | Integration helpers supplied deterministic 32-byte keys; email transport is injected in-memory. No external email was sent.                                                                                                                                                                                         |
| PostgreSQL delivery/auth integration        | PASS   | `API_INTEGRATION=true bun run test -- tests/email-delivery-recipient-migration.integration.test.ts tests/email-delivery.integration.test.ts tests/email-verification.integration.test.ts tests/password-recovery.integration.test.ts --detectOpenHandles` passed within the focused run (9 total suites, 35 tests). |
| Migrations 0015–0017 UP/DOWN/RE-UP          | PASS   | Executed all three matching migration pairs against an isolated PostgreSQL schema; verified tables/columns and recipient nullability after each transition.                                                                                                                                                         |
| Migration 0018 UP/backfill/DOWN integrity   | PASS   | Recipient migration integration backfilled and decrypted existing synthetic recipients, removed plaintext storage, rejected DOWN, and confirmed schema/data remained intact. Reapply is N/A because DOWN is intentionally irreversible.                                                                             |
| Challenge-purpose migration UP/DOWN/RE-UP   | PASS   | Isolated PostgreSQL schema executed migration 0019 UP, verified both purposes, clean DOWN, verified restored constraint, guarded DOWN rejection with reset rows, then re-upped successfully.                                                                                                                        |
| Redis/BullMQ and Queue Monitor HTTP         | PASS   | Focused integration run covered Redis queue execution/retry/retention, worker lifecycle, authenticated/read-only monitor HTTP, and safe metadata assertions.                                                                                                                                                        |
| Auth verification/recovery HTTP and OpenAPI | PASS   | Focused integration run included `tests/queue-monitor.test.ts` and `tests/openapi.test.ts`; auth verification and recovery runtime contracts matched OpenAPI assertions.                                                                                                                                            |
| Full API suite                              | PASS   | `API_INTEGRATION=true bun run test -- --detectOpenHandles` passed: 39 suites, 229 tests. An initial run had one isolated 404/429 rate-limit assertion; the security file passed independently and the complete rerun passed.                                                                                        |
| Lint / typecheck / formatting               | PASS   | `bun run lint`, `bun run typecheck`, and `bun run format:check` passed from `apps/api`.                                                                                                                                                                                                                             |
| Package build                               | N/A    | `apps/api/package.json` has no build script; API TypeScript executes through Bun.                                                                                                                                                                                                                                   |
| `git diff --check`                          | PASS   | No whitespace errors.                                                                                                                                                                                                                                                                                               |
| Code Anti-Slop                              | PASS   | Reviewed in-scope auth/email/queue/migration code for needless abstractions, duplication, dead dependencies, incomplete behavior, hidden TODO/FIXME/HACK, unsafe casts, and misleading comments; none found.                                                                                                        |
| Secret/redaction review                     | PASS   | Reviewed queues, worker failure normalization, monitor, logs, audit, auth responses, encrypted recipient/context path, and test fixtures. No real secrets or token-bearing URLs are logged or persisted in queue metadata.                                                                                          |

AC-001 → focused PostgreSQL/Redis/Supertest/OpenAPI integration run and full API suite. AC-002 → migration 0018 isolated backfill/UP/DOWN rejection/integrity assertions. AC-003 → migration 0019 isolated UP/DOWN/RE-UP and guarded rejection execution. AC-004 → lint, typecheck, format, full API suite, and `git diff --check`. AC-005 → Code Anti-Slop and secret/redaction source review. No live SMTP provider was used.

## 20. Traceability

Not applicable — project has no traceability ID system for this capability.

## 21. Open Points

None. The earlier sandbox-only service/socket failures were superseded by a successful elevated run against the repository's disposable test services. be/32 visual/email-client review remains outside this gate and retains its previously recorded pending status; this task makes no visual or client-compatibility claim.

## 22. Definition Of Done

- [x] All predecessor requirements, approvals, and acceptance evidence in this gate are complete.
- [x] Scope and any minimal defect repairs meet acceptance criteria; no application-code repair was required.
- [x] Code Anti-Slop, lint, typecheck, formatting, automated tests, migration validation, runtime/security checks, `git diff --check`, changed-file review, and no-secret review pass.
