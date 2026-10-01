# be/39-authenticated-self-service-password-change - Authenticated Self-Service Password Change

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/39-authenticated-self-service-password-change` |
| Batch | Account self-service |
| Owning Feature | CMS account security |
| Workstream | Backend |
| Task Category | Authenticated API/session security |
| Repository/App | `apps/api` |
| Status | COMPLETE |
| Priority | Security-sensitive |
| Suggested Size | Medium |
| Depends On | `be/09-password-hashing`, `be/10-login-session`, `be/11-refresh-token`, `be/12-logout-revocation`, `be/14-audit-trail`, `be/21-api-module-architecture-refactor`, `be/35-password-recovery`, `be/37-auth-email-quality-gate`, `be/38-authenticated-first-login-password-change` |
| Blocks | `fe/25-change-password` |
| Execution Order | 39 |

## 2. Outcome

The auth module provides `POST /api/v1/auth/change-password/self-service` for an authenticated user to voluntarily change their own password. The operation verifies the current password, reuses the canonical password policy and hash helper, rejects mandatory-change sessions, retains the current session, revokes other sessions, and records the result through the existing audit service.

## 3. Context

- `tasks/be/38-authenticated-first-login-password-change/technical.md` defines the distinct mandatory-only `POST /api/v1/auth/change-password` operation. Its `changeFirstLoginPassword` operation returns `409 password_change_not_required` when the DB flag is false. Preserve that contract and route behavior.
- `tasks/fe/25-change-password/technical.md` consumes this authenticated voluntary contract. Its UI remains out of scope here.
- `apps/api/src/modules/auth/` owns authentication endpoints and their services, repositories, controllers, validation, and OpenAPI.
- `apps/api/src/helpers/password.helper.ts` defines Argon2id hashing and the canonical 12-128 Unicode code-point length rule. It does not define composition, breach, or password-history checks.
- `apps/api/src/modules/auth/v1/password-attempt-rate-limit.ts` defines the existing 20-attempts-per-source-IP/15-minute limiter used by password operations.
- BE-38 established current-session retention, revocation of other active sessions and their refresh tokens, and transactional success audit. This task uses that session pattern while keeping the voluntary endpoint and mandatory endpoint behavior separate.
- `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/SECURITY.md`, and `docs/DATABASE.md` define module ownership, API conventions, security and audit constraints, and the existing session tables.

## 4. Dependencies

- The listed identity, refresh/revocation, audit, password-hashing, auth-module, and API-quality tasks are existing foundations. Verify their runtime implementation before changing code.
- `be/38-authenticated-first-login-password-change` supplies the existing DB-backed mandatory flag, session verification, password helper usage, audit service, limiter, and current/other-session revocation pattern. It does not authorize changing its public operation semantics.
- `fe/25-change-password` is downstream. On completion, provide its exact method/path/request/success/errors/password rules/session result and update only its dependency/contract reference as required by the existing task handoff convention. Do not implement CMS code.
- No new infrastructure, environment variable, external service, database entity, or migration is expected.

## 5. In Scope

- Add the distinct authenticated operation `POST /api/v1/auth/change-password/self-service`, with OpenAPI `operationId: changeCurrentUserPassword`.
- Require a strict `{ currentPassword, newPassword }` request. Current-password verification is required; confirmation remains frontend-only.
- Derive user and session identity from the authenticated access principal only.
- Reuse `isValidPassword`, `verifyPassword`, and `hashPassword` from the canonical password helper. Do not add password composition, breach, expiration, or history rules.
- Reject a user whose current DB-backed `mustChangePassword` is true with `403 password_change_required`; do not clear or modify that flag.
- Atomically update only the user's password hash, revoke other active sessions and their active refresh tokens, and write the required success audit event. Preserve the current session and its refresh token.
- Reuse the existing password attempt limiter and current audit infrastructure.
- Add focused service, HTTP, isolated PostgreSQL, concurrency, audit, session, and OpenAPI tests.
- Update `docs/API.md` and the FE-25 dependency handoff after implementation so runtime, OpenAPI, and frontend contract agree.

## 6. Out of Scope

- Any semantic or implementation change to `POST /api/v1/auth/change-password` or FE-24.
- Public password-reset, email verification, administrative password reset, profile updates, or frontend UI.
- Password-history, breached-password checks, MFA, password expiration, composition rules, or other policy absent from the canonical helper.
- New session or token-family infrastructure, JWT claims, database tables/columns/indexes, or migrations.
- Revoking all sessions including the current one, rotating the current session, issuing replacement tokens, or changing refresh-token rotation policy.
- General auth-module refactors unrelated to the new operation.

## 7. Existing Implementation

- `apps/api/src/modules/auth/auth.module.ts` composes auth services and the module-relative v1 router.
- `apps/api/src/modules/auth/v1/auth.router.ts` registers the mandatory password route with access authentication configured to allow mandatory-change users, followed by the shared password limiter.
- `apps/api/src/modules/auth/v1/{controllers/password-change.controller.ts,validation/password-change.validation.ts}` parse and transport the mandatory operation.
- `apps/api/src/modules/auth/services/password-change.service.ts` uses canonical password helpers and existing best-effort failed-current-password audit behavior.
- `apps/api/src/modules/auth/repositories/password-change.repository.ts` locks the user/session rows, updates the hash and mandatory flag, revokes other sessions and refresh tokens, and writes transactional success audit. The voluntary path must not clear the flag and must reject a true flag.
- `apps/api/src/modules/auth/v1/password-attempt-rate-limit.ts` provides the established rate limit.
- `apps/api/src/modules/auth/v1/auth.openapi.yaml` describes `changeFirstLoginPassword` and its stable errors.
- `apps/api/src/modules/audit/services/audit.service.ts` and its repository provide required and informational audit methods.
- `apps/api/src/helpers/password.helper.ts` provides Argon2id operations and password-length validation.
- Existing tests include `apps/api/tests/password-change.test.ts`, `password-change.integration.test.ts`, `password-recovery.test.ts`, `refresh-token.test.ts`, and `openapi.test.ts`.
- `apps/api/src/config/drizzle/schema/{users,auth-sessions,auth-challenges}.schema.ts` and existing refresh-token schema hold required records; inspect actual relation and transaction behavior before edits.

## 8. Implementation Requirements

1. Register a separate module-relative `POST /change-password/self-service` route, mounted by existing composition at `/api/v1/auth`. Use `operationId: changeCurrentUserPassword`; retain `changeFirstLoginPassword` for the existing route.
2. Require bearer access authentication using the default `createAccessAuthMiddleware` policy. The mandatory flag must not be exempted. Re-read and lock current user/session state in the repository transaction so a changed flag or revoked/expired session cannot race through the controller.
3. Accept only a JSON object with exactly `currentPassword` and `newPassword`, both strings. Reject extra keys and malformed values using established safe `400 { message: "Bad request" }` handling. Do not accept user ID, session ID, token, or `confirmPassword` in the body.
4. Do not trim or normalize either password. `newPassword` must pass the canonical helper's 12-128 Unicode code-point length rule. No composition, breach, history, or expiration check is added. `currentPassword` is verified against the locked user's existing Argon2id hash. If the exact new value equals the verified current value, reject with `password_unchanged`.
5. For a current DB flag of true, return `403 { message: "Password change required", code: "password_change_required" }`. The middleware should reject it before controller execution in the normal path; the transaction recheck must preserve the same code if the state changed after middleware authentication.
6. For valid input, within one transaction lock and recheck active user and current session; verify the current password; hash the new password with `hashPassword`; update only `users.password_hash`; revoke all other unrevoked, unexpired sessions and their active unexpired refresh tokens; and append required success audit. Do not update `users.must_change_password`.
7. Use session policy A: retain the current session, its current access token validity, and its current refresh-token chain; revoke other active sessions and all their active refresh-token records. No replacement tokens are returned. Access requests from revoked sessions fail through existing session revocation checks. Preserve the existing hard session expiry and refresh rotation rules.
8. Serialize concurrent operations by locking the user row before verifying/updating. A request using an old current password after another change must fail as `invalid_current_password`; each committed request must leave one valid new hash, a consistent session set, matching refresh-token revocations, and one success audit.
9. Return `204 No Content` on success. Do not include user data, password state, or tokens in the response. FE-25 remains authenticated; it does not need token replacement or `/me` refresh because this operation does not alter identity context. Its exact session behavior is current session retained and other sessions revoked.
10. Errors use existing safe API envelopes: `401` generic invalid authentication/session; `400 invalid_current_password`; `400 password_policy_violation`; `400 password_unchanged`; `403 password_change_required`; `413` existing body limit; `429` existing password-attempt limiter response; and safe centralized `500`. Return no raw exceptions, password values, or hashes.
11. Reuse `createPasswordAttemptLimiter()` with its existing limit of 20 requests per source IP in a 15-minute window; do not create a second arbitrary policy. Keep the mandatory and voluntary route middleware options distinct.
12. Record required successful audit in the same DB transaction using existing generic `audit_events` service. Use event type `auth.password_change.completed`, `outcome: success`, actor/resource as the authenticated user, request ID, current session ID, IP, and user agent; allowlist metadata `{ flow: "self_service", otherSessionsRevoked: number }`. Record an invalid-current-password attempt best-effort using `auth.password_change.failed`, `outcome: failure`, reason `INVALID_CURRENT_PASSWORD`, and allowlisted `{ flow: "self_service" }` metadata. Audit failure for success rolls back the password/session transaction; failure audit outage does not change the credential response. Never record passwords, hashes, tokens, headers, cookies, bodies, or exception stacks.
13. Keep the existing mandatory operation's current request/response, errors, DB flag clearing, session outcome, audit behavior, rate limit, route security option, and OpenAPI operationId unchanged. Reuse helpers/primitives without merging externally visible semantics.
14. Extend the auth module composition, router, controller, validation, service/repository, and module-local OpenAPI only. Do not create a new `apps/api/src` root, generic password service framework, or new dependency.
15. Update `docs/API.md` and FE-25's dependency/contract reference only after implementation matches this contract. Do not change FE-25 behavior or implement its UI.

## 9. Applicable Contracts

### Configuration Contract

Not applicable - no configuration changes.

### API Contract

All paths are full application paths.

| Method | Path | Auth | Request | Success | Errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/change-password/self-service` | Bearer access token; active user/session; `mustChangePassword` must be false | Strict `{ currentPassword: string, newPassword: string }` | `204 No Content`; current session and refresh chain remain active; other active sessions and their active refresh tokens are revoked | `400 invalid_current_password`; `400 password_policy_violation`; `400 password_unchanged`; `401` generic invalid authentication; `403 password_change_required`; `413` existing body limit; `429` existing rate-limit response; safe `500` |

