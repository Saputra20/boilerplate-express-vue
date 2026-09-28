# be/35-password-recovery — Password Recovery Challenge Flow

## 1. Metadata

| Field           | Value                                                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID         | `be/35-password-recovery`                                                                                                                                                                                            |
| Batch           | Authentication email infrastructure                                                                                                                                                                                  |
| Owning Feature  | Authentication                                                                                                                                                                                                       |
| Workstream      | Backend                                                                                                                                                                                                              |
| Task Category   | Security-sensitive capability                                                                                                                                                                                        |
| Repository/App  | `apps/api`                                                                                                                                                                                                           |
| Status          | COMPLETE                                                                                                                                                                                                             |
| Priority        | High                                                                                                                                                                                                                 |
| Suggested Size  | Small                                                                                                                                                                                                                |
| Depends On      | `be/09-password-hashing`, `be/10-login-session`, `be/12-logout-revocation`, `be/14-audit-trail`, `be/31-email-foundation`, `be/32-email-template-foundation`, `be/33-email-queue-worker`, `be/34-email-verification` |
| Blocks          | `be/37-auth-email-quality-gate`                                                                                                                                                                                      |
| Execution Order | 35                                                                                                                                                                                                                   |

## 2. Outcome

Provide an enumeration-safe password-recovery request and one-time reset lifecycle using the shared approved auth-challenge model, with the raw reset token delivered only to the recipient.

## 3. Context

Authentication already uses Argon2id passwords, explicit sessions, refresh-token rotation, and revocation. `users.mustChangePassword` exists. The approved reset flow now adds public recovery endpoints over the shared challenge state.

## 4. Dependencies

Requires the shared challenge model from task 34, the encrypted opaque delivery handoff from task 33, central `PUBLIC_APP_URL`, existing Argon2id password validation, session revocation, and audit services. Approved changes extend the existing challenge-purpose constraint to `password_reset`.

## 5. In Scope

- Add an approved `password_reset` challenge purpose and recovery/reset service behavior.
- Preserve non-enumerating recovery requests and one-time, expiring reset tokens.
- Update the password through the established hashing boundary, apply approved session policy, create safe audit records, and add focused tests.
- Revoke every active session and its refresh tokens after a successful reset; set `users.mustChangePassword=false` in the same transaction.

## 6. Out of Scope

First-login reset UX, password-history/breach checks, MFA recovery, account unlock, registration, password policy redesign, frontend pages, and unapproved session or permission changes.

## 7. Existing Implementation

Inspect `apps/api/src/modules/auth/**`, `modules/user/**`, `db/schema/users.ts`, auth session/refresh-token/revocation repositories, audit module, existing login validation, and task-34 challenge implementation before implementation.

## 8. Implementation Requirements

- Recovery request must give the same approved public response for unknown, deleted, disabled, and active accounts.
- Generate raw reset material before enqueueing, persist only its approved one-way representation, and use task-33’s approved opaque delivery handoff.
- Reset consumes one valid `password_reset` challenge atomically with password-hash update and required audit record.
- Reuse existing password hashing and validation boundaries; never trim, log, persist, or return a plaintext password.
- After successful reset, revoke every active session and its refresh tokens and set `mustChangePassword=false` in the same transaction, as explicitly approved.
- Write `auth.password_reset.requested` only when an eligible account receives a challenge, and write `auth.password_reset.completed` atomically with reset completion. Do not add other reset audit event names without approval.
- Error, audit, queue, and provider paths must not expose raw tokens, email addresses, password values/hashes, or reset-link contents.

## 9. Applicable Contracts

### API Contract

Approved public unauthenticated endpoints under `/api/v1/auth`:

