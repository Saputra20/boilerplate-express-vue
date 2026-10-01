# be/38-authenticated-first-login-password-change : Authenticated First-Login Password Change

## 1. Metadata

| Field           | Value                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID         | `be/38-authenticated-first-login-password-change`                                                                                                                                                                                         |
| Batch           | Authentication lifecycle                                                                                                                                                                                                                  |
| Owning Feature  | Authentication                                                                                                                                                                                                                            |
| Workstream      | Backend                                                                                                                                                                                                                                   |
| Task Category   | Security-sensitive API and session behavior                                                                                                                                                                                               |
| Repository/App  | `apps/api`                                                                                                                                                                                                                                |
| Status          | Complete                                                                                                                                                                                                                                |
| Priority        | High                                                                                                                                                                                                                                      |
| Suggested Size  | Medium                                                                                                                                                                                                                                    |
| Depends On      | `be/09-password-hashing`, `be/10-login-session`, `be/12-logout-revocation`, `be/14-audit-trail`, `be/21-api-module-architecture-refactor`, `be/25-authenticated-rbac-context`, `be/35-password-recovery`, `be/37-auth-email-quality-gate` |
| Blocks          | `fe/24-first-login-change-password`                                                                                                                                                                                                       |
| Execution Order | 38                                                                                                                                                                                                                                        |

## 2. Outcome

An authenticated user with `users.must_change_password = true` can change that password through a dedicated bearer-authenticated API operation. The database flag remains authoritative across login, refresh, and `/api/v1/me`; ordinary authenticated API routes reject the session until the change succeeds. The current session remains usable after success, other sessions are revoked, and the frontend can rehydrate the cleared flag from `/api/v1/me`.

## 3. Context

- `tasks/fe/24-first-login-change-password/technical.md` is blocked on a durable backend flag, an authenticated change operation, and server-side enforcement.
- `tasks/be/10-login-session/technical.md` and the auth login service define the current top-level optional login flag.
- `tasks/be/25-authenticated-rbac-context/technical.md` owns `GET /api/v1/me` and the current `{ user, roles, permissions }` response.
- `tasks/be/35-password-recovery/technical.md` owns public recovery-token reset and all-session revocation. That flow is not this capability.
- `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/SECURITY.md`, `docs/DATABASE.md`, and `docs/DEVELOPMENT.md` govern module ownership, API conventions, security, schema, and validation.
- `docs/PRD.md`, `docs/PRODUCT.md`, and `docs/DOMAIN.md` do not define additional first-login product behavior; this task uses only the explicit contract below.

## 4. Dependencies

- The listed auth, password, audit, API architecture, authenticated-context, and recovery tasks are implemented. The auth-email quality gate supplies current integrated migration/OpenAPI/test evidence.
- PostgreSQL is required for transactional account/session/audit updates. Tests use the repository's isolated database setup and synthetic users.
- No new service, secret, external provider, environment variable, or database entity is required.
- This task blocks FE-24 until implementation and validation are complete. FE-24 owns its route and screen; it must consume this contract without substituting password recovery.

## 5. In Scope

- Preserve the existing login response, which returns optional top-level `mustChangePassword: true` only when required.
- Add required boolean `user.mustChangePassword` to authenticated context at `GET /api/v1/me`.
- Keep refresh response token-only; its rotation does not change the DB flag. After refresh, `/me` is the canonical rehydration operation.
- Add `POST /api/v1/auth/change-password`, authenticated by the current access token.
- Validate current and new passwords using the existing password helper; require the new value to differ from the current value.
- Atomically update the hash, clear the DB flag, retain the current session, revoke every other active session and associated active refresh token, and write the required success audit event.
- Enforce the DB flag in the central access-auth middleware for protected application APIs, with explicit exemptions for `/api/v1/me`, the change endpoint, logout operations, and refresh.
- Document response/error/security behavior in auth, `/me`, and every protected module OpenAPI contract; add focused unit, HTTP, database integration, migration-independent and regression coverage.