Request values are opaque and are not trimmed or normalized. `newPassword` must be 12-128 Unicode code points. Confirmation is not accepted by the API.

| Status / code | Meaning |
| --- | --- |
| `400 invalid_current_password` | Supplied current password does not verify; no password/session change; best-effort failed-attempt audit is attempted |
| `400 password_policy_violation` | New password fails canonical 12-128 code-point validation |
| `400 password_unchanged` | New password equals the verified current password |
| `401` | Invalid, expired, revoked, or otherwise invalid authenticated session; generic message |
| `403 password_change_required` | User still must change password through the mandatory first-login flow |
| `429` | Existing password attempt limit; response remains `{ message: "Too many requests" }` |
| `500` | Safe centralized server failure; no implementation detail |

The existing `POST /api/v1/auth/change-password` contract is unchanged and remains mandatory-only (`operationId: changeFirstLoginPassword`, `204` success, `409 password_change_not_required` when the DB flag is false).

### Database Contract

Use existing `users.password_hash`, `users.must_change_password`, `auth_sessions`, refresh-token rows, and generic `audit_events`. For a voluntary success, update only the password hash; `must_change_password` remains false and unchanged. In one transaction, update the hash, revoke other active sessions and their active refresh tokens, and append required success audit. Preserve current session and refresh records. No schema change, migration, data backfill, or destructive operation.

