# be/33-email-queue-worker — Transactional Email Queue and Worker

## 1. Metadata

| Field           | Value                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Task ID         | `be/33-email-queue-worker`                                                                                  |
| Batch           | Authentication email infrastructure                                                                         |
| Owning Feature  | Transactional email                                                                                         |
| Workstream      | Backend                                                                                                     |
| Task Category   | Async delivery and tightly coupled persistence                                                              |
| Repository/App  | `apps/api`                                                                                                  |
| Status          | COMPLETE                                                                                                    |
| Priority        | High                                                                                                        |
| Suggested Size  | Small                                                                                                       |
| Depends On      | `be/15-bullmq-foundation`, `be/31-email-foundation`, `be/32-email-template-foundation`, `be/14-audit-trail` |
| Blocks          | `be/34-email-verification`, `be/35-password-recovery`, `be/36-email-queue-observability`                    |
| Execution Order | 33                                                                                                          |

## 2. Outcome

Deliver transactional email asynchronously through a dedicated `email` BullMQ queue on the existing Redis infrastructure. Persist safe delivery state, authenticated-encrypted template context, and encrypted recipient addresses; queue jobs contain only an opaque delivery ID.

## 3. Context

The be/15 queue foundation remains unchanged for `default` and all existing non-email queues: three attempts, exponential one-second initial backoff, immediate completed-job removal, and seven-day lazy failed retention. Human approval adds an explicit `email` queue policy: five attempts, exponential five-second initial delay, concurrency five, 30-second attempt timeout, bounded completed history (latest 1,000), and seven-day failed retention. The email queue shares the existing Redis configuration and lifecycle primitives. `be/37` is the final queue/auth-email integration and security gate. be/32 visual/client acceptance remains a separate review and is not claimed by this backend gate.

## 4. Dependencies

Requires completed be/15, be/31, be/14, the stable renderer contract and automated implementation evidence from be/32, and existing PostgreSQL/Redis infrastructure. Final visual/client acceptance of be/32 is not an implementation dependency and remains separately pending; be/33 and be/37 must not claim it. No auth-challenge entity exists yet; be/34 and be/35 will create challenges and pass their expiry into delivery creation.

## 5. In Scope

- Add Notification-owned producer/worker and fixed job names `auth.email-verification`, `auth.password-reset`, and `auth.password-changed` on a dedicated `email` queue using the existing Redis config.
- Add the approved `email_deliveries` entity. The recipient privacy upgrade uses two staged, entity-scoped migrations so existing delivery data can be encrypted before the plaintext column is dropped.
- Add AES-256-GCM encryption/decryption of the minimal typed template context. Store ciphertext and required nonce/tag metadata only; never persist plaintext action URLs or raw tokens.
- Encrypt recipient email at rest with the existing delivery key and a delivery-specific AAD label. Decrypt it only in worker memory immediately before send. Do not add recipient search or plaintext monitoring fields.
- Validate `EMAIL_DELIVERY_ENCRYPTION_KEY` as a dedicated 32-byte key, required at production startup when email delivery is enabled. It is distinct from SMTP credentials. Tests inject a deterministic test-only key.
- Register the email queue/worker in server lifecycle and read-only Queue Monitor without changing `default` queue behavior.
- Persist deterministic delivery state, implement safe pending re-enqueue and recovery of failed still-valid deliveries, and prevent automatic resend for sent/uncertain/expired deliveries.
- Scrub ciphertext after success, on expired auth challenge, and earlier for permanent nonrecoverable failures. Keep operational row cleanup distinct from sensitive-payload cleanup.
- Provide deterministic cleanup operations. No scheduler exists; document cleanup invocation as an operational dependency. Do not add a scheduler in this task.

## 6. Out of Scope

Second Redis system, public queue API, Queue Monitor redesign, raw email payload in BullMQ job data, scheduler, recipient/content exposure in observable surfaces, or Auth business rules/challenge creation.

## 7. Existing Implementation

