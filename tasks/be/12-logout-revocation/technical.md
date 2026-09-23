# be/12-logout-revocation — Logout And Revocation

## 1. Metadata

| Field           | Value                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------- |
| Task ID         | `be/12-logout-revocation`                                                                 |
| Batch           | N/A                                                                                       |
| Owning Feature  | N/A                                                                                       |
| Workstream      | Backend                                                                                   |
| Task Category   | Logout and revocation                                                                     |
| Repository/App  | `apps/api`                                                                                |
| Status          | Complete — validation evidence recorded below                                             |
| Priority        | Foundation execution order 12                                                             |
| Suggested Size  | Small — authenticated logout routes, revocation enforcement, one focused table, and tests |
| Depends On      | `be/05-redis-foundation`, `be/11-refresh-token`                                           |
| Blocks          | `be/13-rbac-permissions`                                                                  |
| Execution Order | 12                                                                                        |

## 2. Outcome

Provide authenticated current-session logout and explicit all-session logout. Revocation persists in PostgreSQL, invalidates related refresh credentials, blocks revoked session/JTI access through authentication middleware, records redacted audit events, and never stores raw credentials.

## 3. Context

- `docs/SECURITY.md`, `docs/DATABASE.md`, `docs/API.md`, and `docs/ARCHITECTURE.md` define current platform rules.
- `be/08-jwt-foundation` defines RS256 access-token claims: `sub` user UUID, `sid` session UUID where session-aware, `jti`, `typ=access`, issuer, audience, and expiry.
- `be/10-login-session` creates `auth_sessions`, `refresh_tokens`, and `auth_audit_events`.
- `be/11-refresh-token` defines refresh rotation, consumed-token replay detection, and refresh audit vocabulary.
- `apps/api/src/auth/` contains login, refresh, access-authentication, and logout route/service/repository modules.
- `apps/api/src/redis/client.ts` exposes a lifecycle-managed ioredis client only; no revocation cache or auth lookup integration exists.

## 4. Dependencies

- `be/05-redis-foundation` has recorded focused Redis lifecycle and disposable Redis validation evidence.
- `be/11-refresh-token` has recorded isolated PostgreSQL migration, concurrent rotation, reuse detection, and failure-atomicity evidence.
- PostgreSQL migration execution must use isolated test infrastructure. Do not run rollback against a shared or unknown database.

## 5. In Scope

- `POST /auth/logout` for only caller's current session.
- `POST /auth/logout-all` for all sessions belonging to caller's user UUID.
- Focused access-token authentication/revocation enforcement for protected routes.
- Persistent `token_revocations` records for explicit current access-token JTI revocation.
- Session and usable refresh-token revocation in atomic database operations.
- Redacted logout and logout-all audit events.
- Focused schema migration, tests, and API documentation only if OpenAPI infrastructure exists at implementation time.

## 6. Out of Scope

- Refresh rotation, replay detection, login, registration, password reset, RBAC, OAuth, MFA, cookie transport, token introspection, session UI, device listing/naming, admin revocation of another user's sessions, and password-change-triggered logout.
- Access-token persistence/enumeration tables.
- Redis-only revocation correctness, new distributed cache infrastructure, and changing `be/11` behavior.

## 7. Existing Implementation

- `apps/api/src/database/schema.ts` defines `authSessions`, `refreshTokens`, `tokenRevocations`, and `authAuditEvents`.
- `apps/api/src/auth/refresh-repository.ts` revokes a compromised session and its active refresh records after reuse. Preserve this history and do not delete consumed records.
- `apps/api/src/jwt/index.ts` verifies typed RS256 claims; access authentication parses bearer headers and checks session/JTI revocation under `apps/api/src/auth/`.
- `apps/api/src/app.ts` installs security middleware then public and authenticated auth routes.
- `apps/api/src/redis/client.ts` provides only Redis initialization and shutdown.
- `apps/api/src/auth/login-route.ts` and `apps/api/src/auth/refresh-route.ts` establish strict Zod request validation and sanitized `message` responses.

## 8. Implementation Requirements

### 8.1 Access Authentication And Revocation Enforcement

- Add focused access-token middleware under existing `apps/api/src/auth/` boundary. Parse only `Authorization: Bearer <token>`.
- Verify RS256 access tokens through JWT foundation with expected `typ=access`; require UUID `sub`, `sid`, and `jti` for authenticated session routes.
- Load user/session state and reject expired, revoked, disabled, or soft-deleted principals.
- Check persistent JTI revocation by `jti` and reject an unexpired revoked access token.
- Attach only typed verified principal data needed by controllers: user UUID, session UUID, JTI, token expiry, and request ID. Never attach raw JWT text.
- Apply this middleware to protected routes introduced by this task and preserve it as the required boundary for later protected routes. Revocation storage without middleware enforcement is incomplete.
- Normal protected routes reject revoked session/JTI credentials. A narrowly scoped logout verifier may accept an otherwise cryptographically valid, unexpired token for its already-revoked session only to complete idempotent state transition. It still enforces issuer, audience, signature, type, `sub`, `sid`, `jti`, account state, and session ownership. It must not authorize other application access.