### UI Contract

Not applicable - backend task. FE-25 consumes this API contract separately.

## 10. File Impact

| Classification | Expected files / impact |
| --- | --- |
| Expected Create: auth module | Separate self-service controller, validation, service, and repository under `apps/api/src/modules/auth/` if no focused equivalent exists. These are `module` files; do not add a new top-level source directory or separate auth submodule. |
| Expected Modify: auth module | `apps/api/src/modules/auth/auth.module.ts`, `apps/api/src/modules/auth/v1/auth.router.ts`, and `apps/api/src/modules/auth/v1/auth.openapi.yaml`; existing mandatory operation must retain its current behavior. |
| Expected Modify: durable API / FE handoff | `docs/API.md` and `tasks/fe/25-change-password/{technical.md,explanation.md}` only to record the completed dependency and actual frontend contract. No FE source/UI. |
| Expected Tests | Existing `apps/api/tests/` conventions for unit/service, router/HTTP, isolated PostgreSQL integration, audit, session/refresh, concurrency, and OpenAPI. |
| Expected Not Modified | DB schema/migrations, `apps/api/src/middleware/authentication.middleware.ts` unless inspection proves a route-level change is required, mandatory endpoint contract/semantics, login/refresh/logout behavior, reset/email flows, CMS source, manifests/dependencies, and unrelated modules. |