Inspect `config/queue/queue.ts`, `queue-monitor.ts`, `server.ts`, `shutdown.ts`, `audit` module, Drizzle schema/migration history, and task 15/16 tests. The original delivery schema stores recipient as plaintext; migrations 0017/0018 and the controlled backfill replace that storage. Existing monitor uses Basic Auth, not RBAC.

## 8. Implementation Requirements

- Use queue `email` as the approved queue-specific exception; keep the `default` queue and non-email job behavior byte-for-byte unchanged. Job names are fixed Notification-owned names and never client-controlled.
- Job payload is exactly `{ emailDeliveryId }`; never recipient, HTML/text, password, hash, raw token, SMTP secret, access/refresh token, or full error. Queue Monitor only exposes safe operational metadata.
- Queue policy: five attempts, exponential backoff with 5,000 ms initial delay, worker concurrency 5, 30-second SMTP/attempt timeout, completed-job count retention 1,000, and failed-job age retention 604,800 seconds. These are exclusive to `email`; do not alter `default`.
- Worker decrypts context only inside the delivery path, validates delivery status/expiry before rendering, and calls the be/31 `EmailTransport`. SMTP success stores safe provider message ID/status; errors are normalized to retryable, permanent, or uncertain. Only definitely pre-acceptance transient failures retry. Permanent/uncertain outcomes use BullMQ unrecoverable failure handling.
- On success, atomically set `sent` and clear encrypted context. For retry-exhausted verification/reset rows, retain ciphertext only until `sensitive_payload_expires_at`; expired or revoked/invalid challenges must not send. Permanent failures may scrub earlier. Keep safe metadata 7 days for sent rows and 30 days for failed/uncertain rows.
- Worker claim is conditional and idempotent: `sent` no-ops; `uncertain` and `failed` do not process unless explicit recovery path allows; queued/retrying may process; a duplicate/stalled execution that finds `processing` becomes `uncertain` and is not sent again automatically.
- Use deterministic BullMQ job ID equal to delivery ID. Queue deduplication is additional to persisted state checks.
- Close worker/queue through existing lifecycle; reuse existing Redis configuration and do not change non-email queue behavior.
- `email_deliveries` stores recipient only as AES-256-GCM ciphertext, nonce, tag, and key version. Reuse the existing key with a separate delivery-specific AAD label. Do not retain a plaintext recipient column after migration. Recipient is never exposed in Monitor/log/audit. Never persist rendered HTML/text.
- Upgrade existing rows in stages: migration 0017 adds nullable encrypted-recipient fields while preserving plaintext; a bounded operational backfill encrypts every existing recipient with the configured key and verifies the fields; migration 0018 refuses to run if any non-null plaintext recipient lacks a complete encrypted representation, then drops the plaintext column. Stop API/worker writes during the backfill/cutover. Never put the encryption key in SQL or logs.
- Migration 0018 is intentionally irreversible: its DOWN file must fail before any schema mutation because reversal would restore plaintext recipient PII. Operational recovery requires a pre-migration database snapshot; application rollback must preserve the encrypted-recipient schema.
- Cleanup functions deterministically scrub expired encrypted payloads and delete eligible sent metadata after 7 days and failed/uncertain metadata after 30 days. There is no approved scheduler; deployment invocation remains an operational dependency and must be documented.

### Secure handoff and encryption contract

Approved flow: owning Auth flow creates challenge and stores only token hash → creates final URL in memory → Notification encrypts typed template context using AES-256-GCM and stores ciphertext → enqueue `{ emailDeliveryId }` → worker decrypts context only immediately before rendering/send → scrub ciphertext under the secret lifecycle rules. Bind ciphertext to delivery ID/template as authenticated additional data. Never put URL/token in BullMQ, logs, Monitor, audit, or public responses. No token derivation is used. Encryption key is dedicated, validated config, never persisted/logged, never derived from SMTP credentials. Key version is stored with ciphertext; do not rotate/remove a key version while any unsrubbed row still references it.

## 9. Applicable Contracts

### Queue Contract

