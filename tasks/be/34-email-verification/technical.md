# be/34-email-verification — Email Verification Challenge Flow

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/34-email-verification` |
| Batch | Authentication email infrastructure |
| Owning Feature | Authentication |
| Workstream | Backend |
| Task Category | Security-sensitive capability |
| Repository/App | `apps/api` |
| Status | Blocked — challenge handoff and public API decisions require approval |
| Priority | High |
| Suggested Size | Small |
| Depends On | `be/09-password-hashing`, `be/14-audit-trail`, `be/31-email-foundation`, `be/32-email-template-foundation`, `be/33-email-queue-worker` |
| Blocks | `be/35-password-recovery`, `be/37-auth-email-quality-gate` |
| Execution Order | 34 |

## 2. Outcome

Provide a one-time, expiring email-verification challenge lifecycle that updates `users.emailVerifiedAt` only after a valid challenge is consumed and sends a verification email without exposing its raw security token outside the recipient message.

## 3. Context

`users.emailVerifiedAt` exists, but no challenge or delivery model exists. Current authentication is module-first and uses generic public failures. The default BullMQ queue and a read-only Basic-Auth Queue Monitor exist. Task 33 is blocked until a secure token-to-worker handoff is approved; this task must use that approved mechanism.

## 4. Dependencies

Requires completed SMTP, templates, queue worker, audit service, and approved challenge handoff. The public route, caller identity, resend policy, frontend verification URL, and exact response bodies are unresolved product/API decisions.

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
- Request/resend behavior must not disclose whether an email or account exists. Reuse the existing rate-limit/error conventions; numeric resend limits and cooldowns require an approved contract before implementation.
- Raw tokens, link query values, rendered message bodies, recipient addresses, and provider errors must never enter BullMQ payloads, Queue Monitor data, logs, audit metadata, database plaintext, or public responses.
- Do not implement a route or storage format until task 33’s safe delivery handoff is approved.

## 9. Applicable Contracts

### API Contract

`TODO: REQUIREMENT NEEDED` — approve method/path, authentication requirement, request fields, response body, status codes, resend behavior, and whether a logged-in user may request verification for only their own address. Existing public auth routes use `/api/v1/auth`; route placement must follow the approved module contract.

### Database Contract

Proposed only after approval: an entity-scoped `auth_challenges` table with stable ID, `userId`, `purpose`, one-way `tokenHash`, `expiresAt`, `usedAt`, `revokedAt`, and timestamps. It must use a foreign key to users, indexes for lifecycle lookup, a purpose constraint, and a focused Drizzle UP/DOWN migration. No raw token or message body may persist.

### Configuration Contract

| Concept | Required | Validation | Default | Secret |
| --- | --- | --- | --- | --- |
| Verification link base URL | Yes for delivery | approved absolute public URL | None — approved configuration required | No |
| Challenge TTL | Yes | positive bounded duration | `TODO: REQUIREMENT NEEDED` | No |
| Resend cooldown/rate limit | Yes | positive bounded policy | `TODO: REQUIREMENT NEEDED` | No |

### UI Contract

Not applicable — frontend verification and account screens are separate work.

## 10. File Impact

Expected create: entity schema/migration pair, auth challenge repository/service/validation/tests, verification template usage, module OpenAPI update if an endpoint is approved. Expected modify: auth module composition and audit integration. Expected paths are guidance; inspect the repository before implementation. No frontend or unrelated role/permission change.

## 11. Runtime Behavior

Approved request arrives → validate input and apply generic-response/rate-limit rules → generate raw token → transaction stores challenge hash and required audit data → approved delivery handoff enqueues opaque work → worker renders and sends link → recipient submits raw token → service validates and consumes challenge transactionally → `emailVerifiedAt` is set → safe audit event records completion.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Unknown, disabled, or deleted email | generic approved response | no account disclosure |
| Prior active verification challenge | follow approved revoke/supersede policy | avoid multiple valid links |
| Expired, used, revoked, or invalid token | approved generic invalid-link result | no token detail exposed |
| Delivery enqueue failure | transaction/outbox result follows approved task-33 handoff | challenge must not silently claim delivery |
| Duplicate consume request | idempotent safe result defined by API contract | no duplicate state/audit side effects |

## 13. Security Requirements

Use cryptographically secure token generation, one-way storage, strict expiry and single use. Preserve generic auth failures, input validation, existing auth middleware, request IDs, redaction, and audit metadata allowlists. Do not put authentication secrets in URL logs, browser telemetry, queue payloads, or persisted message content.

## 14. Test Requirements

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Valid one-time verification | updates `emailVerifiedAt`, consumes challenge, records audit | integration |
| Expired/revoked/used/invalid token | no user change and safe response | integration |
| Request for known and unknown email | indistinguishable public response | integration/security |
| Resend and cooldown | approved policy enforced without raw-token leakage | integration |
| Queue payload/log/audit inspection | contains no raw token, recipient, or rendered body | unit/integration |
| Migration UP/DOWN/reapply | entity schema rolls forward/back in isolated DB | database |

Use synthetic recipients and a fake SMTP transport only; no external mail delivery.

## 15. Task-Level Expected Results

- Approved verification lifecycle has one source of truth and atomic state changes.
- Verification delivery uses the approved opaque handoff.
- Public behavior is enumeration-safe and lifecycle failures are auditable without sensitive data.

## 16. Acceptance Criteria

- [ ] A valid, unexpired, unused verification challenge sets `emailVerifiedAt` exactly once.
- [ ] Invalid, expired, revoked, and consumed challenges cannot verify an account.
- [ ] No raw token or message content appears in persistence, logs, audits, or queue inspection.
- [ ] Request/resend behavior and public errors follow an approved non-enumerating API contract.
- [ ] Required migration and focused tests pass.

## 17. Anti-Slop Requirements

Code Anti-Slop is required: reject generic token frameworks, duplicate auth state, unsafe `any`/assertions, plaintext fallback paths, hidden TODO implementation, and unused abstractions. UI Anti-Slop is not applicable. Visual verification is not applicable.

## 18. Validation Requirements

- Static: applicable API lint, TypeScript, formatting, and `git diff --check`.
- Automated tests: auth/challenge unit and integration tests, secret-leak regression checks.
- Database: isolated Drizzle migration UP, DOWN, and reapply validation.
- Security: review rate limit, enumeration, redaction, audit, and session-policy boundaries.
- Anti-Slop: Code Anti-Slop pass.

## 19. Completion Evidence

AC-001/002 → challenge lifecycle integration tests. AC-003 → queue/log/audit redaction tests and changed-file review. AC-004 → route contract tests. AC-005 → isolated migration output, lint/typecheck, and `git diff --check`.

## 20. Traceability

Not applicable — project has no traceability ID system for this capability.

## 21. Open Points

- `BLOCKED`: approve the safe raw-token-to-worker delivery mechanism in task 33. A job containing only `emailDeliveryId` cannot reconstruct an arbitrary generated raw token without an approved safe design.
- Approve public API routes, response semantics, TTL, resend cooldown/rate limits, redirect URL, and whether delivery is available to unauthenticated callers.
- Approve challenge hashing/token design and audit event names such as `auth.email_verification.requested` and `auth.email_verification.completed`.

## 22. Definition Of Done

- [ ] Approved API, challenge, delivery-handoff, and rate-limit decisions are recorded.
- [ ] Scope, implementation, migration, and tests meet acceptance criteria.
- [ ] Code Anti-Slop, lint, typecheck, database validation, security review, `git diff --check`, changed-file review, and secret review pass.