Expected paths are guidance; agent must inspect repository before finalizing changes. Ownership remains the existing `auth` module; request flow stays middleware -> router -> controller -> service -> repository -> database. Shared `helpers/password.helper.ts`, audit module, and middleware are reused. No new `apps/api/src` root directory is allowed.

## 11. Runtime Behavior

1. The API authenticates the bearer token through the existing access-auth middleware and rejects invalid/expired sessions with generic `401`.
2. The default mandatory-change middleware policy denies users whose DB-backed flag is true with `403 password_change_required`. The controller validates only the strict current/new password body.
3. The service applies the canonical new-password rule. The repository transaction locks and reloads the active user and current session, verifies the state and current password, then rejects equal current/new values.
4. On valid input, the transaction hashes and updates the password, revokes other active sessions and their active refresh tokens, and writes required audit. It leaves the mandatory flag, current session, and current refresh chain unchanged.
5. The API returns `204` only after transaction commit. The CMS remains authenticated in its current session; there is no token response and no identity-context change.
6. Invalid current password, policy violation, same password, mandatory state, expired/revoked session, rate limit, and storage/audit failure return the defined safe outcome without partial credential or session mutation. Required audit failure rolls back success.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Missing/malformed/extra body field | `400` safe bad-request envelope | Strict schema; no request value disclosure |
| Invalid/expired/revoked access session | Generic `401` | Do not reveal account state |
| `mustChangePassword` true at middleware | `403 password_change_required` before controller | Mandatory flow remains the only password-change route for this state |
| Flag changes after middleware | Transaction recheck returns `403 password_change_required` | No race bypass; no partial write |
| Incorrect current password | `400 invalid_current_password`; state unchanged | Best-effort failure audit; limiter applies |
| New password outside canonical bounds | `400 password_policy_violation`; state unchanged | Same canonical helper as existing auth flow |
| New password equals verified current value | `400 password_unchanged`; state unchanged | Do not reveal stored hash |
| Current session or user becomes invalid | Generic `401`; no mutation | Transaction checks active user/session again |
| Two requests race | User-row lock serializes; old-current-password replay fails; every committed transition remains internally consistent | No partial session/token/audit state |
| Revoke other sessions or required audit fails | Transaction rolls back hash and all session/token changes | Fail closed for credential state |
| Invalid-current-password audit unavailable | Preserve `400 invalid_current_password` | Failed-attempt audit is best-effort under existing convention |
| Rate limit exceeded | Existing `429 { message: "Too many requests" }` | Shared password limiter; no credential details |
| Oversized body or unexpected infrastructure error | Existing `413` or sanitized `500` | No raw exception or sensitive value |

## 13. Security Requirements