| Item                     | Contract                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Queue                    | Dedicated `email` queue, same Redis configuration; existing `default` queue unchanged |
| Payload                  | opaque delivery ID only                                                               |
| Monitor/log/audit        | safe metadata only                                                                    |
| Retry                    | 5 attempts; exponential backoff; initial delay 5 seconds                              |
| Timeout                  | 30 seconds per attempt using transport timeouts; uncertain outcomes do not retry      |
| Concurrency              | 5                                                                                     |
| Successful-job retention | Keep latest 1,000 completed jobs                                                      |
| Failed-job retention     | 7 days, using the be/15 lazy retention behavior                                       |
| Non-email queues         | Existing be/15 defaults unchanged                                                     |

### Configuration Contract

| Variable                        | Required                                                            | Type       | Validation                                              | Default                                                                 | Secret |
| ------------------------------- | ------------------------------------------------------------------- | ---------- | ------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| `EMAIL_DELIVERY_ENCRYPTION_KEY` | When `EMAIL_ENABLED=true` in production; explicit test key in tests | hex string | exactly 64 hexadecimal characters representing 32 bytes | None — enabled production delivery must fail startup if missing/invalid | Yes    |

`EMAIL_DELIVERY_ENCRYPTION_KEY` is separate from SMTP credentials. Development/test uses an injected deterministic test-only key and fake transport; no real credential or external delivery is needed.

### Database Contract

Approved — `email_deliveries` stores UUID id, template type, encrypted recipient (`bytea` ciphertext, 12-byte nonce, 16-byte tag, key version), status, encrypted context (`bytea` ciphertext, 12-byte nonce, 16-byte tag, key version), attempts, provider message ID, queued/processing/sent/failed/uncertain timestamps, safe normalized error code, sanitized short error message, sensitive payload expiry, and created/updated timestamps where justified. Keep sent metadata 7 days and failed/uncertain metadata 30 days; scrub encrypted recipient/context after terminal send or permanent failure and independently at challenge expiry. No plaintext recipient, full body, or plaintext action URL. No auth-challenge FK until the owning challenge entity exists; Auth producers supply challenge expiry. API/UI: not applicable.

Migration rollout uses 0017 to add nullable recipient encryption columns and relax legacy recipient nullability, an application-assisted bounded backfill that preserves plaintext until verified, then 0018 to verify all existing recipients and drop the plaintext column. Rollback semantics for the final migration must be documented explicitly; it must not silently restore plaintext.

## 10. File Impact

Expected Create: notification delivery schema/repository/service/worker/crypto modules, focused tests, staged email-recipient migrations with DOWN operations, a bounded recipient backfill script, and optional internal cleanup function.

Expected Modify: environment/email config validation, email transport failure/result contract, queue config/factory for the explicit email queue exception, server/shutdown composition, monitor registration to include email queue, Drizzle schema aggregation/config, and task documentation.

Expected Not Modified: existing `default` queue behavior/options, non-email processors, Auth APIs/challenge schema/flows, SMTP provider credentials, public routes/OpenAPI, and unrelated be/31 changes.

## 11. Runtime Behavior

Auth owner transaction stores challenge/hash and inserts a pending delivery with encrypted context and challenge expiry → commits → producer enqueues `{ emailDeliveryId }` with deterministic job ID and marks queued only if worker has not already claimed it → worker checks state/expiry, conditionally claims processing, decrypts context, renders, and sends → success transaction stores sent metadata and scrubs ciphertext. Enqueue failure leaves pending state for same-ID recovery. Retryable pre-acceptance failures move through retrying under the email queue policy. Permanent failures become failed; provider ambiguity or re-execution of an interrupted processing row becomes uncertain and is never automatically resent. Cleanup scrubs expired secrets and removes metadata at its approved retention boundary when invoked by the documented operational cleanup mechanism.

## 12. Error And Edge Cases

