# be/34-email-verification — Email Verification Challenge Flow

## 1. Metadata

| Field           | Value                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID         | `be/34-email-verification`                                                                                                             |
| Batch           | Authentication email infrastructure                                                                                                    |
| Owning Feature  | Authentication                                                                                                                         |
| Workstream      | Backend                                                                                                                                |
| Task Category   | Security-sensitive capability                                                                                                          |
| Repository/App  | `apps/api`                                                                                                                             |
| Status          | COMPLETE                                                                                                                               |
| Priority        | High                                                                                                                                   |
| Suggested Size  | Small                                                                                                                                  |
| Depends On      | `be/09-password-hashing`, `be/14-audit-trail`, `be/31-email-foundation`, `be/32-email-template-foundation`, `be/33-email-queue-worker` |
| Blocks          | `be/35-password-recovery`, `be/37-auth-email-quality-gate`                                                                             |
| Execution Order | 34                                                                                                                                     |

## 2. Outcome

Provide a one-time, expiring email-verification challenge lifecycle that updates `users.emailVerifiedAt` only after a valid challenge is consumed and sends a verification email without exposing its raw security token outside the recipient message.

## 3. Context

`users.emailVerifiedAt` exists, but no challenge model exists. Current authentication is module-first and uses generic public failures. The email queue and read-only Basic-Auth Queue Monitor are implemented. be/33's approved handoff stores typed template context using AES-256-GCM and puts only `emailDeliveryId` in BullMQ. The current API configuration has `CORS_ORIGINS`, but no canonical public frontend base URL for constructing verification links.

## 4. Dependencies

Requires completed SMTP, templates, queue worker, audit service, and approved challenge handoff. Human approvals resolve API, caller, token, expiry, resend, rate-limit, audit, and canonical public frontend URL decisions. be/31, be/32, and be/33 are implemented; their independently pending visual/client review does not block this backend implementation.

## 5. In Scope

- Add the approved verification challenge persistence and lifecycle.
- Generate a cryptographically secure raw token before enqueueing delivery, persist only its approved one-way representation, and send the raw value only in the final recipient email.
- Add approved request/resend and consume routes, audit records, cooldown/rate-limit integration, and focused tests.

## 6. Out of Scope

Registration, invitation acceptance, frontend screens, changing login eligibility, marketing email, changing RBAC meanings, and session-revocation behavior outside an explicitly approved contract.

## 7. Existing Implementation

Inspect `apps/api/src/modules/auth/**`, `modules/user/**`, `db/schema/users.ts`, existing auth session/revocation tables, generic `modules/audit/**`, queue config, module OpenAPI contracts, and public authentication error handling. No verification route or challenge table currently exists.

## 8. Implementation Requirements

- Reuse a single challenge model for approved auth purposes, with purpose `email_verification`; do not create a verification-token plaintext column.
- A challenge is valid only if it is unexpired, unused, not revoked, and its stored one-way representation matches the submitted raw token using a timing-safe comparison where applicable.
- Create, supersede/revoke, consume, and audit challenge state atomically according to the approved delivery and outbox policy.
- An accepted challenge sets `users.emailVerifiedAt` once; repeat consumption must be safe and must not recreate delivery.
- Request/resend behavior must not disclose whether an email or account exists. Apply the approved limits: five requests/hour per normalized email/account, 20 requests/hour per source IP, and one request per 60 seconds per eligible account. Verify attempts are limited to 20 per 15 minutes per source IP. Reuse existing rate-limit infrastructure and response conventions.
- Raw tokens, link query values, rendered message bodies, recipient addresses, and provider errors must never enter BullMQ payloads, Queue Monitor data, logs, audit metadata, database plaintext, or public responses.
- New email-verification challenges revoke only prior active email-verification challenges for the same user. Password-reset challenges remain unaffected.
- Verification request is available unauthenticated; it always returns the same 202 response for known, unknown, verified, disabled, or otherwise ineligible email addresses. It must not reveal queue outcome.
- Verification consume is an unauthenticated POST; never mutate verification state through GET.
- Email links target `<PUBLIC_APP_URL>/verify-email?token=<raw-token>`. The frontend route is future work and not part of this task.
- Generate at least 32 random bytes and encode using base64url. Persist SHA-256 only. Token expiry is 24 hours, calculated server-side and supplied to the email-delivery sensitive-payload expiry. The template expiry display must derive from that same duration.
- Consume atomically locks/claims a challenge, updates `users.emailVerifiedAt` only when null, marks the challenge used, and records required audit state. A consumed token returns the deterministic invalid/used-token error; concurrent requests cannot both succeed.
- Unknown, revoked, used, and invalid tokens share a deterministic public error. Expired tokens may use the distinct approved `verification_token_expired` error. Never return challenge data/hash.
- Use existing normalized email semantics (lowercase, as used by user creation and identity lookup). Do not create a second normalization rule.
- Do not implement a route or storage format until task 33’s safe delivery handoff is approved; be/33 handoff is now approved and implemented.

