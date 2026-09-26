# be/35-password-recovery — Password Recovery Challenge Flow

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/35-password-recovery` |
| Batch | Authentication email infrastructure |
| Owning Feature | Authentication |
| Workstream | Backend |
| Task Category | Security-sensitive capability |
| Repository/App | `apps/api` |
| Status | Blocked — public API, reset-session policy, and challenge handoff require approval |
| Priority | High |
| Suggested Size | Small |
| Depends On | `be/09-password-hashing`, `be/10-login-session`, `be/12-logout-revocation`, `be/14-audit-trail`, `be/31-email-foundation`, `be/32-email-template-foundation`, `be/33-email-queue-worker`, `be/34-email-verification` |
| Blocks | `be/37-auth-email-quality-gate` |
| Execution Order | 35 |

## 2. Outcome

Provide an enumeration-safe password-recovery request and one-time reset lifecycle using the shared approved auth-challenge model, with the raw reset token delivered only to the recipient.

## 3. Context

Authentication already uses Argon2id passwords, explicit sessions, refresh-token rotation, and revocation. `users.mustChangePassword` exists. There is no password-recovery endpoint or challenge state. The password-reset effect on existing sessions is a security policy decision that current source does not define.

## 4. Dependencies

Requires the approved shared challenge schema/lifecycle from task 34 and safe delivery handoff from task 33. Reset paths, successful-response wording, password rules, rate limits, frontend URL, whether `mustChangePassword` is cleared, and session-revocation policy require approval.

## 5. In Scope

- Add an approved `password_reset` challenge purpose and recovery/reset service behavior.
- Preserve non-enumerating recovery requests and one-time, expiring reset tokens.
- Update the password through the established hashing boundary, apply approved session policy, create safe audit records, and add focused tests.

## 6. Out of Scope

First-login reset UX, password-history/breach checks, MFA recovery, account unlock, registration, password policy redesign, frontend pages, and unapproved session or permission changes.

## 7. Existing Implementation

Inspect `apps/api/src/modules/auth/**`, `modules/user/**`, `db/schema/users.ts`, auth session/refresh-token/revocation repositories, audit module, existing login validation, and task-34 challenge implementation before implementation.

## 8. Implementation Requirements

- Recovery request must give the same approved public response for unknown, deleted, disabled, and active accounts.
- Generate raw reset material before enqueueing, persist only its approved one-way representation, and use task-33’s approved opaque delivery handoff.
- Reset consumes one valid `password_reset` challenge atomically with password-hash update and required audit record.
- Reuse existing password hashing and validation boundaries; never trim, log, persist, or return a plaintext password.
- Existing session/refresh-token handling after reset must follow an explicit human-approved policy. Do not silently revoke all sessions or leave them valid by convention.
- Define `mustChangePassword` treatment explicitly before coding; this task must not infer it from password reset.
- Error, audit, queue, and provider paths must not expose raw tokens, email addresses, password values/hashes, or reset-link contents.

## 9. Applicable Contracts

### API Contract

`TODO: REQUIREMENT NEEDED` — approve request/reset methods and paths, request shapes, public success/error response bodies, authenticated/unauthed reset behavior, password validation errors, and status codes. Follow the existing `/api/v1/auth` module boundary once approved.

### Database Contract

Reuse the approved `auth_challenges` entity from task 34 with purpose `password_reset`; do not add a separate plaintext reset-token field. Any changed session/revocation records require the approved owner task and a focused migration only if the current schema cannot express the selected policy.

### Configuration Contract

| Concept | Required | Validation | Default | Secret |
| --- | --- | --- | --- | --- |
| Reset link base URL | Yes for delivery | approved absolute public URL | None — approved configuration required | No |
| Reset challenge TTL | Yes | positive bounded duration | `TODO: REQUIREMENT NEEDED` | No |
| Recovery rate/cooldown | Yes | approved bounded policy | `TODO: REQUIREMENT NEEDED` | No |

### UI Contract

Not applicable — password-recovery and reset pages are separate frontend work.

## 10. File Impact

Expected modify: auth service/router/controller/validation, shared challenge service, templates, audit wiring, and module OpenAPI only after API approval. Expected create: focused recovery tests. No frontend change or new permission code. Expected paths are guidance; inspect source before finalizing changes.

## 11. Runtime Behavior

Recovery request validates → returns generic response → eligible account receives a hashed, expiring challenge under approved controls → opaque delivery work sends reset link → recipient submits token and new password → service validates/consumes challenge and updates Argon2id hash in one transaction → approved session policy executes → safe audit event records outcome.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Unknown/deleted/disabled account | generic recovery response | prevent account enumeration |
| Invalid/expired/revoked/used token | safe approved invalid-link response | no state change |
| Concurrent reset submissions | exactly one may consume the challenge | transaction prevents double reset |
| Enqueue or provider failure | follows approved delivery state/outbox contract | never claim email was sent falsely |
| Existing sessions after reset | follow approved policy | no implicit security behavior |

## 13. Security Requirements

Preserve Argon2id, generic authentication failures, strict trust-boundary validation, redacted logging, bounded safe audit metadata, and token secrecy. Do not weaken current refresh rotation, revocation checks, route guards, or RBAC. Password-reset security must not depend on frontend enforcement.

## 14. Test Requirements

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Recovery for known and unknown email | same public response | integration/security |
| Valid reset | changes hash once and consumes challenge | integration |
| Invalid/expired/revoked/used reset token | cannot change password | integration |
| Concurrent consume | one success, no double mutation | integration |
| Approved session policy | sessions/revocations match approved rule | integration/security |
| Sensitive-data inspection | no passwords/tokens/recipients in logs/audit/queue | unit/integration |

Use synthetic data and fake transport; never send external email.

## 15. Task-Level Expected Results

- Password recovery is generic to callers and safe against enumeration.
- Reset is single use, bounded by expiry, and uses the established password boundary.
- Session effects and audit are explicit and testable.

## 16. Acceptance Criteria

- [ ] Recovery requests cannot reveal account existence or status.
- [ ] Only a valid, unexpired, unconsumed reset challenge changes a password.
- [ ] Passwords, hashes, raw tokens, and email/link content do not leak into logs, audits, database plaintext, or queue data.
- [ ] Session and `mustChangePassword` effects follow recorded human approval.
- [ ] Focused tests pass against synthetic data.

## 17. Anti-Slop Requirements

Code Anti-Slop is required: reject duplicate token systems, generic auth wrappers, unsafe casts, fake dispatch success, logging shortcuts, stale TODOs, and unused abstractions. UI Anti-Slop and visual verification are not applicable.

## 18. Validation Requirements

- Static: applicable lint, TypeScript, formatting, and `git diff --check`.
- Automated tests: recovery lifecycle, enumeration, concurrency, chosen session policy, and secret-leak regression.
- Database: reuse task-34 migration validation; validate any newly approved migration UP/DOWN/reapply.
- Security: review token, password, audit, queue, and session boundaries.
- Anti-Slop: Code Anti-Slop pass.

## 19. Completion Evidence

AC-001 → public-response integration test. AC-002 → lifecycle and concurrency tests. AC-003 → secret-leak tests and source review. AC-004 → session and user-flag integration tests. AC-005 → command output, diff review, and `git diff --check`.

## 20. Traceability

Not applicable — project has no traceability ID system for this capability.

## 21. Open Points

- `BLOCKED`: approve task-33 raw-token delivery handoff.
- Approve API route/response contracts, reset TTL, rate/cooldown policy, frontend URL, and password validation response semantics.
- Approve whether reset revokes current/all sessions and refresh tokens, and whether it clears `mustChangePassword`.
- Approve audit names, for example `auth.password_reset.requested` and `auth.password_reset.completed`.

## 22. Definition Of Done

- [ ] Open security and API decisions are approved and recorded.
- [ ] Implementation, tests, and any migration meet accepted scope.
- [ ] Code Anti-Slop, lint, typecheck, database validation where applicable, security review, `git diff --check`, changed-file review, and secret review pass.