| Scenario                                                      | Expected result                                                                                                         |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| DB commit but enqueue fails                                   | Keep pending row; same ID may be safely enqueued by recovery                                                            |
| SMTP transient failure before provider acceptance             | Retry up to five attempts with exponential 5-second initial delay                                                       |
| Permanent provider/template/config failure                    | Mark failed without unnecessary retry; scrub ciphertext if same delivery recovery is not useful                         |
| Ambiguous SMTP result or interrupted processing               | Mark uncertain; no automatic resend                                                                                     |
| Expired challenge or delivery secret                          | Do not send; scrub encrypted payload and keep only operational metadata until row retention ends                        |
| Duplicate job for sent delivery                               | No-op; never resend                                                                                                     |
| Redis unavailable                                             | sanitized startup/runtime failure under existing lifecycle; no false readiness                                          |
| Encryption key missing/invalid while production email enabled | deterministic sanitized startup validation failure; no worker starts                                                    |
| Metadata cleanup scheduler unavailable                        | cleanup function remains deterministic/callable; document operational invocation dependency, do not add a new scheduler |

## 13. Security Requirements

No authentication secret, verification token, password-reset token, password, password hash, SMTP credential, access token, refresh token, rendered sensitive email body, encrypted payload/nonce/tag, or secret action URL may be exposed through BullMQ metadata, Queue Monitor, application logs, audit metadata, or public API responses. Delivery persistence may contain only AES-256-GCM ciphertext for sensitive context. Never log decrypted context. Redact recipient from logs and Monitor. Validate encryption config before worker startup, compare tags through platform crypto APIs, and fail closed on decrypt/authentication errors.

## 14. Test Requirements

Tests cover: emailDeliveryId-only deterministic jobs; token/action URL/recipient absent from jobs/Monitor/logs/audit; context and recipient ciphertext at rest and worker-only decryption; wrong-key and malformed-ciphertext safe failure; success/expiry/permanent failure scrubbing; retryable/permanent/uncertain classification; uncertain no-retry; sent no-resend; pending and failed-valid recovery; expired no-recovery; 5-attempt/5-second retry options; concurrency 5; 30-second SMTP timeouts; 1,000 completed and seven-day failed queue retention; 7/30-day delivery row retention; encryption-key validation; isolated phase-A schema, existing-recipient backfill/verification, phase-B plaintext drop guard, migration DOWN contract, and re-apply; reconnect/shutdown behavior. Tests use isolated Redis/PostgreSQL and fake transport only.

## 15. Task-Level Expected Results

- A separate `email` queue uses existing Redis infrastructure; all existing non-email queues retain be/15 behavior.
- An entity-scoped delivery table stores safe operational data and authenticated-encrypted template inputs, with no plaintext action URL or rendered body.
- Worker classifies SMTP results, retries only safe transient failures, and suppresses uncertain/sent/expired duplicate deliveries.
- Encryption config, worker lifecycle, monitor metadata, retention, and recovery behavior are testable.

## 16. Acceptance Criteria

- [x] `email` queue uses exact approved policy while `default` and every non-email queue remain unchanged.
- [x] Queue job data contains exactly `{ emailDeliveryId }`; action URL/token/recipient/body never reach BullMQ or Monitor.
- [x] AES-256-GCM context encryption uses validated dedicated key; production startup fails safely if email is enabled without valid key.
- [x] Success/expiry/permanent-failure secret scrubbing and 7/30-day metadata cleanup behavior are tested.
- [x] Worker retries only definite transient pre-acceptance failures; permanent and uncertain outcomes do not retry; sent deliveries never resend.
- [x] Pending enqueue recovery and valid failed-delivery recovery reuse the same delivery ID; expired and uncertain deliveries are not automatically requeued.
- [ ] Migration 0018 UP/backfill/removal and deterministic DOWN rejection are verified against isolated PostgreSQL. Re-apply is not applicable after 0018 because DOWN is intentionally unsupported.
- [x] Queue Monitor/log/audit output contains only approved safe metadata.
- [x] be/32 renderer contract and automated implementation evidence are used; no visual/client acceptance is claimed. be/37 validates backend queue/auth-email integration and does not include be/32's separately tracked visual/client review.

## 17. Anti-Slop Requirements