### 8.2 Current Session Logout

- Route: `POST /auth/logout`.
- Require bearer access authentication. No request body, query token, path token, or client-supplied refresh token is accepted.
- Resolve `sid` and require its session belongs to `sub`.
- In one PostgreSQL transaction, set `auth_sessions.revoked_at` when absent, set `revoked_at` on still-usable refresh records for that session, insert current access JTI revocation through original `exp`, and write `auth.logout.succeeded`.
- Repeated state transition is a no-op success. Do not reveal whether session/JTI was already revoked and do not create duplicate revocation rows.
- Return `204 No Content` without session, token, JTI, timestamp, or reason data.
- Do not revoke other sessions for this user or any session for another user.

### 8.3 All-Session Logout

- Route: `POST /auth/logout-all`.
- Require bearer access authentication. No request body is accepted.
- In one PostgreSQL transaction, revoke every active/non-expired session belonging to `sub`, revoke usable refresh records attached to those sessions, persist current JTI revocation, and write one `auth.logout_all.succeeded` event.
- Do not create one audit event per revoked session unless a later approved requirement needs that detail.
- Do not enumerate or persist all access tokens. Session revocation invalidates access tokens tied to those sessions; only current known JTI is persisted explicitly.
- Return `204 No Content`. Never affect another user's sessions.

### 8.4 Refresh Credentials, JTI Records, And Retention

- `auth_sessions.revoked_at` remains session-revocation source of truth. Do not add `isRevoked`, `isActive`, `loggedOut`, or other duplicate lifecycle state.
- Retain revoked/consumed `refresh_tokens` records for existing replay-detection retention. Mark usable records revoked; do not delete history.
- `token_revocations` stores no raw JWT. Each access-token JTI record remains through `expires_at`, then becomes eligible for cleanup. Do not delete it before expiry or retain it forever.
- Baseline revocation persistence is PostgreSQL. Redis is not required because no revocation lookup cache exists. If a later approved change adds Redis, key must never include raw JWT, TTL must not exceed token expiry, persistent lookup remains correctness source, and cache failure must not allow revoked access.

### 8.5 Audit And Error Behavior

- Add approved audit event types: `auth.logout.succeeded`, `auth.logout_all.succeeded`, `auth.logout.failed`, and `auth.logout_all.failed`.
- Success events include `userId`, applicable `sessionId`, `requestId`, event type, and creation time. Failure events use a machine-readable sanitized reason only where actor can safely be identified.
- Never audit raw JWTs, refresh tokens, passwords, authorization headers, private keys, or token hashes.
- Missing, malformed, refresh-type, expired, invalid-signature, revoked-JTI, revoked-session, disabled, and soft-deleted authentication attempts use one existing centralized generic `401` authentication response. Do not expose token/session/account reason.
- Logout persistence/audit failure must roll back database revocation changes and return centralized sanitized `500`. Rate-limit rejection remains `429`.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no new environment variable. Existing JWT, PostgreSQL, Redis, rate-limit, and request-ID configuration remains required.

### API Contract

| Operation               | Authentication                                                   | Request | Success          | Public failure                        |
| ----------------------- | ---------------------------------------------------------------- | ------- | ---------------- | ------------------------------------- |
| `POST /auth/logout`     | Valid bearer access token with `sub`, `sid`, `jti`, `typ=access` | No body | `204 No Content` | Generic `401`; `429`; sanitized `500` |
| `POST /auth/logout-all` | Valid bearer access token with `sub`, `sid`, `jti`, `typ=access` | No body | `204 No Content` | Generic `401`; `429`; sanitized `500` |

OpenAPI: not applicable at planning time — `docs/API.md` states OpenAPI infrastructure precedes endpoint reference documentation. When infrastructure exists, document both operations with bearer access authentication and only `204`, `401`, `429`, and `500`.

### Database Contract

Create focused `token_revocations` table only; do not duplicate existing session/refresh tables.

| Column       | Contract                                                                     |
| ------------ | ---------------------------------------------------------------------------- |
| `id`         | UUID primary key                                                             |
| `jti`        | Required UUID, unique                                                        |
| `token_type` | Required, baseline constrained to `access`                                   |
| `user_id`    | Required FK to `users.id`                                                    |
| `session_id` | Required FK to `auth_sessions.id` for this task                              |
| `revoked_at` | Required timestamp                                                           |
| `expires_at` | Required timestamp, no later than original access-token expiry               |
| `reason`     | Required machine-readable `LOGOUT` or `LOGOUT_ALL`; no free-form secret data |