- Authenticate from the bearer access token and derive user/session IDs only from the validated principal. Never accept user ID, session ID, reset token, or verification token from request body.
- Verify the current password before changing credentials. Apply current active-user/session and mandatory-flag checks under transaction lock.
- Use only Argon2id helpers. Never log, persist, return, audit, or include plaintext passwords, password hashes, access tokens, refresh tokens, authorization headers, or cookies.
- Enforce the canonical password rule without trimming or normalization. Do not add unapproved composition, breach, expiry, or history checks.
- Keep successful hash update, other-session/refresh revocations, and required audit atomic. Keep failed current-password audit best-effort and metadata allowlisted.
- Do not exempt this route from mandatory-change enforcement. Keep BE-38's explicit exception and `password_change_not_required` behavior unchanged.
- Reuse the current bounded IP rate limiter and safe error envelope. Never expose stack traces, DB details, account state, or credentials.

## 14. Test Requirements

| Category | Required proof |
| --- | --- |
| Happy Path | Authenticated compliant user with correct current password changes hash; old password stops working; new password verifies; response is 204; current session/refresh remain usable; other sessions/refresh tokens revoke; success audit commits |
| Validation | Strict object rejects missing, non-string, and extra fields; 12/128 Unicode code-point values pass; 11/129 fail; supplementary Unicode code points count correctly; no trimming; current and new same value returns stable error; confirmation is not accepted |
| Negative / Failure | Invalid/expired/revoked session, inactive/deleted user, wrong current password, mandatory flag true, rate limit, hash/DB/revocation/audit failures return exact safe outcomes with no partial success |
| Security | Body cannot choose another user/session; bearer auth required; mandatory route remains separate; response/log/audit never contains passwords, hashes, tokens, headers, cookies, or stack traces |
| Regression | Mandatory `/auth/change-password` retains its `changeFirstLoginPassword`, `mustChangePassword` gate, `409 password_change_not_required`, `204` session outcome, errors, audit, and limiter; reset, refresh rotation, logout, and auth middleware behavior remain intact |
| Isolation | Unit tests are deterministic; integration tests use isolated PostgreSQL and synthetic users/sessions/tokens; concurrent requests are exercised; setup/cleanup are deterministic and order-independent |

Do not rely only on mocked repositories for transactional hash, revocation, audit, and concurrency proof. OpenAPI tests must validate the new route and confirm the old operation is still separately documented.

## 15. Task-Level Expected Results

- A bearer-authenticated voluntary password-change endpoint exists under the existing auth module.
- Its public request, response, errors, validation, rate limit, and session behavior are stable and documented.
- The endpoint cannot change another user's password or bypass the mandatory first-login requirement.
- Password hash, other-session revocations, refresh-token revocations, and required audit commit atomically.
- BE-38 remains semantically unchanged; FE-25 receives the exact implemented contract.

## 16. Acceptance Criteria

- [x] `POST /api/v1/auth/change-password/self-service` exists with `operationId: changeCurrentUserPassword` and bearer authentication.
- [x] Request strictly accepts only `{ currentPassword, newPassword }`; identity comes only from authenticated principal.
- [x] Current password is verified; new password reuses the canonical 12-128 Unicode code-point rule; exact same password returns `400 password_unchanged`.
- [x] A user with `mustChangePassword === true` receives `403 password_change_required`; the flag is never cleared by this endpoint.
- [x] Success returns `204`, changes the Argon2id hash, preserves current session and refresh chain, revokes other active sessions and their active refresh tokens, and creates required audit in one transaction.
- [x] Wrong current password returns `400 invalid_current_password` and attempts best-effort audit without changing password/session state.
- [x] Existing password limiter is used at 20 attempts per source IP per 15 minutes; `429` response matches the existing contract.
- [x] OpenAPI documents method, path, operationId, auth, request, success, and every supported error; mandatory operation remains unchanged.
- [x] Isolated PostgreSQL integration tests prove transactional/session behavior, concurrency, audit rollback, and mandatory-flow boundary (6 passed against a disposable local PostgreSQL cluster).
- [x] API lint, typecheck, formatting, focused HTTP/OpenAPI tests (15 passed), Code Anti-Slop review, and `git diff --check` pass.
- [x] `docs/API.md` and FE-25 handoff identify the exact implemented contract; no FE source was changed for BE-39.

