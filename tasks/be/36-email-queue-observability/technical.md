# be/36-email-queue-observability — Safe Transactional Email Queue Visibility

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/36-email-queue-observability` |
| Batch | Authentication email infrastructure |
| Owning Feature | Operations |
| Workstream | Backend |
| Task Category | Observability hardening |
| Repository/App | `apps/api` |
| Status | Planned — implementation follows approved email queue contract |
| Priority | Medium |
| Suggested Size | Small |
| Depends On | `be/14-audit-trail`, `be/15-bullmq-foundation`, `be/16-queue-monitor`, `be/33-email-queue-worker` |
| Blocks | `be/37-auth-email-quality-gate` |
| Execution Order | 36 |

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
- Validate that queue retry/backoff/retention continues to use the existing queue contract unless task 33 explicitly approves a narrowly scoped change.
- If Bull Board cannot render metadata safely, do not add unsafe fields; use safe logs/tests rather than a redaction bypass.

## 9. Applicable Contracts

### API Contract

Not applicable — `/ops/queues` is an existing internal operational page, not a new public API. Its current Basic-Auth contract remains unchanged.

### Database Contract

Not applicable — no persistent delivery or observability table is introduced by this task.

### UI Contract

Existing read-only Queue Monitor must show permitted job state and normalized failure category without displaying sensitive payload values. Responsive changes are not in scope.

## 10. File Impact

Expected modify: existing queue-monitor/queue/logging configuration and focused tests, only where task-33 implementation needs it. Expected create: focused safe-observability tests. Expected paths are guidance; inspect current source before implementation. No route guard, frontend CMS, or RBAC changes.

## 11. Runtime Behavior

Email worker creates an approved opaque job → monitor receives only safe job data → worker records success or normalized failure category → existing retry behavior runs → operator can inspect status/attempts/category through protected read-only monitor and safe logs.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| SMTP timeout/provider rejection | normalized category and existing retry policy | no raw provider body/stack in monitor |
| Job inspection | opaque IDs and safe metadata only | no recipient/token/content exposure |
| Monitor access failure | existing Basic-Auth denial | do not add bypass |
| Unsupported safe rendering | omit field or use safe logs | never expose data to improve diagnostics |

## 13. Security Requirements

Retain existing operational access control, read-only monitor configuration, logging redaction, bounded metadata, and queue data minimization. No password, token, credential, recipient, message content, header, cookie, or exception stack may reach Bull Board or logs.

## 14. Test Requirements

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Successful email job | safe status/metadata observable | integration |
| Failed provider job | bounded category, no raw exception | unit/integration |
| Queue job serialization | excludes secret and PII fields | unit |
| Monitor registration/access | monitor remains read-only and existing auth works | integration |
| Log capture | only approved fields emitted | unit/integration |

## 15. Task-Level Expected Results

- Operators can diagnose transactional email job state safely.
- Queue and logging surfaces remain free of message and credential data.
- Current Queue Monitor security and retry behavior remain intact.

## 16. Acceptance Criteria

- [ ] Email jobs expose only approved opaque/safe metadata.
- [ ] Provider failures map to safe bounded categories.
- [ ] Queue Monitor remains read-only and protected by its existing Basic Auth.
- [ ] Tests prove token, recipient, body, credential, and stack-trace exclusion.
- [ ] Existing queue behavior remains covered by regression tests.

## 17. Anti-Slop Requirements

Code Anti-Slop is required: reject duplicate dashboards, unsafe debug logging, fake metrics, generic wrappers, broad `any`, unused monitor adapters, and hidden TODOs. UI Anti-Slop and browser verification are not applicable because this task does not redesign the monitor UI.

## 18. Validation Requirements

- Static: applicable lint, TypeScript, formatting, and `git diff --check`.
- Automated tests: serialization, failure normalization, monitor protection, logging, and queue regressions.
- Security: changed-file review for monitor exposure and redaction.
- Anti-Slop: Code Anti-Slop pass.

## 19. Completion Evidence

AC-001/002 → job serialization and failure-category tests. AC-003 → Queue Monitor integration test. AC-004 → captured-log and monitor-data assertions. AC-005 → queue regression output, lint/typecheck, diff review, and `git diff --check`.

## 20. Traceability

Not applicable — project has no traceability ID system for this capability.

## 21. Open Points

- Confirm task-33 job shape and normalized delivery categories.
- `TODO: REQUIREMENT NEEDED` if operations requires RBAC instead of existing Basic Auth; that is a separate operational-security task, not an implicit change here.
- Confirm whether existing monitor adapter supports a safe custom display without leaking raw job data.

## 22. Definition Of Done

- [ ] Safe job/error contract is approved and implemented within scope.
- [ ] Acceptance criteria and focused tests pass.
- [ ] Code Anti-Slop, lint, typecheck, security review, `git diff --check`, changed-file review, and secret review pass.
