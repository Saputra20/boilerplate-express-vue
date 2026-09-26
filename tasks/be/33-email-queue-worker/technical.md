# be/33-email-queue-worker — Transactional Email Queue and Worker

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/33-email-queue-worker` |
| Batch | Authentication email infrastructure |
| Owning Feature | Transactional email |
| Workstream | Backend |
| Task Category | Async delivery and tightly coupled persistence |
| Repository/App | `apps/api` |
| Status | Blocked — secure token-to-worker handoff requires human approval |
| Priority | High |
| Suggested Size | Small |
| Depends On | `be/15-bullmq-foundation`, `be/31-email-foundation`, `be/32-email-template-foundation`, `be/14-audit-trail` |
| Blocks | `be/34-email-verification`, `be/35-password-recovery`, `be/36-email-queue-observability` |
| Execution Order | 33 |

## 2. Outcome

Deliver transactional email asynchronously through the existing `default` BullMQ queue, with safe worker lifecycle and an opaque job payload.

## 3. Context

The existing queue is one `default` queue with three attempts, exponential one-second initial backoff, completed-job removal, seven-day lazy failed retention, and read-only Bull Board. It currently has no business job. Bull Board can show job data, so raw security material is prohibited.

## 4. Dependencies

Requires task-31 transport, task-32 renderer, existing Redis/BullMQ/audit, and an approved secure delivery handoff. No email delivery table exists.

## 5. In Scope

- Add Notification-owned queue producer/worker and typed supported job names.
- Evaluate and, only with approval, add an `email_deliveries` table/migration needed for opaque jobs, attempt state, provider message ID, and safe failures.
- Register the worker in server lifecycle using the existing queue infrastructure.

## 6. Out of Scope

Second Queue/Redis system, queue API, monitor redesign, raw email payload in job data, scheduler, recipient/content exposure, or Auth business rules.

## 7. Existing Implementation

Inspect `config/queue/queue.ts`, `queue-monitor.ts`, `server.ts`, `shutdown.ts`, `audit` module, Drizzle schema/migration history, and task 15/16 tests. Existing monitor uses Basic Auth, not RBAC.

## 8. Implementation Requirements

- Reuse queue name `default`; job names must be explicit, e.g. the approved Notification-owned email-delivery job, never client-controlled.
- Job payload is exactly safe opaque identifiers and safe trace context, preferably `{ emailDeliveryId }`; never recipient, HTML/text, password, hash, raw token, SMTP secret, access/refresh token, or full error.
- Worker loads minimal delivery state, renders, calls task-31 transport, writes safe result/failure state, and emits safe audit/log fields. Retry only transient normalized delivery failures; permanent recipient/template validation failure must not retry.
- Keep existing queue defaults unless an email-specific override is explicitly justified and approved. Worker concurrency, timeout, retention, and retention semantics must be explicit before implementation.
- Close worker through existing queue lifecycle; never create a second queue client.
- If `email_deliveries` is approved, define columns, FK, indexes, status transition rules, provider-ID handling, retention/cleanup, UP/DOWN, and isolated DB rollback evidence. It must not persist raw tokens or complete sensitive content.

### Secure handoff blocker

The request handler must create security challenge state before enqueue, while worker needs a recipient URL containing the raw one-time token. Storing it in BullMQ or plaintext DB is forbidden; generating it only in the worker conflicts with the required request-side challenge creation. Select one reviewed design before implementation: an approved cryptographically sound deterministic derivation from persisted challenge ID plus server secret, or another design that proves raw token is never persisted/exposed. Do not implement until approved.

## 9. Applicable Contracts

### Queue Contract

| Item | Contract |
| --- | --- |
| Queue | Existing `default` queue only |
| Payload | opaque delivery ID only |
| Monitor/log/audit | safe metadata only |
| Retry/timeout/concurrency | TODO: REQUIREMENT NEEDED — approve workload values |

### Database Contract

Conditional — `email_deliveries` requires separate approval and entity-scoped UP/DOWN migration. API/UI: not applicable.

## 10. File Impact

Expected create: `modules/notification` queue/repository/service files and tests; conditional schema/migration. Expected modify: server composition and app monitor registration only to add the existing queue. No new source root.

## 11. Runtime Behavior

Business transaction creates approved delivery reference → commits → producer enqueues opaque ID → worker loads/render/sends → records safe final state; enqueue/Redis/SMTP failure follows approved recovery behavior.

## 12. Error And Edge Cases

| Scenario | Expected result |
| --- | --- |
| DB commit but enqueue fails | explicit approved outbox/recovery policy required; no ambiguous claim |
| Queue succeeds, SMTP transiently fails | bounded retry and safe failure state |
| Permanent failure/retries exhausted | safe final state/audit; no secret payload |
| Worker/Redis unavailable | sanitized startup/operational failure under existing lifecycle |

## 13. Security Requirements

No authentication secret, token, password, hash, SMTP credential, email body, or recipient may appear in jobs, monitor, logs, audits, or public responses.

## 14. Test Requirements

Isolated Redis/Postgres tests: opaque payload, dispatch, transient retry, permanent failure, exhaustion, shutdown, queue-monitor-visible payload/result redaction, safe logging, and DB transaction/recovery semantics. Fake transport only.

## 15. Task-Level Expected Results

One existing-queue worker is safe, observable, lifecycle-managed, and cannot leak delivery secrets.

## 16. Acceptance Criteria

- [ ] Approved handoff design keeps raw token out of persistence/BullMQ/monitor/logs/audit.
- [ ] Existing default queue processes opaque delivery IDs only.
- [ ] Approved delivery persistence and recovery behavior are migration/test proven.

## 17. Anti-Slop Requirements

Code Anti-Slop: reject second queue systems, generic job frameworks, raw-payload convenience, fake retry, unbounded retention, secret logs, and hidden TODOs. UI/visual: monitor review only.

## 18. Validation Requirements

API checks, isolated Redis/Postgres integration, migration UP/DOWN/re-apply if approved, monitor payload review, full tests, secret scan, diff review, Code Anti-Slop.

## 19. Completion Evidence

Queue and fake-transport integration proves AC-2; migration/transaction tests prove AC-3; source/monitor/log scans prove AC-1.

## 20. Traceability

Not applicable.

## 21. Open Points

Human approval is required for secure handoff, delivery persistence, outbox/enqueue recovery, retry/concurrency/timeout values, provider failure taxonomy, and retention.

## 22. Definition Of Done

All open points resolved, approved scope implemented, integration/migration evidence and Anti-Slop pass, with no secret in observable surfaces.
