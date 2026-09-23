# be/10-login-session - Login And Session

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/10-login-session` |
| Batch | N/A |
| Owning Feature | N/A |
| Workstream | Backend |
| Task Category | Login foundation |
| Repository/App | `apps/api` |
| Status | Ready: approved for implementation |
| Priority | Foundation execution order 10 |
| Suggested Size | Small - login endpoint, session/refresh persistence, auth audit events, and tests |
| Depends On | `be/04-identity-schema`, `be/06-logging-foundation`, `be/07-security-foundation`, `be/08-jwt-foundation`, `be/09-password-hashing` |
| Blocks | `be/11-refresh-token` |
| Execution Order | 10 |

## 2. Outcome

Provide `POST /auth/login`. It validates email/password input, permits only active non-deleted users, creates a durable session and initial refresh-token metadata atomically, issues minimal access/refresh JWTs, records durable login audit outcomes, and returns only a minimal token response.

## 3. Context

- `apps/api/src/app.ts` currently has no API prefix; logical and physical route is `POST /auth/login`.
- Current API safe responses use `{ "message": string }`; no error-code field exists.
- `tasks/be/04-identity-schema/technical.md` defines UUID `users.id`, lowercased unique email, `active`/`disabled` status, and soft deletion through `deleted_at`.
- `tasks/be/08-jwt-foundation/technical.md` establishes RS256 tokens with `sub=users.id`, `sid`, JTI, and explicit access/refresh type.
- `tasks/be/09-password-hashing/technical.md` establishes Argon2id verification and opaque untrimmed password input.
- `be/11-refresh-token` owns refresh rotation; `be/12-logout-revocation` owns token-revocation persistence and logout; `be/14-audit-trail` owns future generic audit expansion.
- `AGENTS.md` requires entity-scoped Drizzle migrations with reviewed UP/DOWN paths.

## 4. Dependencies

- Identity schema/migrations applied through `be/04`.
- JWT and password boundaries from `be/08` and `be/09`.
- Valid JWT configuration and current security middleware/request correlation.
- PostgreSQL/Drizzle transaction support.
- No OpenAPI implementation, CMS UI, external identity provider, breach service, or cookie transport is required.

## 5. In Scope

- `POST /auth/login` request validation, normalization, generic authentication failure, and minimal success response.
- User eligibility check, password verification, session creation, initial refresh-token metadata persistence, access/refresh JWT issuance, and focused durable authentication audit events.
- `auth_sessions`, `refresh_tokens`, and `auth_audit_events` schema/migrations with required indexes and retention semantics.
- Atomic successful-login persistence and focused tests.

## 6. Out of Scope

- Registration, email verification, password reset/change, refresh endpoint/rotation, logout, session listing, revoke-all, access-token revocation, and token-revocation table.
- RBAC/permission loading, MFA, OAuth/social login, admin auth UI, cookie transport, CSRF changes, IP/user-agent persistence, and generic audit framework work.
- Access-token persistence, raw refresh-token persistence, refresh-token replacement linkage, cleanup scheduler, archival, or compliance retention.

## 7. Existing Implementation

- `apps/api/src/app.ts` and `apps/api/src/security/index.ts` - Express middleware order, request IDs, rate limit, Zod-compatible safe errors, and `{ message }` response convention.
- `apps/api/src/database/schema.ts` and `apps/api/drizzle/` - Drizzle schema and current entity-scoped migration sequence through `0004_create-role-permissions-table`.
- `apps/api/src/jwt/index.ts` - typed RS256 issue/verify boundary.
- `apps/api/src/password/index.ts` - Argon2id hash/verify boundary.
- `apps/api/src/logging/index.ts` - Pino redaction, Morgan access logging, and request correlation.
- `apps/api/tests/` - Jest integration/unit conventions.

## 8. Implementation Requirements

### Login API

- Add unauthenticated `POST /auth/login`; do not add an alternate path or API prefix.
- Accept strict JSON object `{ email, password }` only. Zod rejects missing, malformed, and unknown fields with existing sanitized `400` response convention.
- `email` is required string and is lowercased before identity lookup, matching `users.email` rules. `password` is required string, remains opaque, and is never trimmed or normalized.
- Successful response is exactly `{ "accessToken": string, "refreshToken": string, "tokenType": "Bearer", "expiresIn": number }` with HTTP `200`.
- `expiresIn` is positive seconds derived from the validated configured access-token lifetime. Do not hard-code `900`; current environment may choose another approved duration.
- Do not return user profile data, password hash, session secret, refresh-token hash, roles, permissions, or database internals.
- Unknown email, wrong password, disabled user, and soft-deleted user return HTTP `401` and `{ "message": "Invalid credentials" }`. No public code/reason field is added.
- Validation failure is HTTP `400` using existing safe envelope. Existing rate limiting remains `429`. Unexpected failures remain sanitized `500`.

### Account eligibility and timing

- Only `users.status = active` and `users.deleted_at IS NULL` may complete login.
- Disabled and soft-deleted users never receive a session or token and are never restored/deleted by login.
- Keep public failure identical for all authentication failures. Audit reason distinguishes `INVALID_CREDENTIALS`, `ACCOUNT_DISABLED`, and `ACCOUNT_DELETED` internally only.
- Do not add arbitrary delay or claim timing-equality guarantees. When feasible using the existing password boundary, perform non-secret dummy verification for unknown-user requests; do not add fake cryptography solely to simulate timing.

### Session and tokens

- Generate session UUID before token issuance. It becomes JWT `sid` for both access and refresh tokens; JWT `sub` remains user UUID.
- Access and refresh tokens use the existing JWT boundary with distinct type and JTI. Do not persist access tokens.
- Refresh token is a JWT credential returned in JSON because current CORS policy disables credentialed cookies. Do not switch to cookies.
- Before persistence, calculate a deterministic lowercase-hex SHA-256 digest of raw refresh token with native repository-compatible cryptography. Store only this digest as `token_hash`; never store/log raw refresh token.
- Session and refresh expiry derive from validated configured refresh-token lifetime. Both initial values are equal.
- A session is usable only when user is active/non-deleted and `revoked_at IS NULL` and `expires_at` is future. Timestamps express lifecycle; no duplicate session-status enum.

### Persistence and audit atomicity

- Token issuance occurs before database transaction. If issuance fails, create no persistent auth state.
- In one database transaction, insert session, initial refresh-token metadata, and `auth.login.succeeded` audit event. Commit must succeed before response exposes tokens.
- If any transaction step fails, roll back. Return no token response and log only sanitized operational data/request ID.
- Failed authentication attempts persist `auth.login.failed` audit event with safe reason and nullable user/session references. Audit persistence is mandatory for this foundation; audit write failure returns safe `500`, not a success or authentication result.
- Authentication audit records are durable data, distinct from ordinary Pino/Morgan logs. Do not add generic audit abstractions.

## 9. Applicable Contracts

### Configuration Contract

| Variable | Required | Type | Validation | Default | Secret |
| --- | --- | --- | --- | --- | --- |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Yes | configured lifetime string | Existing JWT configuration and issuance validation; login derives positive response seconds | None - startup/issuance fails if invalid | No |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Yes | configured lifetime string | Existing JWT configuration and issuance validation; login derives session/refresh expiry | None - startup/issuance fails if invalid | No |

No new environment variables are introduced.

### API Contract

| Item | Contract |
| --- | --- |
| Method/path | `POST /auth/login` |
| Authentication | None |
| Request | Strict JSON `{ "email": string, "password": string }`; email lowercased, password unmodified |
| Success | `200` with `{ "accessToken": string, "refreshToken": string, "tokenType": "Bearer", "expiresIn": number }` |
| Validation failure | `400` existing sanitized `{ "message": string }` envelope |
| Authentication failure | `401 { "message": "Invalid credentials" }` for unknown/wrong/disabled/deleted |
| Rate limit | Existing global limiter returns `429` |
| Internal failure | `500` existing sanitized `{ "message": "Internal server error" }` envelope |

### Database Contract

| Table | TypeScript field | PostgreSQL column | Type | Null | Constraint / behavior |
| --- | --- | --- | --- | --- |
| `auth_sessions` | `id` | `id` | UUID | No | Primary key; JWT `sid` |
| `auth_sessions` | `userId` | `user_id` | UUID | No | FK `users.id`, `ON DELETE CASCADE` |
| `auth_sessions` | `createdAt` | `created_at` | timestamp with time zone | No | Default/current creation time |
| `auth_sessions` | `expiresAt` | `expires_at` | timestamp with time zone | No | Initial value matches refresh expiry |
| `auth_sessions` | `revokedAt` | `revoked_at` | timestamp with time zone | Yes | Revocation marker |
| `auth_sessions` | `lastUsedAt` | `last_used_at` | timestamp with time zone | Yes | Future refresh usage only; do not update per request |
| `refresh_tokens` | `id` | `id` | UUID | No | Primary key |
| `refresh_tokens` | `sessionId` | `session_id` | UUID | No | FK `auth_sessions.id`, `ON DELETE CASCADE` |
| `refresh_tokens` | `jti` | `jti` | UUID | No | Unique; refresh JWT JTI |
| `refresh_tokens` | `tokenHash` | `token_hash` | text | No | Unique lowercase-hex SHA-256 digest; raw token forbidden |
| `refresh_tokens` | `createdAt` | `created_at` | timestamp with time zone | No | Default/current creation time |
| `refresh_tokens` | `expiresAt` | `expires_at` | timestamp with time zone | No | Initial value matches session expiry |
| `refresh_tokens` | `revokedAt` | `revoked_at` | timestamp with time zone | Yes | Revocation marker for successor refresh/logout work |
| `auth_audit_events` | `id` | `id` | UUID | No | Primary key |
| `auth_audit_events` | `eventType` | `event_type` | text | No | `auth.login.succeeded` or `auth.login.failed` only |
| `auth_audit_events` | `userId` | `user_id` | UUID | Yes | FK `users.id`, `ON DELETE SET NULL` |
| `auth_audit_events` | `sessionId` | `session_id` | UUID | Yes | FK `auth_sessions.id`, `ON DELETE SET NULL`; success only |
| `auth_audit_events` | `requestId` | `request_id` | UUID | No | Existing server-generated request ID |
| `auth_audit_events` | `reason` | `reason` | text | Yes | `INVALID_CREDENTIALS`, `ACCOUNT_DISABLED`, `ACCOUNT_DELETED`, `RATE_LIMITED`, or `INTERNAL_ERROR` where applicable |
| `auth_audit_events` | `createdAt` | `created_at` | timestamp with time zone | No | Default/current creation time |

- Do not collect `ip_address` or `user_agent` in these foundation tables. Repository has no approved privacy/retention policy for storing them.
- Add checks or project-compatible constrained types for allowed audit event/reason values and 64-character lowercase-hex `token_hash`.
- Indexes: `auth_sessions(user_id)`, `auth_sessions(expires_at)`, unique `refresh_tokens(jti)`, unique `refresh_tokens(token_hash)`, `refresh_tokens(session_id)`, `refresh_tokens(expires_at)`, `auth_audit_events(user_id)`, `auth_audit_events(session_id)`, `auth_audit_events(created_at)`.
- `be/12-logout-revocation` owns `token_revocations`; do not create it here. `be/11-refresh-token` owns refresh rotation and may add replacement linkage later.

### Retention and data impact

- No existing auth/session data needs backfill. Migrations only add tables.
- Session and refresh-token rows become cleanup-eligible 30 days after `revoked_at` when present, otherwise 30 days after `expires_at`. This task adds no cleanup job.
- Authentication audit events become cleanup-eligible 90 days after `created_at`. This is operational retention, not legal/compliance retention.
- Hard database deletion cascades session/refresh rows; application soft deletion never cascades and instead blocks login.

### UI Contract

Not applicable - this task creates no CMS UI.

## 10. File Impact

Expected paths are guidance based on current module and Drizzle patterns; implementation agent verifies before editing.

### Expected Create

- `apps/api/src/auth/login.ts` and focused auth route/controller/service/repository modules as current architecture requires.
- `apps/api/tests/login-session.test.ts`.
- `apps/api/drizzle/0005_create-auth-sessions-table.sql` and `apps/api/drizzle/0005_create-auth-sessions-table.down.sql`.
- `apps/api/drizzle/0006_create-refresh-tokens-table.sql` and `apps/api/drizzle/0006_create-refresh-tokens-table.down.sql`.
- `apps/api/drizzle/0007_create-auth-audit-events-table.sql` and `apps/api/drizzle/0007_create-auth-audit-events-table.down.sql`.

### Expected Modify

- `apps/api/src/database/schema.ts`.
- `apps/api/src/app.ts` or current route registration boundary.
- `apps/api/drizzle/meta/_journal.json` through repository-compatible Drizzle generation only.

### Expected Not Modified

- JWT/password module behavior, existing identity tables, CMS code, CORS/cookie configuration, token-revocation persistence, refresh rotation, generic audit task, unrelated routes, and dependencies unless inspected tooling proves a required existing dependency cannot meet scope.

## 11. Runtime Behavior

1. Security middleware assigns request ID and applies existing rate limits before route handling.
2. Login route validates strict Zod body, lowercases email, and preserves password exactly.
3. Repository loads the user identity by normalized email and determines active/non-deleted eligibility without public disclosure.
4. Password boundary verifies candidate for an eligible identity. Authentication failures persist a required sanitized failure audit event, then return generic `401`.
5. For eligible credentials, service generates session UUID, issues access/refresh tokens with `sub=user.id` and `sid=session.id`, derives SHA-256 refresh digest, and calculates expiration timestamps.
6. One transaction creates `auth_sessions`, `refresh_tokens`, and required success audit event.
7. Commit success returns minimal `200` token response. Any issuance, persistence, transaction, or audit failure returns no tokens and safe `500`.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Malformed/extra request body | `400` safe envelope | Password never logged or echoed. |
| Unknown email | Generic `401 Invalid credentials`; failure audit reason `INVALID_CREDENTIALS` | No account enumeration. |
| Wrong password | Generic `401 Invalid credentials`; failure audit reason `INVALID_CREDENTIALS` | No account enumeration. |
| Disabled user | Generic `401 Invalid credentials`; audit `ACCOUNT_DISABLED` | No session/token. |
| Soft-deleted user | Generic `401 Invalid credentials`; audit `ACCOUNT_DELETED` | No restoration or hard deletion. |
| Rate-limited request | Existing `429` behavior | No login processing/token issuance. |
| Password/JWT issuance failure | Safe `500` | No persistent session/token state. |
| Transaction/session/refresh/audit failure | Roll back and safe `500` | Never return generated tokens. |
| Raw refresh token | Returned only in success JSON | Persist SHA-256 digest only; never log. |
| Expired/revoked session | Future refresh/login lifecycle treats as unusable | Cleanup deferred by retention policy. |

## 13. Security Requirements

- Use strict Zod request validation, approved email normalization, and unmodified password input.
- Use Argon2id verification and RS256 token issuance only.
- Enforce active/non-deleted user eligibility before creating auth state.
- Keep all public authentication failures indistinguishable with same `401` message.
- Require session UUID in JWT `sid`, user UUID in `sub`, distinct access/refresh JTI/type, and no token claims beyond JWT foundation contract.
- Persist no raw refresh/access token, password, password hash, private key, authorization header, cookie, IP address, or user agent.
- Treat refresh digest and encoded password hashes as sensitive. Avoid them in logs, audit records, errors, and responses.
- Use request correlation in safe operational logs and durable audit rows.
- Preserve current rate limits, CORS, Helmet, body limits, centralized errors, and graceful shutdown.

## 14. Test Requirements

### Happy Path

- Active non-deleted user with correct password creates one session, one refresh metadata row, success audit event, and minimal valid token response.

### Validation / Authentication

- Strict body validates email/password; email lowercases; password is not trimmed.
- Unknown, wrong, disabled, and soft-deleted cases each return identical external `401` response.

### Tokens and persistence

- Access/refresh tokens contain approved `sub`, `sid`, type, and distinct JTIs.
- Access token is never stored. Refresh raw token is never stored; only expected SHA-256 digest is present.
- Session/refresh expiry aligns with configured refresh lifetime and timestamps express active/revoked/expired behavior.

### Failure and audit

- Transaction/persistence failure returns no token response and leaves no active partial session/refresh/audit state.
- Token-generation failure creates no auth state.
- Success/failure audit records have correct type/reason/request ID and omit password/token/hash data.
- Existing rate-limit behavior remains active for login.

### Isolation / Regression

- Use isolated database transactions/schema, deterministic cleanup, synthetic credentials, generated keys/tokens, and no real secrets.
- Run existing API suite unchanged.

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Valid active login | `200`, minimal response, one session/refresh/audit row | Integration |
| Invalid request | `400`, safe envelope | Integration |
| Unknown/wrong/disabled/deleted | Same `401` body and no token/session | Integration |
| JWT contract | `sub`, `sid`, types, distinct JTIs correct | Integration |
| Persistence safety | No raw refresh/access token stored | Integration |
| Partial failure | No success response or orphan active state | Integration |
| Audit | Required success/failure rows are redacted and correlated | Integration |
| Migration cycle | UP, DOWN reverse order, re-apply succeeds | Database integration |

## 15. Task-Level Expected Results

- Login route follows middleware -> route -> controller -> service -> repository -> database boundary.
- Auth state uses separate session, refresh metadata, and focused audit entities.
- Public failures are enumeration-safe and success response is minimal.
- Login writes are atomic and token delivery waits for commit.
- Refresh rotation, logout/revocation, and generic audit work remain deferred.

## 16. Acceptance Criteria

- [ ] `POST /auth/login` accepts strict email/password JSON with no authentication requirement.
- [ ] Success is `200` minimal bearer-token response with configured-lifetime `expiresIn` seconds.
- [ ] Unknown/wrong/disabled/deleted cases share identical generic `401 { message: "Invalid credentials" }` response.
- [ ] Only active non-deleted users can receive a session or token.
- [ ] Session UUID becomes JWT `sid`; access/refresh tokens use user `sub`, correct type, and distinct JTI.
- [ ] Dedicated `auth_sessions` and `refresh_tokens` persist required metadata; raw refresh and all access tokens are absent.
- [ ] Focused `auth_audit_events` persist required redacted success/failure outcomes.
- [ ] Session/refresh retention is 30 days after unusable; auth audit retention is 90 days after creation; no cleanup scheduler is added.
- [ ] Migrations are separate entity-scoped UP/DOWN pairs with FK-safe application and reverse rollback order.
- [ ] Login persistence is atomic; failed issuance/persistence/audit returns no token response or unintended active state.
- [ ] No registration, refresh rotation, logout/revocation, RBAC, cookies, IP/user-agent storage, or generic audit system is introduced.
- [ ] Focused tests, migration cycle validation, lint, typecheck, full applicable tests, Code Anti-Slop, and `git diff --check` pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Reject generic auth frameworks, duplicate error envelopes, account-state leaks, raw token/password/hash logging, fake transactions, unbounded metadata, static token salts, unreviewed `any`/assertions, hidden TODO/FIXME/HACK, monolithic migrations, and successor behavior. UI Anti-Slop and visual verification: not applicable - no UI change.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused `apps/api/tests/login-session.test.ts`.
- `bun run --cwd apps/api test`.

### Database

- `bun run --cwd apps/api db:generate` only when required by actual Drizzle workflow.
- Isolated database evidence for migration UP, matching DOWN, and re-apply in dependency/reverse-dependency order.

### Build / UI

Not applicable - API package has no build script and no UI change is expected.

### Anti-Slop

- Run Code Anti-Slop during implementation and again after fixes.

## 19. Completion Evidence

| Acceptance criterion | Evidence |
| --- | --- |
| API contract | Focused route integration tests for `200`, `400`, `401`, `429`, and safe `500` |
| Account eligibility | Same-response tests for unknown/wrong/disabled/deleted cases |
| Token/session contract | Decoded JWT plus persisted session/refresh assertions |
| Raw-token safety | Database/log/audit assertions prove no raw token/access token/password/hash leakage |
| Atomicity/audit | Transaction-failure and durable success/failure audit tests |
| Migration discipline | Isolated UP, DOWN, re-apply output with matching SQL review |
| Static/regression | lint, typecheck, full API test output, `git diff --check` |
| Anti-Slop | Code Anti-Slop output or exact unavailable reason |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| API | `docs/API.md` safe envelope and Zod baseline |
| Security | `docs/SECURITY.md`, `AGENTS.md`, `be/07`, `be/08`, `be/09` |
| Database | `docs/DATABASE.md`, `be/04`, current Drizzle journal/migrations |
| Dependency task | `be/04-identity-schema`, `be/08-jwt-foundation`, `be/09-password-hashing`, `be/11-refresh-token`, `be/12-logout-revocation`, `be/14-audit-trail` |
| Test IDs | Not applicable - project has no test-ID system |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] Acceptance criteria and approved scope are satisfied.
- [ ] API/session/refresh/audit behavior follows contracts without account enumeration or credential leakage.
- [ ] Migrations pass isolated UP, DOWN, and re-apply validation in correct order.
- [ ] Focused and full applicable tests pass with synthetic credentials only.
- [ ] Code Anti-Slop passes; UI Anti-Slop and visual verification are documented not applicable.
- [ ] Lint, typecheck, and `git diff --check` pass.
- [ ] Changed files/diff are reviewed; no raw token, password, hash, secret, generated junk, or unrelated change remains.