## 6. Out of Scope

- FE-24 page, route, auth-store, navigation, and browser changes.
- Changing or wrapping the public password-reset request/confirm flow, its challenge tokens, or its all-session revocation behavior.
- General authenticated password changes when `mustChangePassword` is false; password-history rules; breach checks; composition rules; MFA; reauthentication outside the current-password input; password expiration.
- Adding `mustChangePassword` to JWT claims or refresh response.
- Changing the initial/default-password creation policy, login eligibility, RBAC policy, or role/permission resolution.
- Revoking the current session or forcing a second login after the change.
- A schema migration: the user flag, auth sessions, refresh tokens, and generic audit table already exist. Do not add a migration unless source inspection proves this contract cannot be implemented with those entities; if so, stop for approval rather than expanding this task silently.

## 7. Existing Implementation

- `apps/api/src/modules/auth/services/login.service.ts` returns tokens plus optional top-level `mustChangePassword: true`.
- `apps/api/src/modules/auth/repositories/login.repository.ts` reads `users.mustChangePassword` while creating the login session.
- `apps/api/src/modules/auth/services/refresh-token.service.ts` returns only rotated tokens; it does not clear the requirement.
- `apps/api/src/modules/auth/services/context.service.ts` and `repositories/context.repository.ts` currently build `/me` without the flag.
- `apps/api/src/modules/auth/services/access-auth.service.ts`, `repositories/access-auth.repository.ts`, and `apps/api/src/middleware/authentication.middleware.ts` authenticate active sessions and currently do not inspect the flag.
- `apps/api/src/modules/auth/v1/auth.router.ts`, `me.router.ts`, and `auth.module.ts` compose auth routes and dependencies.
- Protected category, dashboard, role, user, and permission-catalog routers use central access-auth middleware; inspect every consumer and keep the default enforcement centralized.
- `apps/api/src/helpers/password.helper.ts` defines 12–128 Unicode code points, Argon2id hashing, verification, no trimming, and no composition rules.
- `apps/api/src/modules/auth/repositories/password-recovery.repository.ts` shows transaction/session-revocation and required generic-audit patterns. It is a pattern reference only; do not reuse its public token flow or all-session policy.
- `apps/api/src/modules/audit/services/audit.service.ts` and `repositories/audit.repository.ts` provide append-only generic audit events and `recordRequired` transaction participation.
- `apps/api/src/modules/auth/v1/auth.openapi.yaml` and `apps/api/src/modules/me/v1/me.openapi.yaml` own the API contracts.
- Inspect current auth, middleware, router, OpenAPI, password, audit, and API integration tests before editing; paths are guidance and must be verified.

## 8. Implementation Requirements