## 17. Anti-Slop Requirements

- **Code Anti-Slop:** required. Check for duplicated password policy, unnecessary generalized auth abstractions, duplicate session/token systems, dead code/dependencies, fake audit/revocation, hidden TODO/FIXME/HACK, unjustified `any`/assertions, and unrelated changes.
- **UI Anti-Slop:** not applicable - backend only.
- **Visual Verification:** not applicable - backend only.
- Keep the voluntary and mandatory routes explicit. Reuse existing module, hash helper, limiter, audit, transaction, and revocation patterns without weakening or merging their public contracts.

## 18. Validation Requirements

- **Static:** `bun run --cwd apps/api lint`, `bun run --cwd apps/api typecheck`, `bun run --cwd apps/api format:check`, and `git diff --check`.
- **Automated Tests:** focused unit/service/router tests; isolated PostgreSQL integration tests for hash, session/token revocation, audit rollback, mandatory boundary, and concurrency; `tests/openapi.test.ts`. Confirm exact commands and integration prerequisites during implementation.
- **Build:** Not applicable if `apps/api/package.json` has no build script; typecheck and runtime integration are the compile/runtime checks.
- **Database:** No schema change expected. If implementation proves a schema/migration is necessary, stop for separate approval; do not add one under this task.
- **UI:** Not applicable - backend only.
- **Anti-Slop:** run Code Anti-Slop against changed files, fix findings, and rerun.

## 19. Completion Evidence

- AC-001/002 -> router HTTP test, strict Zod validation test, and auth OpenAPI operation/security schema.
- AC-003 -> password helper/service tests for boundary lengths, Unicode code points, unchanged value, and no normalization.
- AC-004 -> HTTP and isolated DB tests for `mustChangePassword` enforcement and unchanged flag.
- AC-005/006 -> isolated PostgreSQL assertions passed in `tests/self-service-password-change.integration.test.ts`, including hash, current/other session state, refresh-token rows, audit metadata, and audit failure rollback.
- AC-007 -> route limiter test confirming 20/IP/15-minute configuration and response contract.
- AC-008 -> OpenAPI tests covering both distinct operations and all status/code responses.
- AC-009 -> focused HTTP/OpenAPI output: 2 suites and 15 tests passed; PostgreSQL integration output: 1 suite and 6 tests passed using a disposable local database.
- AC-010 -> lint, typecheck, format, focused API tests, OpenAPI assertions, Code Anti-Slop source review, database integration, and `git diff --check` pass.
- AC-011 -> `docs/API.md`, FE-25 task handoff diff, `git status`, and `git diff --check`.

## 20. Traceability

| Trace Type | References |
| --- | --- |
| PRD | Not defined for account self-service |
| Feature | `fe/25-change-password` |
| Requirement | User-provided authenticated voluntary/self-service password-change backend request |
| Acceptance Criteria | AC-001-AC-011 in this task |
| API Operation | `changeCurrentUserPassword`; `POST /api/v1/auth/change-password/self-service` |
| Database | Existing `users`, `auth_sessions`, refresh-token rows, generic `audit_events`; no schema change |
| Test IDs | Not applicable - project has no test ID registry |
| Design/Figma | Not applicable - backend only |

## 21. Open Points

None.

## 22. Definition Of Done

- [x] Acceptance criteria and approved scope are satisfied.
- [x] Separate voluntary endpoint is implemented without changing BE-38 route semantics.
- [x] Required isolated PostgreSQL, concurrency, and transactional audit tests pass (6 integration tests).
- [x] API lint, typecheck, format, HTTP/OpenAPI tests, runtime route proof, and Code Anti-Slop checks pass. API build is not applicable because no build script is defined.
- [x] No migration was added; database impact uses existing tables.
- [x] `git diff --check` passes; changed-file and secret/scope review completed.
- [x] `docs/API.md` and FE-25 dependency handoff match runtime and OpenAPI; no FE-25 UI was implemented.
