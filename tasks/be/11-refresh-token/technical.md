# be/11-refresh-token - Refresh Token Rotation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/11-refresh-token` |
| Batch | N/A |
| Owning Feature | N/A |
| Workstream | Backend |
| Task Category | Refresh-token rotation |
| Repository/App | `apps/api` |
| Status | Ready: approved for implementation |
| Priority | Foundation execution order 11 |
| Suggested Size | Small - refresh endpoint, atomic rotation, reuse response, focused migrations, and tests |
| Depends On | `be/08-jwt-foundation`, `be/10-login-session` |
| Blocks | `be/12-logout-revocation` |
| Execution Order | 11 |

## 2. Outcome

Provide unauthenticated `POST /auth/refresh`. It accepts a JSON refresh credential, validates its JWT/session/persisted state, atomically consumes it, creates one replacement refresh record, issues a new token pair, detects replay of a consumed token, revokes only its compromised session, and records durable redacted refresh audit events.

## 3. Context

- `apps/api/src/app.ts` has no API prefix; physical route remains `POST /auth/refresh`.
- `apps/api/src/auth/login-service.ts` returns refresh tokens in JSON and stores only deterministic SHA-256 fingerprints in `refresh_tokens`.
- `apps/api/src/database/schema.ts` already defines `auth_sessions`, `refresh_tokens`, and `auth_audit_events`.
- `apps/api/src/jwt/index.ts` enforces RS256, issuer, audience, access/refresh `typ`, UUID `sub`/`sid`/`jti`, and configured expiry.
- `auth_sessions.expires_at` is a fixed session upper bound. This task does not introduce sliding sessions.
- `be/12-logout-revocation` owns explicit logout, requested session revocation, and revoke-all behavior.

## 4. Dependencies

- Applied `be/10-login-session` auth-session, refresh-token, and login-audit migrations.
- Valid JWT key/configuration and password-independent login/session foundation.
- Existing global security middleware, request IDs, Pino/Morgan redaction, safe errors, and PostgreSQL transaction support.
- OpenAPI remains not applicable because repository has no OpenAPI infrastructure.

## 5. In Scope

- `POST /auth/refresh` request validation and JSON token transport.
- Refresh JWT, session, user, fingerprint, JTI, expiry, and current-record validation.
- Single-use rotation, replacement token issuance, fixed session-lifetime cap, lineage, and concurrent-use safety.
- Confirmed consumed-token reuse detection, compromised-session revocation, and refresh-specific durable audit events.
- Focused schema/migrations required for refresh lineage and refresh audit vocabulary.
- Focused unit/integration tests and regression evidence.

## 6. Out of Scope

- Logout endpoint, user-requested session revocation, revoke-all sessions, and generic token-revocation API (`be/12`).
- Cookie transport, CSRF behavior, access-token persistence, token-revocation table, registration, RBAC, MFA, OAuth, or generic audit framework.
- Sliding sessions, retention cleanup scheduler, IP/user-agent storage, and a dedicated refresh rate limit.

## 7. Existing Implementation

- `apps/api/src/auth/login-route.ts`, `apps/api/src/auth/login-service.ts`, and `apps/api/src/auth/login-repository.ts` establish focused route/service/repository boundaries.
- `apps/api/src/database/schema.ts` has `refresh_tokens` fields `id`, `session_id`, `jti`, `token_hash`, `created_at`, `expires_at`, and `revoked_at`; it lacks rotation lineage.
- `auth_audit_events` currently permits only login event/reason check-constraint values; refresh event vocabulary needs a focused extension.
- `apps/api/src/security/index.ts` supplies global rate limiting, body parsing, safe `400`/`413`/`500`, and no wildcard CORS.
- `apps/api/tests/login-session.test.ts` proves existing login/session token and audit boundaries.

## 8. Implementation Requirements

### Refresh API

- Add unauthenticated `POST /auth/refresh`; no alternate path, query-string token, URL-path token, access-token authentication, or cookie transport.
- Accept strict JSON `{ "refreshToken": string }`. Zod requires a non-empty string, preserves bytes/whitespace, and rejects unknown/missing fields through existing `400 { "message": "Bad request" }` behavior.
- Success is exactly `200 { "accessToken": string, "refreshToken": string, "tokenType": "Bearer", "expiresIn": number }`.
- `expiresIn` is positive seconds from the issued access token's configured expiry. Do not hard-code `900`.
- Existing global rate limiter remains active; no refresh-specific limiter is added.

### Refresh validation and rotation