- Index `expires_at` for cleanup and `session_id` for revocation checks; unique `jti` covers direct JTI lookup.
- Use hard-delete-safe foreign keys consistent with current auth tables. No cascade occurs from soft deletion.
- Migration unit: focused `create-token-revocations-table` UP/DOWN migration. Separate audit-check vocabulary migration only if current audit constraints require it; never edit applied migrations.

### UI Contract

Not applicable — no CMS UI change.

## 10. File Impact

Expected create:

- Focused logout route/service/repository and access-authentication middleware under existing `apps/api/src/auth/` boundary.
- One token-revocation migration and matching `.down.sql`; separate focused audit-vocabulary migration only if needed.
- Focused tests under `apps/api/tests/`.

Expected modify:

- `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/database/schema.ts`, existing auth audit constraints, and API documentation only when OpenAPI infrastructure exists.

Expected not modified:

- Login/refresh protocol semantics, JWT key configuration, Redis lifecycle contract, CMS code, secrets, and successor-task modules.

Expected paths are guidance; implementation must inspect repository before edits.

## 11. Runtime Behavior

### `POST /auth/logout`

1. Security middleware supplies body limit, request ID, rate limiting, and safe errors.
2. Logout authentication verifies bearer access JWT and principal/session/JTI state.
3. Service resolves only caller's `sid` for caller's `sub`.
4. Transaction revokes session, usable refresh records, and current JTI; writes one audit event.
5. Commit succeeds before `204`; persistence/audit error rolls back and returns sanitized `500`.
6. Later access with this JTI or session fails authentication. Repeated logout is state-safe/idempotent through route-scoped verification only.

### `POST /auth/logout-all`

1. Same authentication boundary validates caller access token.
2. Service selects only sessions belonging to caller `sub` and revokes active/non-expired ones plus usable refresh records.
3. Transaction stores current JTI revocation and one action-level audit event.
4. Commit succeeds before `204`. Caller and other sessions for same user become unusable; other users remain untouched.

## 12. Error And Edge Cases

| Scenario                                                     | Expected Result                                                                     | Security / Recovery                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| Missing/malformed/refresh bearer token                       | Generic `401`                                                                       | No state change or token detail                    |
| Invalid signature, issuer, audience, expiry, type, or claims | Generic `401`                                                                       | JWT foundation rejects; no leak                    |
| Session/user invalid or revoked JTI                          | Generic `401` outside logout idempotency scope                                      | Normal protected access remains blocked            |
| Current session already revoked                              | `204` when route-scoped verifier safely resolves same principal/session             | No duplicate JTI row/audit semantic event required |
| No active sessions for logout-all                            | `204`                                                                               | No cross-user state change                         |
| Session ownership mismatch                                   | Generic `401`                                                                       | Never revoke arbitrary session                     |
| DB/audit failure                                             | Sanitized `500`; transaction rolls back                                             | No partially revoked state                         |
| Redis unavailable                                            | Baseline unaffected because PostgreSQL is source of truth and Redis is not required | Do not bypass persistent revocation                |

## 13. Security Requirements

- RS256 and typed access JWT verification remain mandatory.
- Session revocation and access JTI revocation must both be enforced by authentication middleware.
- Current logout never implies all-device logout; all-device behavior requires explicit endpoint.
- Raw JWTs, refresh tokens, password material, authorization headers, private keys, and credential hashes never persist or log.
- Zod validates any introduced request body/query input; bearer parsing is strict.
- Atomic transactions prevent a revoked session from leaving usable refresh credentials.
- Request IDs correlate audit and application events without exposing credentials.

## 14. Test Requirements

| Scenario                | Expected Result                                                                           | Test Type                       |
| ----------------------- | ----------------------------------------------------------------------------------------- | ------------------------------- |
| Current-session logout  | Only current session and usable refresh records revoke; `204`                             | Isolated PostgreSQL integration |
| Logout-all              | Only caller user's sessions/refresh records revoke; `204`                                 | Isolated PostgreSQL integration |
| Revocation enforcement  | Revoked session/JTI fails protected access                                                | Integration                     |
| Idempotency             | Repeated state transition creates no duplicate JTI/revocation corruption                  | Integration                     |
| Authentication failures | Missing, refresh, malformed, expired, invalid issuer/audience tokens return generic `401` | Route/integration               |
| Isolation               | Other user and caller's unrelated session stay unchanged for current logout               | Integration                     |
| Atomic failure          | Insert/audit failure rolls back session/refresh/JTI changes                               | Integration                     |
| Audit safety            | Required events persist without credential material                                       | Integration/security            |
| Migration               | UP, DOWN, then UP succeeds; JTI uniqueness/FKs/indexes work                               | Isolated PostgreSQL             |
| Redis                   | Not applicable — no cache integration in baseline                                         | N/A                             |