1. **Canonical state:** `users.must_change_password` is authoritative. Read it from the database for login, `/me`, and each authenticated request. Do not put it in JWT claims or cache it in a way that can outlive a password change.
2. **Login:** preserve current wire shape and behavior: when true, response contains top-level `mustChangePassword: true`; when false, that optional property is absent. Do not move it into a new `user` object or remove it.
3. **Context:** `/api/v1/me` always returns `user.mustChangePassword` as a boolean, alongside its existing `user.id`, `user.email`, `roles`, and `permissions`. Keep the new field inside `user` because it is mutable account identity state.
4. **Refresh:** preserve current token-only response (`accessToken`, `refreshToken`, `tokenType`, `expiresIn`). Refresh rotates the session credential and neither clears nor copies the flag. CMS bootstrap follows refresh with `/me`; `/me` is the only durable context source needed after refresh/reload.
5. **Request:** strict JSON `{ "currentPassword": string, "newPassword": string }`; reject additional properties. The UI may collect a confirmation value, but confirmation is not sent to or validated by this API. Do not trim or normalize either password.
6. **Validation:** require a valid authenticated active session and `mustChangePassword=true`. Verify `currentPassword` against the current Argon2id hash. Validate `newPassword` with `isValidPassword`: 12–128 Unicode code points; no trimming; no arbitrary composition requirement. Reject a new value identical to the current value. Do not add password history, breached-password lookup, or an external check.
7. **Atomic success:** use the authenticated principal's user/session IDs, never request-supplied identity. In one DB transaction, lock and re-read the active user and current session, verify current password against the current hash, ensure the flag is still true, hash the new password, update the password hash and clear `must_change_password`, revoke all other active sessions and their active refresh tokens, and append required `auth.password_change.completed` audit. Leave the current session and current refresh token active. Any persistence/hash/audit failure rolls back state and revocations and returns the centralized safe server error.
8. **Concurrency:** serialize change attempts on the user row. The first successful transaction clears the flag. A concurrent or later request observes false and gets the defined `password_change_not_required` conflict; it cannot overwrite the winning password or revoke the retained session.
9. **Server enforcement:** extend central access authentication to resolve the current DB flag and place it on the authenticated principal. By default, a request with the flag true returns `403 { message, code: "password_change_required" }` before permission/business handlers run. Do not scatter flag checks through feature controllers. Use explicit middleware options at the owning route boundary to exempt `/api/v1/me`, `/api/v1/auth/change-password`, `/api/v1/auth/logout`, and `/api/v1/auth/logout-all`. Refresh remains usable through its existing refresh-token path. No other protected application route is exempt. Current protected modules are category, dashboard, role, user, and permission catalog; inspect for additional consumers before implementation.
10. **Audit:** required success event is `auth.password_change.completed`, outcome `success`, `actorType: user`, `actorUserId`, current `sessionId`, `resourceType: user`, user `resourceId`, and request ID; allowlisted metadata contains only the number of other sessions revoked. Invalid-current-password attempts must be recorded as best-effort `auth.password_change.failed`, outcome `failure`, with reason `INVALID_CURRENT_PASSWORD`, actor/user/session/resource/request IDs and null metadata. Audit failure must not change the password response or disclose failure. Do not record password values/hashes, tokens, headers, cookies, email, request body, or exception details. Do not add auth-audit check-constraint values: these events use the generic audit table already used by password recovery.
11. **Rate limit:** apply the existing password-attempt policy of 20 requests per source IP per 15 minutes to this endpoint, with the established `429 { message: "Too many requests" }` response. Reuse the existing limiter only if doing so does not mislabel the operation; otherwise make the smallest focused reusable adjustment.
12. **OpenAPI:** update auth, `/me`, and every protected module contract to document exact wire shapes, bearer security, status/error codes, password constraints, enforcement response, and refresh behavior. Split the shared current token response schema into login and refresh response schemas so only login documents the optional top-level requirement flag. Add the requirement code as an optional property to the shared error schema while preserving existing generic permission-denied responses. Use the common forbidden response in every guarded operation, including category operations that currently inline it, and add `403` to the protected permission-catalog operation. Do not document planned paths as implemented until source and OpenAPI agree.

## 9. Applicable Contracts

### Configuration Contract

Not applicable: no configuration is added.

### API Contract

All paths below are full application paths. Password strings are opaque and are never trimmed.

