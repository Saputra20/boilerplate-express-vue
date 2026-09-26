# be/37-auth-email-quality-gate — Transactional Auth Email Quality Gate

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/37-auth-email-quality-gate` |
| Batch | Authentication email infrastructure |
| Owning Feature | Authentication |
| Workstream | Backend |
| Task Category | Verification and scoped remediation |
| Repository/App | `apps/api` |
| Status | Planned — executes only after tasks 31–36 are complete |
| Priority | High |
| Suggested Size | Small |
| Depends On | `be/31-email-foundation`, `be/32-email-template-foundation`, `be/33-email-queue-worker`, `be/34-email-verification`, `be/35-password-recovery`, `be/36-email-queue-observability` |
| Blocks | None |
| Execution Order | 37 |

## 2. Outcome

Produce final, reproducible evidence that the approved transactional-auth-email chain works safely from challenge request through asynchronous delivery, verification/reset consumption, queue inspection, shutdown, and failure handling.

## 3. Context

Tasks 31–36 introduce cross-cutting SMTP infrastructure, templates, a BullMQ worker, security challenges, auth flows, and queue visibility. This final task verifies their integration without inventing a new product capability or bypassing existing authentication, authorization, session, audit, or logging controls.

## 4. Dependencies

All predecessor tasks must be completed with their open points resolved and their acceptance evidence available. Local test PostgreSQL/Redis and a fake SMTP transport or approved local catcher are required. No live provider credentials or real recipients are required.

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

| Concept | Required | Validation | Default | Secret |
| --- | --- | --- | --- | --- |
| Test SMTP/fake transport | Test only | no real recipient/provider credential | isolated test implementation | credentials: N/A |
| Test PostgreSQL and Redis | Test only | repository documented isolated services | `docs/DEVELOPMENT.md` services | No |

### UI Contract

Not applicable — no CMS or frontend screen is introduced. Queue Monitor inspection remains operational verification only.

## 10. File Impact

Expected modify: focused predecessor tests or implementation files only when a verified scoped defect exists. Expected create: integration/regression tests or evidence documentation only where existing tests cannot prove an approved requirement. Expected paths are guidance; do not add unrelated dependencies, environment files, or source roots.

## 11. Runtime Behavior

Isolated services start → email configuration uses fake/test transport → synthetic request creates safe state → opaque job is queued and processed → message rendering/send succeeds or fails safely → recipient flow consumes challenge → audit/session effects are asserted → resources shut down cleanly → protected monitor/log surfaces are inspected for leakage.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| SMTP config invalid | sanitized startup failure | no credential values in output |
| Provider transient/permanent failure | approved category, retry/retention behavior | no content or provider stack exposed |
| Repeated/expired challenge use | no duplicate account/password change | lifecycle state remains consistent |
| Queue/email shutdown during work | approved close behavior, no hanging resource | test cleanup remains deterministic |
| Migration rollback/reapply | schema returns/reapplies safely | isolated database only |

## 13. Security Requirements

Review authentication, generic failures, rate limiting, one-way challenge storage, token secrecy, Argon2id handling, session/revocation approval boundaries, access controls, Pino/Morgan redaction, audit allowlists, Queue Monitor data, provider configuration, and no-secret repository diff. Production behavior must remain unchanged except for the explicitly approved capabilities.

## 14. Test Requirements

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| End-to-end verification delivery/consume | approved user state and audit result | integration |
| End-to-end password recovery/reset | approved password/session result | integration |
| Enumeration and challenge replay | generic response/no duplicate mutation | integration/security |
| Secret/PII surface scan | no sensitive values in persisted/observable artifacts | regression/security |
| Worker startup/shutdown and retry | deterministic lifecycle and safe failures | integration |
| Migration UP/DOWN/reapply | reversible entity changes | database |

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

AC-001 → predecessor task review and resolved-open-point record. AC-002 → integration command output. AC-003 → static/migration/security/lifecycle output. AC-004 → monitor/log serialization assertions. AC-005 → final `git status`, `git diff --check`, and changed-file review.

## 20. Traceability

Not applicable — project has no traceability ID system for this capability.

## 21. Open Points

- Predecessor task-33, task-34, and task-35 approvals must be resolved before this gate starts.
- Confirm the repository-compatible command for matching DOWN migration execution before implementation; no manual production DDL.
- Confirm whether a local SMTP catcher is needed in addition to the fake transport for this final evidence run.

## 22. Definition Of Done

- [ ] All predecessor requirements, approvals, and acceptance evidence are complete.
- [ ] Scope and any minimal defect repairs meet acceptance criteria.
- [ ] Code Anti-Slop, lint, typecheck, build, automated tests, migration validation, runtime/security checks, `git diff --check`, changed-file review, and no-secret review pass.