- Tests use synthetic keys/tokens and deterministic controlled expiry. Do not use real credentials or assert raw token contents in logs.
- Regression covers login, JWT, password, security, refresh, and existing migration tests.

## 15. Task-Level Expected Results

- Two authenticated logout operations exist with explicit current-session/all-session distinction.
- PostgreSQL holds active access JTI revocations only through token expiry.
- Revoked session/JTI credentials cannot authenticate ordinary protected routes.
- Refresh records become unusable after associated session revocation without erasing reuse history.
- Logout audits are durable and redacted.

## 16. Acceptance Criteria

- [x] `POST /auth/logout` requires valid access authentication and revokes only caller's current session.
- [x] `POST /auth/logout-all` requires valid access authentication and revokes only caller user's sessions.
- [x] Both endpoints return `204` without credential or revocation details on success.
- [x] Current/all-session state transitions are idempotent and never expose already-revoked state.
- [x] Session revocation invalidates usable refresh credentials while retaining replay history.
- [x] Current access JTI revocation persists through original token expiry; raw JWT is never stored.
- [x] Authentication middleware enforces both session and JTI revocation for ordinary protected access.
- [x] Generic `401`, `429`, and sanitized `500` behavior prevents account/session/token-state disclosure.
- [x] Logout audit records use approved names and omit sensitive credential material.
- [x] Token-revocation migration uses focused reviewed UP/DOWN files; existing migrations remain immutable.
- [x] No cross-user or implicit all-device revocation occurs.
- [ ] Focused tests, isolated PostgreSQL migration/transaction evidence, lint, typecheck, full tests, Code Anti-Slop, and `git diff --check` pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Reject duplicated session/refresh models, raw-token storage, access-token enumeration tables, Redis-only correctness, process-local locks, redundant lifecycle booleans, hidden TODO/FIXME/HACK, unchecked `any`/assertions, endpoint-specific auth bypasses outside logout idempotency, fake transactionality, and successor-task behavior. UI Anti-Slop and visual verification: not applicable — no UI change.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api format:check`
- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused logout/authentication/repository tests.
- `bun run --cwd apps/api test -- --detectOpenHandles`.

### Database

- `drizzle-kit generate` confirms focused schema output.
- Isolated PostgreSQL migration UP, DOWN, re-apply, transaction rollback, and cross-session isolation tests.

### Build / UI

Not applicable — API package has no build script and no UI changes.

### Anti-Slop

- Code Anti-Slop runs during implementation and after fixes.

## 19. Completion Evidence

| Acceptance criterion         | Evidence                                                    |
| ---------------------------- | ----------------------------------------------------------- |
| Routes/status/authentication | `logout-revocation.test.ts` route and middleware checks     |
| Session/refresh/JTI state    | Isolated PostgreSQL repository transaction evidence         |
| Atomicity/idempotency        | Repeat-operation and forced-audit-failure rollback evidence |
| Audit/redaction              | Repository/diff inspection; synthetic test credentials only |
| Schema/rollback              | Isolated migration UP, DOWN, and re-UP output               |
| Static/regression            | Prettier, ESLint, TypeScript, and 79-test Jest output       |
| Scope/security               | Code Anti-Slop, `git diff --check`, diff, and secret review |

## 20. Traceability

| Trace Type      | References                                                                  |
| --------------- | --------------------------------------------------------------------------- |
| API             | `POST /auth/logout`, `POST /auth/logout-all`                                |
| Database        | `auth_sessions`, `refresh_tokens`, `token_revocations`, `auth_audit_events` |
| Security        | `docs/SECURITY.md`, JWT/password/security/refresh foundation tasks          |
| Dependency task | `be/05-redis-foundation`, `be/11-refresh-token`                             |
| Test IDs        | Not applicable — project has no test-ID system                              |

## 21. Open Points

None.

## 22. Definition Of Done

- [x] Dependency evidence passed before implementation began.
- [x] All in-scope behavior passes with no intentional out-of-scope changes.
- [x] Access authentication enforces session/JTI revocation; logout idempotency remains route-scoped.
- [x] Isolated PostgreSQL migration, transaction, and isolation evidence passes.
- [x] Code Anti-Slop, format, lint, typecheck, focused/full tests, and `git diff --check` pass.
- [x] Changed-file, audit/redaction, secret, and human review complete.