| Method / Path                                | Authentication                                     | Request                                                       | Success                                                                                                                        | Failure                                                                                                                                                                                                                      |
| -------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/login`                    | Public credentials                                 | Existing `{ email, password }`                                | Existing token response; optional top-level `mustChangePassword: true` remains present only when true                          | Existing login errors unchanged                                                                                                                                                                                              |
| `POST /api/v1/auth/refresh`                  | Public refresh token                               | Existing `{ refreshToken }`                                   | Existing token-only response with `accessToken`, `refreshToken`, `tokenType`, and `expiresIn`; no requirement field            | Existing refresh errors unchanged                                                                                                                                                                                            |
| `GET /api/v1/me`                             | Bearer access token; allowed while change required | None                                                          | `200 { "user": { "id": string, "email": string, "mustChangePassword": boolean }, "roles": string[], "permissions": string[] }` | Existing generic `401`                                                                                                                                                                                                       |
| `POST /api/v1/auth/change-password`          | Bearer access token; only while change required    | Strict `{ "currentPassword": string, "newPassword": string }` | `204 No Content`; current access and refresh session remain valid; subsequent `/me` returns `mustChangePassword: false`        | `400 invalid_current_password`; `400 password_policy_violation`; `400 password_unchanged`; `401` generic invalid authentication; `409 password_change_not_required`; `413` existing body limit; `429` rate limit; safe `500` |
| Other protected `/api/v1/*` operations       | Bearer access token                                | Existing operation body                                       | Existing success only when flag is false                                                                                       | `403 { "message": "Password change required", "code": "password_change_required" }` while flag is true; otherwise existing contract                                                                                          |
| `POST /api/v1/auth/logout` and `/logout-all` | Bearer access token; allowed while change required | None                                                          | Existing `204`; logout semantics unchanged                                                                                     | Existing generic `401`                                                                                                                                                                                                       |

The request rejects extra properties and requires both values as strings of 12–128 Unicode code points. The current value is verified with the shared password helper; an invalid-length or mismatched current value returns `invalid_current_password`. An out-of-range new value returns `password_policy_violation`. Missing fields or non-string values use the standard `400 Bad request` response. The confirmation field is a frontend-only check and is not accepted by the endpoint.

Stable change-operation errors use `{ "message": string, "code": string }`:

| Status / code                      | Meaning                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `400 invalid_current_password`     | Current password does not verify; no state changes; a best-effort failure audit is attempted with `reasonCode: INVALID_CURRENT_PASSWORD` |
| `400 password_policy_violation`    | New password is outside the shared 12–128 code-point length rule                                                                         |
| `400 password_unchanged`           | New password equals the supplied current password                                                                                        |
| `409 password_change_not_required` | Current DB flag is false; this endpoint is not a general password-change API                                                             |
| `403 password_change_required`     | A protected application request is blocked pending the change                                                                            |
| `429` without a code               | Existing rate-limit response                                                                                                             |

Malformed JSON/schema input uses the established safe bad-request response. No error includes submitted values or stored hashes.

### Database Contract

Use `users.must_change_password`, `users.password_hash`, existing `auth_sessions`, existing refresh-token persistence, and existing generic `audit_events`. No new table, column, constraint, index, or migration. Update the Drizzle user type/query only if source inspection shows it is not already represented. Transaction success includes password hash update, flag clear, other-session/refresh-token revocation, and required audit append. Current session and refresh token remain unchanged.

### UI Contract

Not applicable: FE-24 owns UI, route and responsive/accessibility behavior. Its dependency is this backend contract and completed implementation; it must not infer a different API.

## 10. File Impact

| Classification                                       | Expected files / impact                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expected Create: existing `auth` module              | `apps/api/src/modules/auth/services/password-change.service.ts`, `apps/api/src/modules/auth/repositories/password-change.repository.ts`, `apps/api/src/modules/auth/v1/controllers/password-change.controller.ts`, and `apps/api/src/modules/auth/v1/validation/password-change.validation.ts`, unless inspection shows an existing focused equivalent to extend. Do not create a new auth submodule or top-level `apps/api/src` directory.             |
| Expected Create: tests                               | Focused service/middleware and API integration tests under existing `apps/api/tests/` conventions, including named change-password and enforcement cases.                                                                                                                                                                                                                                                                                               |
| Expected Modify: `auth` module                       | `apps/api/src/modules/auth/auth.module.ts`, `apps/api/src/modules/auth/v1/auth.router.ts`, `apps/api/src/modules/auth/v1/me.router.ts`, `apps/api/src/modules/auth/services/context.service.ts`, `apps/api/src/modules/auth/repositories/context.repository.ts`, `apps/api/src/modules/auth/services/access-auth.service.ts`, `apps/api/src/modules/auth/repositories/access-auth.repository.ts`, and `apps/api/src/modules/auth/v1/auth.openapi.yaml`. |
| Expected Modify: `me` API contract                   | `apps/api/src/modules/me/v1/me.openapi.yaml`; the router and implementation remain owned by the existing auth module.                                                                                                                                                                                                                                                                                                                                   |
| Expected Modify: durable API guidance                | `docs/API.md`; keep the route and authenticated-context summary aligned with runtime and OpenAPI.                                                                                                                                                                                                                                                                                                                                                       |
| Expected Modify: central middleware / OpenAPI config | `apps/api/src/middleware/authentication.middleware.ts` and `apps/api/src/config/openapi/openapi.ts`; keep route exemptions explicit at their owning router boundary and extend the shared error schema with the optional requirement code.                                                                                                                                                                                                              |
| Expected Modify: protected module OpenAPI            | `apps/api/src/modules/category/v1/category.openapi.yaml`, `apps/api/src/modules/dashboard/v1/dashboard.openapi.yaml`, `apps/api/src/modules/role/v1/role.openapi.yaml`, `apps/api/src/modules/user/v1/user.openapi.yaml`, and `apps/api/src/modules/rbac/permission-catalog.openapi.yaml`; document `403 password_change_required` on every operation guarded by central access auth.                                                                   |
| Expected Modify: frontend dependency record only     | `tasks/fe/24-first-login-change-password/technical.md`, its `explanation.md`, and `tasks/fe/AUTH_EMAIL_DEPENDENCY_MAP.md`; dependency, status, and source references only, with no FE behavior change.                                                                                                                                                                                                                                                  |
| Expected Not Modified                                | CMS source; public password-reset semantics; user creation/default-password policy; RBAC permissions; JWT claims; dependencies/manifests; database migrations; unrelated API modules.                                                                                                                                                                                                                                                                   |

Expected paths are guidance; agent must inspect repository before finalizing changes. Architecture classification is `module` for auth, `/me`, and protected-module OpenAPI; `middleware` for access enforcement; `config` for the shared OpenAPI error schema; and `apps/api/tests` for proof. No new `apps/api/src` root or feature module is allowed.

## 11. Runtime Behavior

1. Login verifies credentials and reads `users.must_change_password`; if true it creates the normal session and returns the existing optional top-level true flag. It does not clear the database state.
2. CMS bootstrap/refresh obtains tokens as today, then requests authenticated `/api/v1/me`. The context response reads the current database value and returns a boolean under `user`.
3. On every access-authenticated API request, the central middleware validates the access token/session and current active-user state, then reads `must_change_password`. If true, it permits only `/me`, the authenticated change endpoint, and logout endpoints; it denies other protected API operations before route permissions/controllers.
4. The change endpoint checks the authenticated user is still active and still requires a change, verifies `currentPassword`, validates the distinct new value, and atomically commits password hash, flag clear, other-session revocations, and success audit. The current session remains active.
5. The endpoint returns `204`. CMS fetches `/me` and observes false, then may continue its approved FE-24 navigation. Refresh during the required state continues rotating the same session and does not clear the flag.
6. Invalid current password, invalid policy, already-cleared flag, rate limit, database failure, and audit failure produce the API outcomes in §9 without partial password/session changes.

## 12. Error And Edge Cases

| Scenario                                         | Expected Result                                                                | Security / Recovery                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Password flag true after login or reload         | Login may include optional true; `/me` always returns current DB boolean       | No reliance on client-only or JWT state                    |
| Refresh while flag true                          | Rotate tokens normally; flag remains true in DB; subsequent `/me` returns true | No silent clearing or refresh-body duplication             |
| Ordinary protected API while flag true           | `403 password_change_required` before permissions/business logic               | Central enforcement; no partial action                     |
| `/me`, change, or logout while flag true         | Route is allowed subject to its own auth/validation                            | User can rehydrate, complete change, or exit               |
| Current password mismatch                        | `400 invalid_current_password`; no password/session mutation                   | Best-effort failure audit only; rate limit applies         |
| New password invalid or unchanged                | Stable `400` code; no mutation                                                 | Do not trim or expose policy internals beyond code/message |
| Flag became false before request                 | `409 password_change_not_required`; no general password update                 | Do not re-enable or change current state                   |
| Two changes race                                 | One transaction succeeds; later transaction receives conflict                  | Lock/re-read state; only one hash/audit/rotation effect    |
| Success audit insert fails                       | Transaction rolls back hash, flag, and revocations; safe `500`                 | Required security state and audit commit together          |
| Other-session revoke fails                       | Entire transaction rolls back                                                  | No partially changed account or session set                |
| User disabled/deleted or session expired/revoked | Existing access authentication returns generic `401`                           | No identity/account-state disclosure                       |
| Oversized body/rate limit                        | Existing `413` / `429` response                                                | No password values in response/logs                        |

## 13. Security Requirements

- Access authentication and the DB flag are authoritative; no JWT flag, client-side enforcement claim, or cached stale value.
- Deny protected application APIs centrally while required; exemptions are exact and limited to `/me`, change-password, logout, and logout-all.
- Require current password verification and a still-active session; do not accept user/session identity from the request body.
- Keep state update, other-session/refresh revocation, and required success audit atomic. Preserve the current session only.
- Argon2id remains the only password hash boundary. Do not trim, log, return, or persist plaintext; never expose hashes or tokens.
- Audit uses explicit allowlisted metadata; failed attempts are best-effort and must not leak through normal logs. Do not store request payloads, headers, cookies, credentials, or exception stacks.
- Apply 20 attempts per source IP per 15 minutes and existing API body limits. No account-existence behavior is involved in this authenticated endpoint.
- Do not broaden or reuse the public password-reset capability.

## 14. Test Requirements

| Category           | Required proof                                                                                                                                                                                                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Happy Path         | Login preserves the exact optional top-level flag; `/me` returns nested boolean true/false; valid authenticated change returns 204, clears the DB flag, stores a verifiable Argon2id hash, retains current session/refresh token, revokes other sessions/tokens, writes success audit, and `/me` returns false.                                             |
| Validation         | Strict body; missing/non-string/extra fields reject; 12 and 128 code-point new passwords pass; 11 and 129 fail; multi-code-point characters use code-point counting; no trim; same current/new value rejects; confirmation is not an API field.                                                                                                             |
| Negative / Failure | Invalid bearer/session; disabled/deleted account; false flag; wrong current password; rate limit; hashing, database, revocation, and required-audit failures; each gives defined safe result and no partial mutation. Assert the best-effort failure audit event is emitted for wrong current password and audit outage does not change the `400` response. |
| Security           | Required flag blocks every protected business router before permission/controller execution; exact auth exemptions remain usable; current-password failure creates the best-effort failure event; responses/logs/audit contain no raw password/hash/token.                                                                                                  |
| Regression         | Login/refresh/logout/logout-all/password recovery/RBAC `/me` behavior remains intact; public reset continues challenge-token semantics and all-session revocation; refresh does not return or clear the flag.                                                                                                                                               |
| Isolation          | Repeatable integration tests use isolated PostgreSQL state and synthetic accounts/sessions; migration-free setup is deterministic; parallel change attempts produce one success; cleanup removes test rows/resources without relying on execution order.                                                                                                    |

OpenAPI tests must prove request, response, bearer security, error codes/statuses, `/me` shape, and protected-route behavior match implementation. Do not use mocked repository tests as the only proof of transaction/session behavior.

## 15. Task-Level Expected Results

- Authenticated context exposes the database-backed requirement on every `/me` request.
- Existing login payload and refresh payload remain compatible and documented exactly.
- One bearer-authenticated endpoint changes only a currently required password and produces a deterministic session outcome.
- Central middleware prevents required-change sessions from reaching normal business API handlers.
- Password validation, concurrency, revocation, audit, and failure rollback are covered by focused tests.
- OpenAPI gives FE-24 a complete contract with no frontend assumption or reset-flow substitution.

## 16. Acceptance Criteria

- [x] **AC-001:** Login response remains token fields plus optional top-level `mustChangePassword: true`; false remains omitted. OpenAPI uses distinct login and refresh response schemas, and only login permits the optional requirement field.
- [x] **AC-002:** `/api/v1/me` includes `user.mustChangePassword` as a required boolean from current database state.
- [x] **AC-003:** Refresh response remains token-only and does not clear the DB flag; `/me` after refresh recovers the current value.
- [x] **AC-004:** `POST /api/v1/auth/change-password` requires bearer auth and strict `{ currentPassword, newPassword }` input.
- [x] **AC-005:** Current password is verified; new password follows the shared 12–128 code-point rule, is not trimmed, and must differ from current.
- [x] **AC-006:** Successful change atomically updates the hash, clears the flag, keeps current session/refresh valid, revokes all other active sessions/refresh tokens, and writes required success audit.
- [x] **AC-007:** Concurrent/repeated change cannot overwrite a completed change and returns `409 password_change_not_required` after the flag clears.
- [x] **AC-008:** Central access middleware returns `403 password_change_required` for all protected application APIs except `/me`, change-password, logout, and logout-all.
- [x] **AC-009:** Required success audit failure rolls back the state/session transaction; invalid-current-password attempts use best-effort audit; audit and logs contain no credentials.
- [x] **AC-010:** Endpoint has the specified 20/IP/15-minute limit and stable API errors.
- [x] **AC-011:** Auth, `/me`, category, dashboard, role, user, and permission-catalog OpenAPI plus executable tests document the requirement error code on every access-auth-protected operation while preserving existing permission-denial behavior.
- [x] **AC-012:** No CMS behavior, password-reset semantics, JWT claims, database schema, or unrelated API behavior changes.

## 17. Anti-Slop Requirements

- **Code Anti-Slop:** required. Check for duplicated password policy, scattered mandatory-change checks, redundant flag storage, speculative abstractions, dead/unused code, fake audit/revocation success, hidden TODO/FIXME/HACK, empty wrappers, unjustified `any`/assertions, excessive comments, and unrelated files/dependencies.
- **UI Anti-Slop:** not applicable : no UI changes.
- **Visual Verification:** not applicable : no UI changes.
- Use the existing auth, password helper, session, audit, and validation boundaries; add no second password-change or authorization subsystem.

## 18. Validation Requirements

- **Static:** from repository root run `bun run --cwd apps/api lint`, `bun run --cwd apps/api typecheck`, and `bun run --cwd apps/api format:check`; validate OpenAPI with the existing `tests/openapi.test.ts`; run `git diff --check`.
- **Automated Tests:** run focused unit/service/middleware tests with `bun run --cwd apps/api test -- tests/<focused-test-files>` and isolated PostgreSQL/Supertest coverage with `API_INTEGRATION=true bun run --cwd apps/api test -- tests/<focused-integration-files> tests/openapi.test.ts --detectOpenHandles`. Confirm exact test filenames and integration prerequisites during implementation.
- **Build:** Not applicable: current `apps/api/package.json` has no build script; TypeScript typecheck and runtime integration tests are the applicable compile/runtime checks.
- **Database:** no migration expected. If source inspection proves schema change is necessary, stop for approval; do not claim migration validation.
- **UI:** not applicable.
- **Anti-Slop:** execute backend Code Anti-Slop against changed files and fix/re-run findings.

## 19. Completion Evidence

- AC-001 → login service/API integration test and distinct login/refresh schema assertions in `auth.openapi.yaml`.
- AC-002 → `/me` integration test and `me.openapi.yaml` response schema.
- AC-003 → refresh integration test plus `/me` after refresh and token-only OpenAPI response assertion.
- AC-004 → authenticated endpoint HTTP test, strict request schema, and bearer security declaration.
- AC-005 → password validation/service tests for bounds, Unicode length, exact comparison, and unchanged value.
- AC-006 → isolated PostgreSQL assertions for hash, flag, current/other session and refresh-token rows, and required success audit.
- AC-007 → parallel-request integration test proving one mutation and one conflict.
- AC-008 → middleware integration coverage for every protected router and exact exemptions.
- AC-009 → injected audit/revocation failure test and persisted audit/log redaction assertions.
- AC-010 → rate-limit HTTP test and stable error assertions.
- AC-011 → OpenAPI validation across all access-auth-protected module contracts and shared error schema.
- AC-012 → changed-file diff review, `git status`, and `git diff --check`.
- Overall → command output for required lint, typecheck, focused tests, applicable build, Anti-Slop, and final `git status`/`git diff` review.

Execution evidence for this implementation:

- `bun run --cwd apps/api lint` — PASS.
- `bun run --cwd apps/api typecheck` — PASS.
- `bun run --cwd apps/api format:check` — PASS.
- `bun run --cwd apps/api test` — PASS for 33 runnable suites and 219 tests; 8 integration suites (23 tests) were skipped because `API_INTEGRATION` was not enabled.
- `tests/openapi.test.ts` — PASS in the API suite; the assembled OpenAPI document validates and includes the new operation and enforcement responses.
- `API_INTEGRATION=true bun run --cwd apps/api test -- tests/password-change.integration.test.ts tests/password-recovery.integration.test.ts tests/openapi.test.ts --detectOpenHandles` — PASS, 3 suites and 9 tests. A disposable PostgreSQL 16 cluster was initialized under `/private/tmp`, migrated by the test suite, used for these checks, then stopped and removed. Docker Desktop was unavailable; the database stayed isolated from project services/data.
- Code Anti-Slop — PASS by changed-file review: no duplicated password policy, unnecessary dependencies, fake behavior, hidden TODO/FIXME/HACK, `any`, unused code, or unrelated API/CMS changes.
- `git diff --check` — PASS. Existing unrelated CMS changes remain untouched.

## 20. Traceability

| Trace Type          | References                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PRD                 | Not defined for this behavior                                                                                     |
| Feature             | `fe/24-first-login-change-password`                                                                               |
| Requirement         | User-approved backend unblock request for FE-24                                                                   |
| Acceptance Criteria | AC-001–AC-011 in this task                                                                                        |
| API Operation       | `POST /api/v1/auth/change-password`; `GET /api/v1/me`                                                             |
| Database            | `users.must_change_password`, `users.password_hash`, `auth_sessions`, refresh-token table, generic `audit_events` |
| Test IDs            | Not applicable: no test ID registry; required named scenarios are listed in this contract                         |
| Design/Figma        | Not applicable: backend-only                                                                                      |

## 21. Open Points

None. The user approved implementation of the contract's selected current-password, `204`, session-retention/revocation, audit, database-authority, and enforcement decisions in this turn. Required PostgreSQL integration evidence passed against a disposable local cluster.

## 22. Definition Of Done

- [x] All acceptance criteria pass and remain within scope.
- [x] Auth, `/me`, middleware, session, password, and audit implementation match this contract.
- [x] Focused tests, concurrency/failure tests, and OpenAPI validation pass.
- [x] Applicable lint, typecheck, build, and required Code Anti-Slop pass.
- [x] No migration was required; existing database columns and tables support the contract.
- [x] `git diff --check` passes; changed files and secrets were reviewed; no unrelated work was changed.

Implementation and validation are complete. The disposable PostgreSQL cluster was stopped and removed after testing.