Code Anti-Slop: reject generic job frameworks, custom cryptography, raw-payload convenience, fake retry, unbounded retention, secret logs, leaked recipient values, hidden TODOs, and changing non-email queue defaults. UI/visual: no product UI; inspect only Monitor metadata safety.

## 18. Validation Requirements

API format/lint/typecheck; focused and full tests; isolated Redis integration; isolated PostgreSQL migration UP/DOWN/re-apply; production encryption-key config guard; Queue Monitor payload review; secret scan; Code Anti-Slop; and changed-file/diff review.

### Historical pre-be/37 evidence (superseded by final gate evidence below)

| Check                                | State | Evidence / limitation                                                                                                                                                          |
| ------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Implementation                       | PASS  | Encrypted recipient path, staged schema/backfill, and intentionally irreversible 0018 DOWN are implemented.                                                                    |
| Focused tests                        | PASS  | Focused PostgreSQL/Redis/HTTP integration run passed; 9 suites and 35 tests across all listed gate suites.                                                                     |
| Full API suite                       | PASS  | `API_INTEGRATION=true bun run test -- --detectOpenHandles` — 39 suites, 229 tests passed.                                                                                      |
| Lint                                 | PASS  | `bun run lint`                                                                                                                                                                 |
| Typecheck                            | PASS  | `bun run typecheck`                                                                                                                                                            |
| Formatting                           | PASS  | `bun run format:check`                                                                                                                                                         |
| `git diff --check`                   | PASS  | Workspace diff check completed after current edits.                                                                                                                            |
| Queue Monitor HTTP tests             | PASS  | Focused Supertest suite passed, including auth, read-only behavior, and email queue safe metadata.                                                                             |
| Redis/BullMQ integration             | PASS  | Focused integration run passed Redis enqueue/worker/retry/retention and shutdown coverage.                                                                                     |
| PostgreSQL delivery integration      | PASS  | Focused PostgreSQL integration run passed persistence, decrypt, state transition, expiry/scrubbing, and retention tests.                                                       |
| Migration 0018 DOWN contract         | PASS  | Schema assertion confirms a deterministic exception statement with no mutation statements.                                                                                     |
| Migrations 0015–0017 DOWN/reapply    | PASS  | Each migration completed UP → DOWN → RE-UP in an isolated PostgreSQL schema; table/column state and recipient nullability were verified.                                       |
| Migration UP/backfill/DOWN rejection | PASS  | Isolated PostgreSQL test backfilled and decrypted synthetic recipients, removed plaintext, rejected 0018 DOWN, and verified schema/data integrity. Reapply is N/A by contract. |
| Code Anti-Slop                       | PASS  | Reviewed encryption, backfill, migration runner behavior, secret exposure, assertions, and unused/duplicated implementation.                                                   |
| Secret/redaction review              | PASS  | Reviewed job payload, persisted recipient/context, worker logs, queue monitor, audit metadata, and public responses; no secret leaks found.                                    |

## 19. Completion Evidence

Each AC maps to focused transport/worker/repository tests, isolated migration output, queue-option assertions, env validation evidence, Monitor/log serialization checks, cleanup tests, and source review. No real email is sent.

The deterministic cleanup operation is implemented and tested. Its recurring invocation remains a deployment dependency, as approved; this task does not add a scheduler.

## 20. Traceability

Not applicable.

## 21. Open Points

- Operational dependency: invoke the deterministic sensitive-payload/row-retention cleanup function from an approved deployment cleanup mechanism; this task does not add a scheduler. be/32 visual/client review remains separately pending and is not claimed by this backend task.

## 22. Definition Of Done

- All approved scope and acceptance criteria pass; no be/32 visual/client pass is claimed.
- Focused and full API tests, Redis/PostgreSQL integrations, lint, typecheck, formatting, secret review, and Code Anti-Slop pass; final evidence is recorded by be/37.
- Migration 0018 DOWN rejects before schema changes; re-apply after 0018 DOWN is not applicable. Pre-migration database snapshot is the approved true-rollback recovery path.
- Existing non-email queue behavior remains unchanged.
- `git diff --check`, changed-file review, and no-secret review pass.