## 9. Applicable Contracts

### API Contract

Approved public endpoints under `/api/v1/auth`:

| Method | Path                          | Auth   | Request               | Success                                                                                                                                                |
| ------ | ----------------------------- | ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/email-verification/request` | Public | `{ "email": string }` | `202 { "message": "If the account is eligible for email verification, a verification email will be sent." }` for all account states and queue outcomes |
| POST   | `/email-verification/verify`  | Public | `{ "token": string }` | `200` using the existing success envelope                                                                                                              |

Verification failures use the existing safe error response convention. Invalid/unknown/used/revoked tokens share `invalid_or_used_verification_token`; expired tokens use `verification_token_expired`. Never use GET for mutation.

### Database Contract

Approved: add one entity-scoped `auth_challenges` table with UUID ID, `userId`, purpose, one-way `tokenHash`, `expiresAt`, `usedAt`, `revokedAt`, and `createdAt`; FK to users, lifecycle lookup indexes, purpose constraint, and focused Drizzle UP/DOWN migration. Store no raw token or message body. Purpose values must support the approved email-verification flow and not affect password-reset challenge behavior.

### Configuration Contract

| Concept          | Required                           | Validation                                                                                                                                                 | Default                                                                              | Secret |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------ |
| `PUBLIC_APP_URL` | Required when `EMAIL_ENABLED=true` | Absolute URL, no credentials/query/fragment; HTTPS in production; HTTP permitted only for localhost/loopback in development/test; normalize trailing slash | None — enabled auth email requires this value                                        | No     |
| Verification TTL | Yes                                | Fixed approved duration, calculated server-side                                                                                                            | 24 hours                                                                             | No     |
| Request limits   | Yes                                | Existing rate-limit infrastructure                                                                                                                         | 5/hour per normalized account; 20/hour per source IP; 60-second per-account cooldown | No     |
| Verify limit     | Yes                                | Existing rate-limit infrastructure                                                                                                                         | 20 attempts/15 minutes per source IP                                                 | No     |

### UI Contract

Not applicable — frontend verification and account screens are separate work.

## 10. File Impact

Expected create: entity schema/migration pair, auth challenge repository/service/validation/tests, verification template usage, module OpenAPI update if an endpoint is approved. Expected modify: auth module composition and audit integration. Expected paths are guidance; inspect the repository before implementation. No frontend or unrelated role/permission change.

## 11. Runtime Behavior

Request arrives → validate/normalize email and apply request limits → for an eligible unverified account outside cooldown, generate a 256-bit token, revoke prior active verification challenges, insert the SHA-256 challenge and encrypted delivery via approved be/33 handoff → return the same generic 202 regardless of account eligibility or queue outcome → worker renders/sends to the frontend URL → recipient submits token with POST → apply IP verification limit → hash and lock matching challenge → atomically set `emailVerifiedAt`, mark the challenge used, and append the audit event → return the approved success response. All request paths omit raw token, URL, recipient, and queue outcome from public response/log/audit/queue metadata.

## 12. Error And Edge Cases

| Scenario                                                | Expected Result                                                                             | Security / Recovery                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Unknown, disabled, deleted, or verified email           | identical generic 202; no challenge/delivery                                                | no account disclosure                                |
| Per-account cooldown/rate or IP rate reached            | same generic request response for request endpoint; verification abuse returns standard 429 | no account lockout                                   |
| Prior active verification challenge                     | revoke only same-user email-verification challenge before creating new one                  | password-reset purpose unaffected                    |
| Expired token                                           | deterministic `verification_token_expired` response                                         | no token detail exposed                              |
| Used, revoked, unknown, malformed token                 | deterministic `invalid_or_used_verification_token` response                                 | no internal distinction exposed                      |
| Delivery enqueue failure                                | challenge remains subject to normal TTL; be/33 pending recovery applies                     | do not create replacement automatically              |
| Duplicate/concurrent consume                            | only one atomic consume can succeed; later attempt gets invalid/used response               | no duplicate state/audit effects                     |
| Missing/invalid `PUBLIC_APP_URL` while email is enabled | deterministic environment validation failure                                                | do not derive from CORS allowlist or hardcode a host |

## 13. Security Requirements

Use cryptographically secure token generation, one-way storage, strict expiry and single use. Preserve generic auth failures, input validation, existing auth middleware, request IDs, redaction, and audit metadata allowlists. Do not put authentication secrets in URL logs, browser telemetry, queue payloads, or persisted message content.

## 14. Test Requirements

| Scenario                            | Expected Result                                              | Test Type            |
| ----------------------------------- | ------------------------------------------------------------ | -------------------- |
| Valid one-time verification         | updates `emailVerifiedAt`, consumes challenge, records audit | integration          |
| Expired/revoked/used/invalid token  | no user change and safe response                             | integration          |
| Request for known and unknown email | indistinguishable public response                            | integration/security |
| Resend and cooldown                 | approved policy enforced without raw-token leakage           | integration          |
| Queue payload/log/audit inspection  | contains no raw token, recipient, or rendered body           | unit/integration     |
| Migration UP/DOWN/reapply           | entity schema rolls forward/back in isolated DB              | database             |

Use synthetic recipients and a fake SMTP transport only; no external mail delivery.

## 15. Task-Level Expected Results

- Approved verification lifecycle has one source of truth and atomic state changes.
- Verification delivery uses the approved opaque handoff.
- Public behavior is enumeration-safe and lifecycle failures are auditable without sensitive data.

## 16. Acceptance Criteria

- [x] A valid, unexpired, unused verification challenge sets `emailVerifiedAt` exactly once.
- [x] Invalid, expired, revoked, and consumed challenges cannot verify an account.
- [ ] No raw token or message content appears in persistence, logs, audits, or queue inspection; recipient-address persistence also follows the approved at-rest policy.
- [x] Request/resend behavior and public errors follow an approved non-enumerating API contract.
- [x] Required migration and focused tests pass.

## 17. Anti-Slop Requirements

Code Anti-Slop is required: reject generic token frameworks, duplicate auth state, unsafe `any`/assertions, plaintext fallback paths, hidden TODO implementation, and unused abstractions. UI Anti-Slop is not applicable. Visual verification is not applicable.

## 18. Validation Requirements

- Static: applicable API lint, TypeScript, formatting, and `git diff --check`.
- Automated tests: auth/challenge unit and integration tests, secret-leak regression checks.
- Database: isolated Drizzle migration UP, DOWN, and reapply validation.
- Security: review rate limit, enumeration, redaction, audit, and session-policy boundaries.
- Anti-Slop: Code Anti-Slop pass.

## 19. Completion Evidence

AC-001/002 → `tests/email-verification.integration.test.ts` passed against disposable PostgreSQL in the be/37 focused run. AC-003 → verification, delivery-service, and crypto tests passed; migration 0018 evidence is recorded by be/37. AC-004 → auth HTTP/OpenAPI and environment tests passed in the focused/full runs. AC-005 → focused email/schema tests, PostgreSQL integration, and full API suite passed; exact commands and counts are recorded by be/37.

Final validation: PostgreSQL integration, migration 0018 UP/backfill/DOWN integrity, auth HTTP/OpenAPI, full API suite, lint, typecheck, formatting, and `git diff --check` passed in be/37. Code Anti-Slop and security source review also passed. The earlier sandbox-only service/socket errors were superseded by successful execution in the elevated environment.

Migration 0018 DOWN contract: PASS. Disposable PostgreSQL execution confirms DOWN rejects before schema changes and the database remains valid with encrypted recipient rows. Reapply is N/A because DOWN is intentionally unsupported.

## 20. Traceability

Not applicable — project has no traceability ID system for this capability.

## 21. Open Points

- The plaintext-recipient conflict is resolved by the approved be/33 encrypted-recipient migration and application backfill.
- Migration 0018 is approved as intentionally irreversible. Its DOWN must reject rollback before mutation because restoring plaintext recipient PII violates the approved storage contract. Application rollback must preserve the encrypted-recipient schema; take a pre-migration snapshot and restore it only when a true DB rollback is required.
- None. Migration 0018 remains intentionally irreversible by approved contract; the executed DOWN rejection and integrity evidence is recorded above and in be/37.

## 22. Definition Of Done

- [x] Approved API, challenge, delivery-handoff, TTL, resend, limits, frontend route, audit, and `PUBLIC_APP_URL` decisions are recorded.
- [x] Scope, implementation, migration, and tests meet acceptance criteria.
- [x] Code Anti-Slop, lint, typecheck, database validation, security review, `git diff --check`, changed-file review, and secret review pass.