- Verify presented credential with existing JWT verifier as expected type `refresh`; enforce RS256, signature, issuer, audience, expiry, `nbf` when present, UUID `sub`/`sid`/`jti`, and `typ=refresh`.
- Compute the existing deterministic SHA-256 lowercase-hex fingerprint. Never log or persist the raw token; do not change fingerprint strategy.
- Require matching persisted `refresh_tokens` row by `jti`, `sid`, and fingerprint; require matching session/user identity.
- Require session exists, is unrevoked/unexpired, belongs to active non-deleted user, and token record is unrevoked/unexpired.
- For a usable record, generate a new access token and a new refresh token with same `sub` and `sid`, fresh independent JTIs, and correct `typ` values.
- Replacement refresh expiry is earlier of configured refresh-token expiry and `auth_sessions.expires_at`. Extend the focused JWT issuance boundary only as needed to sign that bounded expiry; do not add a second JWT library or hard-code duration parsing.
- Do not extend `auth_sessions.expires_at` or introduce a sliding session.
- In one PostgreSQL transaction, atomically confirm current token state, consume the old record with `revoked_at`, create child record, set lineage, and persist `auth.refresh.succeeded`. Return tokens only after commit.
- Use PostgreSQL transaction/row-locking or conditional-update semantics compatible with current Drizzle/PostgreSQL versions. At most one concurrent request may rotate one old token. Do not use an in-memory lock as correctness mechanism.

### Reuse and invalid state

- A record with `replaced_by_token_id` set was consumed by successful rotation. Presentation of its matching raw credential is confirmed reuse.
- Confirmed reuse atomically revokes only that `auth_sessions` row, revokes all still-active `refresh_tokens` for that session, records `auth.refresh.reuse_detected` and `auth.session.revoked_due_to_refresh_reuse`, then returns generic `401` without tokens.
- A disabled or soft-deleted user discovered during valid refresh validation similarly revokes only that session, records a redacted failure event, and returns generic `401`.
- Expired/revoked session/token, malformed/wrong-type JWT, unknown JTI, fingerprint mismatch, claim mismatch, invalid user, and reuse never issue tokens or reveal specific state.
- Failed refresh audit persistence is an internal failure: return safe `500`, emit only sanitized operational logging/request ID, and do not silently drop required audit events.
- Signing failure consumes no old record. Transaction failure returns no new pair and leaves no committed child/lineage update.

## 9. Applicable Contracts

### Configuration Contract

| Variable | Required | Type | Validation | Default | Secret |
| --- | --- | --- | --- | --- | --- |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Yes | configured duration | Existing JWT validation; issued access expiry | None - issuance fails if invalid | No |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Yes | configured duration | Existing JWT validation; replacement is capped by session expiry | None - issuance fails if invalid | No |

No new environment variables are introduced.

### API Contract

| Item | Contract |
| --- | --- |
| Method/path | `POST /auth/refresh` |
| Authentication | No access token required; JSON refresh credential is required |
| Request | Strict JSON `{ "refreshToken": string }`; non-empty, unmodified |
| Success | `200` with new `{ "accessToken", "refreshToken", "tokenType": "Bearer", "expiresIn" }` |
| Malformed request | `400 { "message": "Bad request" }` |
| Invalid refresh credential/state | `401 { "message": "Invalid refresh token" }` for every invalid/reuse/user/session case |
| Rate limit | Existing global limiter returns `429` |
| Internal failure | `500 { "message": "Internal server error" }` |

### Database Contract

- Modify `refresh_tokens` with nullable `replaced_by_token_id` UUID self-reference to `refresh_tokens.id` using `ON DELETE SET NULL`; use it only for successful rotation lineage.
- Use existing `revoked_at` as old-token consumption marker. No overlapping boolean state fields.
- Extend `auth_audit_events` allowed check-constraint values only for `auth.refresh.succeeded`, `auth.refresh.failed`, `auth.refresh.reuse_detected`, and `auth.session.revoked_due_to_refresh_reuse`, plus approved refresh reason values.
- Preserve `auth_sessions` and `refresh_tokens` 30-day post-unusable retention and `auth_audit_events` 90-day retention. Consumed rows remain through retention for replay detection; no cleanup job is added.
- Expected migrations: `0008_add-refresh-token-rotation-lineage.sql` with matching `.down.sql`, and `0009_extend-auth-audit-event-vocabulary.sql` with matching `.down.sql`. Verify exact next tags before generation.

### UI Contract