| Method | Path                      | Request                                   | Success                                                                                                                                 | Failure                                                                                                                                                                                                                                                                             |
| ------ | ------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/password-reset/request` | `{ "email": string }`                     | `202 { "message": "If the account is eligible for a password reset, a reset email will be sent." }` for all account and delivery states | `400 Bad request` for invalid email; `429 Too many requests` for source-IP request limit                                                                                                                                                                                            |
| POST   | `/password-reset/confirm` | `{ "token": string, "password": string }` | `204 No Content`                                                                                                                        | `400 Bad request` for malformed/password-policy input; `400 { "message": "Invalid or expired password reset token", "code": "invalid_or_expired_password_reset_token" }` for unknown, invalid, expired, revoked, or used token; `429 Too many requests` for source-IP attempt limit |

Request and confirmation require no bearer authentication. Do not disclose account eligibility, challenge state, or queue outcome.

### Database Contract

Reuse task 34's `auth_challenges` entity with purpose `password_reset`; do not add a separate plaintext reset-token field. Add one focused migration to extend the purpose check. Its DOWN must reject before schema mutation if password-reset challenges remain, rather than deleting challenge state. No session/revocation schema change is required.

### Configuration Contract

| Concept             | Required         | Validation                                                                                                    | Default                                                                                 | Secret                                               |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Reset link base URL | Yes for delivery | validated centralized `PUBLIC_APP_URL`; absolute HTTPS in production, explicit loopback HTTP only in dev/test | None — required when email delivery is enabled                                          | No                                                   |
| Reset challenge TTL | Yes              | fixed server-side duration                                                                                    | 1 hour                                                                                  | No                                                   |
| Request limits      | Yes              | existing rate-limit middleware and DB account controls                                                        | 5/hour per normalized email; 20/hour per source IP; 60-second eligible-account cooldown | No                                                   |
| Reset attempt limit | Yes              | existing rate-limit middleware                                                                                | 20 attempts per 15 minutes per source IP                                                | No                                                   |
| New password        | Yes              | reuse `hashPassword`; 12–128 Unicode code points, no trimming                                                 | None                                                                                    | Yes before hashing; never persisted/logged plaintext |

### UI Contract

Not applicable — password-recovery and reset pages are separate frontend work.

## 10. File Impact

Expected modify: auth service/router/controller/validation, shared challenge schema/migration, task-33 email delivery wiring, module OpenAPI, and task docs. Expected create: focused recovery service/repository/controller/limiter tests and challenge-purpose migration with guarded DOWN. No frontend change or new permission code. Expected paths are guidance; inspect source before finalizing changes.

## 11. Runtime Behavior

Recovery request validates and applies IP/account limits → eligible active non-deleted account receives a SHA-256-hashed 32-byte random token challenge expiring in one hour, replacing only prior active password-reset challenges → request audit is stored → task-33 receives the raw-token reset link only in encrypted delivery context → every caller gets the same generic `202`. Confirmation validates token and existing password rules, hashes the new password, then atomically locks user/challenge, consumes the challenge, changes the hash, clears `mustChangePassword`, revokes all active sessions and their refresh tokens, and appends completion audit → returns `204`. Invalid/expired/revoked/used tokens share one `400` error. All account eligibility and delivery outcomes remain hidden.

## 12. Error And Edge Cases

| Scenario                           | Expected Result                                                             | Security / Recovery                                                             |
| ---------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Unknown/deleted/disabled account   | generic recovery response                                                   | prevent account enumeration                                                     |
| Invalid/expired/revoked/used token | safe approved invalid-link response                                         | no state change                                                                 |
| Concurrent reset submissions       | exactly one may consume the challenge                                       | transaction prevents double reset                                               |
| Enqueue or provider failure        | follows approved delivery state/outbox contract                             | never claim email was sent falsely                                              |
| Existing sessions after reset      | revoke all active sessions and their refresh tokens in the same transaction | access tokens fail session validation; no newly issued session                  |
| Repeated/concurrent confirmation   | only one request changes password                                           | user lock serializes reset submissions and the consumed challenge cannot replay |

## 13. Security Requirements

Preserve Argon2id, generic authentication failures, strict trust-boundary validation, redacted logging, bounded safe audit metadata, and token secrecy. Do not weaken current refresh rotation, revocation checks, route guards, or RBAC. Password-reset security must not depend on frontend enforcement.

## 14. Test Requirements

| Scenario                                 | Expected Result                                    | Test Type            |
| ---------------------------------------- | -------------------------------------------------- | -------------------- |
| Recovery for known and unknown email     | same public response                               | integration/security |
| Valid reset                              | changes hash once and consumes challenge           | integration          |
| Invalid/expired/revoked/used reset token | cannot change password                             | integration          |
| Concurrent consume                       | one success, no double mutation                    | integration          |
| Approved session policy                  | sessions/revocations match approved rule           | integration/security |
| Sensitive-data inspection                | no passwords/tokens/recipients in logs/audit/queue | unit/integration     |

Use synthetic data and fake transport; never send external email.

## 15. Task-Level Expected Results

- Password recovery is generic to callers and safe against enumeration.
- Reset is single use, bounded by expiry, and uses the established password boundary.
- Session effects and audit are explicit and testable.

## 16. Acceptance Criteria

- [ ] Recovery requests cannot reveal account existence or status.
- [ ] Only a valid, unexpired, unconsumed reset challenge changes a password.
- [ ] Passwords, hashes, raw tokens, and email/link content do not leak into logs, audits, database plaintext, or queue data.
- [ ] All active sessions and refresh tokens are revoked; `mustChangePassword` is cleared atomically, as approved.
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

Current evidence:

| Check                                           | Status | Evidence                                                                                                                                                                                                                                        |
| ----------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementation                                  | PASS   | Recovery service/repository, API routes, validation, rate limits, challenge-purpose migration, and OpenAPI are present.                                                                                                                         |
| Focused tests                                   | PASS   | `bun run test --runTestsByPath tests/password-recovery.test.ts tests/identity-schema.test.ts tests/password.test.ts tests/email-verification.test.ts tests/email-delivery-service.test.ts` — 5 suites, 41 tests passed.                         |
| Lint                                            | PASS   | `bun run lint`                                                                                                                                                                                                                                  |
| Typecheck                                       | PASS   | `bun run typecheck`                                                                                                                                                                                                                             |
| Formatting                                      | PASS   | Installed Prettier binary checked all changed task and password-recovery files.                                                                                                                                                                 |
| Diff check                                      | PASS   | `git diff --check`                                                                                                                                                                                                                              |
| PostgreSQL integration and migration validation | PASS   | Password recovery integration passed challenge persistence/consumption, expiry/single use, atomic reset, session/refresh revocation, flag clearing, audit, and guarded DOWN; migration 0019 clean DOWN/RE-UP also passed in an isolated schema. |
| OpenAPI/Supertest HTTP checks                   | PASS   | Auth HTTP and OpenAPI checks passed in the be/37 focused and full suite runs.                                                                                                                                                                   |
| Code Anti-Slop                                  | PASS   | Reviewed changed password-recovery source/tests for duplication, unused code/dependencies, fake behavior, unsafe casts, and hidden TODO/FIXME/HACK markers; removed an unused limit constant.                                                   |

AC-001 → recovery HTTP/OpenAPI and generic-response tests passed in focused/full suite. AC-002/004 → PostgreSQL integration passed lifecycle, concurrency, session/refresh revocation, flag clearing, and audit assertions. AC-003 → focused failure tests and secret review passed; fake transport only. AC-005 → full suite, lint/typecheck/format, Code Anti-Slop, and final diff review passed; migration 0019 UP/DOWN/RE-UP proof recorded by be/37.

## 20. Traceability

Not applicable — project has no traceability ID system for this capability.

## 21. Open Points

None. Migration 0019's guarded DOWN behavior and clean DOWN/RE-UP behavior both passed against disposable PostgreSQL; the broader gate evidence is recorded by be/37.

## 22. Definition Of Done

- [x] Open security and API decisions are approved and recorded.
- [x] Implementation and focused unit tests meet accepted scope.
- [x] PostgreSQL integration tests and migration UP/DOWN/reapply validation pass.
- [x] Lint, typecheck, and security source review pass.
- [x] Code Anti-Slop, formatting, `git diff --check`, changed-file review, and secret review pass.
