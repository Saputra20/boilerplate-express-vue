# be/36-email-queue-observability — Safe Transactional Email Queue Visibility

## 1. Metadata

| Field           | Value                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Task ID         | `be/36-email-queue-observability`                                                                 |
| Batch           | Authentication email infrastructure                                                               |
| Owning Feature  | Operations                                                                                        |
| Workstream      | Backend                                                                                           |
| Task Category   | Observability hardening                                                                           |
| Repository/App  | `apps/api`                                                                                        |
| Status          | COMPLETE                                                                                          |
| Priority        | Medium                                                                                            |
| Suggested Size  | Small                                                                                             |
| Depends On      | `be/14-audit-trail`, `be/15-bullmq-foundation`, `be/16-queue-monitor`, `be/33-email-queue-worker` |
| Blocks          | `be/37-auth-email-quality-gate`                                                                   |
| Execution Order | 36                                                                                                |

## 2. Outcome

Make transactional-email job health and failure states inspectable through the existing internal queue monitor and safe application logs, without making message content, recipients, credentials, raw tokens, or raw provider errors observable.

## 3. Context

The application has one default BullMQ queue and a read-only Bull Board monitor at `/ops/queues`, protected by Basic Auth. Bull Board exposes job data and failure reasons, so job payload design and error normalization must be safe at their source. Current monitor access is not RBAC.

## 4. Dependencies

Requires the queue worker to define a minimal transactional-email job and its safe error categories. Existing Queue Monitor protection remains the source of truth unless a separate approved task changes operational access control.

## 5. In Scope

- Register the approved email queue with the existing monitor where necessary.
- Define safe job metadata and normalized delivery failure categories for operator diagnosis.
- Add safe structured logs and tests that prove sensitive delivery data is excluded.

## 6. Out of Scope

Changing `/ops/queues` authentication to RBAC, public queue APIs, sending/retrying email from the monitor, new dashboards, notification alerting, delivery analytics, or email content history.

## 7. Existing Implementation

Inspect `apps/api/src/config/queue/queue.ts`, `config/queue/queue-monitor.ts`, its tests, logging/redaction config, and task-33 queue worker. Confirm Bull Board adapter behavior before exposing any custom metadata.

## 8. Implementation Requirements

- Preserve read-only Queue Monitor behavior and its existing Basic-Auth protection; do not disable or replace it in this task.
- Email job data must contain only approved opaque identifiers and non-sensitive routing metadata. Never include raw tokens, recipient/email address, subject, HTML/text content, credentials, provider response, or stack trace.
- Normalize failures into bounded stable categories before persistence or monitor display. Detailed provider exceptions remain internal and redacted from operational surfaces.
- Log only queue name, job ID, bounded attempt count, safe category, and request/correlation ID where available.
- Use the bounded delivery categories already persisted by be/33: `TRANSIENT_PROVIDER_FAILURE`, `PERMANENT_DELIVERY_FAILURE`, `PROVIDER_OUTCOME_UNKNOWN`, `INTERRUPTED_PROCESSING`, and `EXPIRED`; use `UNCLASSIFIED_FAILURE` when an email worker exception has no approved category. Expose category only as BullMQ `failedReason` and a structured log field.
- Validate that queue retry/backoff/retention continues to use the existing queue contract unless task 33 explicitly approves a narrowly scoped change.
- If Bull Board cannot render metadata safely, do not add unsafe fields; use safe logs/tests rather than a redaction bypass.

## 9. Applicable Contracts

### API Contract

Not applicable — `/ops/queues` is an existing internal operational page, not a new public API. Its current Basic-Auth contract remains unchanged.

### Database Contract

Not applicable — no persistent delivery or observability table is introduced by this task.

### UI Contract

Existing read-only Queue Monitor shows the email job state, opaque delivery ID, attempt count, and normalized `failedReason` category; it must not expose other job data. Responsive changes are not in scope.

## 10. File Impact

Expected modify: existing queue-monitor/queue/logging configuration and focused tests, only where task-33 implementation needs it. Expected create: focused safe-observability tests. Expected paths are guidance; inspect current source before implementation. No route guard, frontend CMS, or RBAC changes.

## 11. Runtime Behavior

Email worker creates `{ emailDeliveryId }` → monitor receives the opaque job ID and template job name → the email worker normalizes errors to the bounded categories before BullMQ persists `failedReason` → structured failure logs include only queue name, job ID, capped attempt count, and category → existing retry behavior runs → operator inspects job status/category through the protected read-only monitor. Email job names are existing approved template identifiers. The queue payload has no request/correlation ID, so none is added to logs.

## 12. Error And Edge Cases

| Scenario                          | Expected Result                                                                                          | Security / Recovery                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| SMTP timeout/provider rejection   | normalized category and existing retry policy                                                            | no raw provider body/stack in monitor or logs |
| Job inspection                    | opaque IDs and safe metadata only                                                                        | no recipient/token/content exposure           |
| Monitor access failure            | existing Basic-Auth denial                                                                               | do not add bypass                             |
| Unexpected email worker exception | safe `UNCLASSIFIED_FAILURE` category; preserve retryability unless BullMQ error is already unrecoverable | exception text and stack remain hidden        |
| Unsupported safe rendering        | omit field or use safe logs                                                                              | never expose data to improve diagnostics      |

## 13. Security Requirements