Not applicable - no CMS UI change.

## 10. File Impact

**Expected Modify**

- `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/jwt/index.ts`.
- `apps/api/src/auth/login-repository.ts` only where focused shared auth persistence requires it.
- `apps/api/src/database/schema.ts`, `apps/api/drizzle/meta/_journal.json`, and generated snapshots.
- `apps/api/tests/login-session.test.ts` only for shared regression coverage.

**Expected Create**

- Focused refresh route/controller, service, repository modules under `apps/api/src/auth/`.
- Focused refresh tests under `apps/api/tests/`.
- Focused lineage/audit-vocabulary migration UP/DOWN pairs under `apps/api/drizzle/`.

**Expected Not Modified**

- Password hashing, login API behavior, Redis, CMS, user/role/permission schema, generic logout/revocation API, secrets, and unrelated dependencies.

Expected paths are guidance; inspect repository before editing.

## 11. Runtime Behavior

1. Security middleware assigns request ID, applies global rate limit/body limit, then routes `POST /auth/refresh`.
2. Zod validates strict non-empty JSON refresh token without mutation.
3. Service verifies refresh JWT and computes fingerprint without logging credential material.
4. Service/repository validates token/session/user linkage and bounded expiry.
5. Service signs replacement pair before state mutation, with replacement refresh expiry capped by session expiry.
6. Transaction atomically consumes old token, writes child + lineage + required success audit, then commits.
7. Route returns only new token pair after commit.
8. Invalid state returns generic `401`; confirmed reuse/session-compromise path revokes only session and returns same generic `401`; internal/audit/persistence failure returns safe `500`.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Missing/extra/malformed body | `400 Bad request` | No token/audit secret leakage. |
| Access, malformed, invalid-signature, wrong issuer/audience/type, expired, or claim-invalid JWT | Generic `401 Invalid refresh token` | No lookup-state disclosure. |
| Unknown JTI, SID/sub mismatch, fingerprint mismatch, revoked/expired token/session | Generic `401` | No token pair. |
| Consumed token with lineage | Revoke associated session + active session tokens, audit reuse, generic `401` | Other user sessions unchanged. |
| Disabled/soft-deleted user | Revoke affected session, audit failure, generic `401` | No account-state disclosure. |
| Concurrent same-token refresh | One committed child at most; losers generic `401` | Database-enforced atomicity. |
| Signing failure | Safe `500`; old token remains usable | No partial rotation. |
| Persistence/audit failure | Safe `500`; no returned new pair | Roll back transaction; sanitized Pino error only. |

## 13. Security Requirements

- Treat raw refresh token as credential: no logs, audit fields, database rows, URL/query values, snapshots, or test fixtures with live values.
- JWT verification strictly uses current RS256 typed boundary; no algorithm downgrade and no acceptance of access tokens.
- Preserve generic public failures for account/session/token/reuse states.
- Audit records remain durable and separate from Morgan/Pino ordinary logs; audit metadata has request ID but no raw credential or fingerprint.
- Database transaction is source of concurrency correctness. Do not rely on process-local locks.
- No access-token persistence, token-revocation table, cookie transport, CSRF behavior, or unrelated-session revocation.

## 14. Test Requirements

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Valid current refresh | One new pair, same `sub`/`sid`, fresh JTI, correct types | Integration |
| Old token second use | Generic `401`; no second child | Integration |
| Replacement token | Exactly one subsequent rotation succeeds | Integration |
| Lineage | Old record consumed/revoked and points to child | Repository/integration |
| Concurrent refresh | At most one `200`, one child record | Isolated database integration |
| Confirmed reuse | Only associated session + active tokens revoked; redacted audits; generic `401` | Isolated database integration |
| Session/user invalid state | Generic `401`, no pair, applicable session revocation | Integration |
| Session-bound expiry | Child expiry never after original session expiry | Unit/integration |
| JWT/fingerprint failures | Generic `401`, no state mutation | Unit/integration |
| Signing/DB/audit failure | Safe `500`, no committed partial rotation/pair | Unit/integration |
| Credential safety | Raw token/access token absent from persisted/audit/log data | Security |
| Regression | Login, JWT, password, security, migration rollback tests remain passing | Regression |

Use isolated DB transactions/database per concurrency/migration test. Do not wait for real TTL expiration; create controlled timestamps/test-safe expiry configuration. Use synthetic credentials/keys only.

## 15. Task-Level Expected Results

- Refresh endpoint follows middleware -> route/controller -> service -> repository -> database flow.
- Successful refresh has exactly one committed replacement child; old credential becomes unusable.
- Reuse detection survives normal rotation because consumed metadata remains retained.
- Session expiry is fixed and caps child refresh expiry.
- Refresh audit is durable/redacted; logout/general revocation remains deferred.

## 16. Acceptance Criteria

- [ ] `POST /auth/refresh` accepts only strict JSON body refresh-token transport.
- [ ] Success returns only a new `200` bearer token pair with configured access `expiresIn`.
- [ ] Refresh JWT must be `typ=refresh` with valid typed claims, RS256 signature, issuer, audience, and expiry.
- [ ] Session, user, JTI, SID, fingerprint, expiry, and consumed/revoked state are validated.
- [ ] Every successful use atomically consumes old refresh token, creates one lineage-linked child, and uses fresh JTIs with same `sub`/`sid`.
- [ ] Concurrent presentation produces at most one successful rotation/child.
- [ ] Confirmed consumed-token reuse revokes only compromised session and its active refresh records, audits event, and returns generic `401`.
- [ ] User disabled/deleted state blocks refresh and revokes affected session without public account disclosure.
- [ ] Replacement refresh expiry does not exceed original session expiry; session expiry never extends.
- [ ] Raw refresh/access tokens are never stored/logged/audited; consumed records survive approved retention.
- [ ] Required refresh audit events persist; audit failure is safe `500` rather than silently dropped.
- [ ] Focused UP/DOWN migrations cover lineage and audit vocabulary only; no duplicate auth tables or logout/revoke-all API.
- [ ] Focused tests, isolated concurrency/migration evidence, lint, typecheck, full tests, Code Anti-Slop, and `git diff --check` pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Reject generic auth frameworks, process-local concurrency locks, duplicate token/revocation tables, redundant state booleans, raw credential storage/logging, unchecked casts/`any`, generic error envelopes, hidden TODO/FIXME/HACK, fake atomicity, unrelated refactors, empty migrations, and successor-task behavior. UI Anti-Slop and visual verification: not applicable - no UI change.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api format:check`
- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused refresh route/service/repository tests.
- `bun run --cwd apps/api test -- --detectOpenHandles`.

### Database

- `drizzle-kit generate` reports expected focused migrations/no accidental schema changes after generation.
- Isolated PostgreSQL migration UP, DOWN, re-apply, and concurrent refresh evidence.

### Build / UI

Not applicable - API package has no build script and no UI change is expected.

### Anti-Slop

- Run Code Anti-Slop during implementation and after fixes.

## 19. Completion Evidence

| Acceptance criterion | Evidence |
| --- | --- |
| API and generic failures | Supertest `200`/`400`/`401`/`429`/safe `500` tests |
| JWT/session/token linkage | Decoded replacement claims and persisted session/record assertions |
| Rotation/reuse/concurrency | Isolated DB transaction tests proving one child and targeted session revocation |
| Expiry cap | Controlled expiry test for configured TTL vs session maximum |
| Credential/audit safety | Database/audit/log assertions show no raw tokens/access tokens/fingerprints |
| Schema discipline | Generated `0008`/`0009` UP/DOWN, journal/snapshot review, isolated UP/DOWN/re-apply output |
| Static/regression | format, lint, typecheck, Jest, `git diff --check` output |
| Anti-Slop | Code Anti-Slop output or exact unavailable reason |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| API | `docs/API.md`, `be/10-login-session`, current API safe envelope |
| Security | `docs/SECURITY.md`, `AGENTS.md`, `be/07`, `be/08`, `be/10` |
| Database | `docs/DATABASE.md`, current `auth_sessions`/`refresh_tokens`/`auth_audit_events` schema |
| Dependency task | `be/08-jwt-foundation`, `be/10-login-session`, `be/12-logout-revocation` |
| Test IDs | Not applicable - project has no test-ID system |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] Acceptance criteria and approved scope are satisfied.
- [ ] Rotation/reuse behavior is atomic, generic externally, durable/auditable internally, and has no credential leakage.
- [ ] Focused migration UP/DOWN/re-apply and isolated concurrency evidence pass.
- [ ] Focused and full applicable tests pass with synthetic credentials only.
- [ ] Code Anti-Slop passes; UI Anti-Slop and visual verification are documented not applicable.
- [ ] Format, lint, typecheck, and `git diff --check` pass.
- [ ] Changed files/diff are reviewed; no raw token, password, hash, secret, generated junk, or unrelated changes remain.