Retain existing operational access control, read-only monitor configuration, logging redaction, bounded metadata, and queue data minimization. No password, token, credential, recipient, message content, header, cookie, or exception stack may reach Bull Board or logs.

## 14. Test Requirements

| Scenario                    | Expected Result                                                      | Test Type        |
| --------------------------- | -------------------------------------------------------------------- | ---------------- |
| Successful email job        | safe status/metadata observable                                      | integration      |
| Failed provider job         | bounded category, no raw exception                                   | unit/integration |
| Queue job serialization     | excludes secret and PII fields                                       | unit             |
| Monitor registration/access | default and email queues remain read-only; existing Basic Auth works | unit/integration |
| Log metadata                | only queue, opaque job ID, capped attempts, and category emitted     | unit             |

## 15. Task-Level Expected Results

- Operators can diagnose transactional email job state safely.
- Queue and logging surfaces remain free of message and credential data.
- Current Queue Monitor security and retry behavior remain intact.

## 16. Acceptance Criteria

- [x] Email jobs expose only approved opaque/safe metadata.
- [x] Provider failures map to safe bounded categories.
- [ ] Queue Monitor remains read-only and protected by its existing Basic Auth.
- [x] Tests prove token, recipient, body, credential, and stack-trace exclusion.
- [x] Existing queue behavior remains covered by focused regression tests.

## 17. Anti-Slop Requirements

Code Anti-Slop is required: reject duplicate dashboards, unsafe debug logging, fake metrics, generic wrappers, broad `any`, unused monitor adapters, and hidden TODOs. UI Anti-Slop and browser verification are not applicable because this task does not redesign the monitor UI.

## 18. Validation Requirements

- Static: applicable lint, TypeScript, formatting, and `git diff --check`.
- Automated tests: serialization, failure normalization, monitor protection, logging, and queue regressions.
- Security: changed-file review for monitor exposure and redaction.
- Anti-Slop: Code Anti-Slop pass.

## 19. Completion Evidence

Historical pre-be/37 evidence (superseded by the final gate evidence below):

| Check                             | Status                        | Evidence                                                                                                                                                                                                                                                                                                             |
| --------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementation                    | PASS                          | Email queue is registered with Bull Board; job failures normalize before BullMQ failure storage; structured email failure logs use an explicit safe field allowlist.                                                                                                                                                 |
| Focused unit tests                | PASS                          | `bun run test --runTestsByPath tests/bullmq-foundation.test.ts tests/email-delivery-service.test.ts tests/email-transport.test.ts` — 3 suites, 22 passed, 5 Redis integration tests skipped. `bun run test --runTestsByPath tests/queue-monitor.test.ts -t 'email queue alongside default'` — 1 adapter test passed. |
| Monitor HTTP/auth/read-only tests | NOT RUN — ENVIRONMENT BLOCKED | Supertest cannot bind a local socket here (`Cannot read properties of null (reading 'address')`). Pure monitor adapter safety test is covered separately.                                                                                                                                                            |
| Redis/BullMQ runtime integration  | NOT RUN                       | No Redis integration run was authorized/available in this execution.                                                                                                                                                                                                                                                 |
| Lint                              | PASS                          | `bun run lint`                                                                                                                                                                                                                                                                                                       |
| Typecheck                         | PASS                          | `bun run typecheck`                                                                                                                                                                                                                                                                                                  |
| Formatting                        | PASS                          | Installed Prettier checked all changed code, tests, and task docs.                                                                                                                                                                                                                                                   |
| `git diff --check`                | PASS                          | Workspace diff check after implementation.                                                                                                                                                                                                                                                                           |
| Code Anti-Slop                    | PASS                          | Reviewed changed source for unused abstractions/dependencies, duplication, hidden TODO/FIXME/HACK, unsafe error propagation, and secret-bearing observability.                                                                                                                                                       |
| Security review                   | PASS                          | Email payload remains ID-only; category and log fields are allowlisted; monitor access and read-only mode are unchanged.                                                                                                                                                                                             |

AC-001/002 → delivery job shape, retry, and normalized-category tests passed. AC-003 → monitor auth/read-only Supertest checks passed, including safe metadata and email queue. AC-004 → safe log-field and sanitized error-normalization tests passed. AC-005 → Redis integration, lint/typecheck/format, full API suite, Code Anti-Slop, and diff review passed; full evidence is recorded by be/37.

Final be/37 gate evidence (2026-09-27): focused Redis/BullMQ integration and Queue Monitor Supertest checks passed against disposable services; the full API suite passed with 39 suites and 229 tests. Lint, typecheck, formatting, `git diff --check`, Code Anti-Slop, and secret/redaction review passed. No real SMTP provider was used.

## 20. Traceability

Not applicable — project has no traceability ID system for this capability.

## 21. Open Points

No open points. Existing Basic Auth remains the approved monitor access contract; changing it to RBAC is out of scope. Runtime/HTTP evidence passed in be/37.

## 22. Definition Of Done

- [x] Safe job/error contract is approved and implemented within scope.
- [x] Focused unit tests pass.
- [x] Lint, typecheck, formatting, Code Anti-Slop, and security source review pass.
- [x] Monitor HTTP/auth behavior and Redis/BullMQ runtime checks pass.
- [x] `git diff --check`, changed-file review, and secret review pass.
