# be/08-jwt-foundation - JWT Foundation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/08-jwt-foundation` |
| Batch | N/A |
| Owning Feature | N/A |
| Workstream | Backend |
| Task Category | JWT foundation |
| Repository/App | `apps/api` |
| Status | Ready: approved for implementation |
| Priority | Foundation execution order 8 |
| Suggested Size | Small - focused JWT infrastructure, startup integration, and tests |
| Depends On | `be/02-environment-validation`, `be/04-identity-schema`, `be/07-security-foundation` |
| Blocks | `be/09-password-hashing`, later login/session/token tasks |
| Execution Order | 8 |

## 2. Outcome

API starts only after loading valid RS256 key material and exposes a focused JWT signing and verification boundary. It emits and validates a closed access/refresh claim schema for the stable `users.id` principal without adding authentication, sessions, or authorization behavior.

## 3. Context

- `docs/SECURITY.md` requires RS256, issuer, audience, expiry, JTI, and applicable `nbf` validation.
- `docs/DATABASE.md` and `tasks/be/04-identity-schema/technical.md` establish `users.id` as a UUID primary key.
- `docs/ARCHITECTURE.md` keeps cross-cutting work in focused infrastructure modules and keeps authorization server-side.
- `apps/api/src/config/env.ts` already validates required JWT paths, issuer, audience, and expiration configuration.
- `apps/api/package.json` already includes `jsonwebtoken`, Zod, and TypeScript types. Do not add a JWT or crypto dependency unless repository inspection proves the installed stack cannot meet this contract.

## 4. Dependencies

- Validated API environment values for `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_TOKEN_EXPIRES_IN`, and `JWT_REFRESH_TOKEN_EXPIRES_IN`.
- `users.id` UUID identity contract from `be/04-identity-schema`.
- Existing request ID, centralized safe-error, and logging rules from `be/07-security-foundation`.
- No database, session store, revocation store, or API endpoint is required by this task.

## 5. In Scope

- Load and validate configured RS256 private and public keys during API initialization.
- Create focused typed signing and verification primitives for access and refresh tokens.
- Enforce the approved standard and custom claim contract.
- Initialize the JWT boundary before normal API work starts and fail startup safely if key/configuration initialization cannot provide a secure signer/verifier.
- Add focused unit tests and full applicable API validation evidence.

## 6. Out of Scope

- Login, registration, password verification, password reset, MFA, OAuth, cookie transport, or CSRF behavior.
- Session persistence, refresh-token persistence/rotation, token revocation persistence, logout, or session UUID generation.
- Authentication routes or middleware, authorization middleware, RBAC/permission queries, and audit records.
- Embedding email, profile, roles, permissions, `isAdmin`, password data, secrets, or mutable business state in JWTs.
- JWT claim catalogs beyond the closed schema below.

## 7. Existing Implementation

- `apps/api/src/config/env.ts` - required JWT environment values and startup-safe validation pattern.
- `apps/api/src/server.ts` - API initialization and deterministic startup failure path.
- `apps/api/src/logging/index.ts` - Pino redaction and request-correlation conventions.
- `apps/api/src/security/index.ts` - safe production error boundary and security foundation behavior.
- `apps/api/tests/env.test.ts` and current API Jest tests - test structure and isolated filesystem conventions.
- `apps/api/package.json` - installed `jsonwebtoken` dependency and validation scripts.

## 8. Implementation Requirements

### Identity and claims

- JWT `sub` is required and equals `users.id`, represented as a UUID string. It is the stable authenticated-user principal for both access and refresh tokens.
- `sub` never represents a session, email, username, role, or any other identity.
- `iss`, `aud`, `iat`, `exp`, and `jti` are required on every signed token. `iss` and `aud` must exactly satisfy configured values. `iat` and `exp` are numeric JWT dates. `jti` is a UUID generated independently for every issuance.
- `nbf` is optional. When present, it must be a valid numeric JWT date and verification must reject a token before that time.
- The application payload claim `typ` is required and only accepts `access` or `refresh`. This payload claim is distinct from the JOSE header `typ`.
- Issuance and verification must require an explicit token type. An access verifier rejects `typ=refresh`; a refresh verifier rejects `typ=access`.
- `sid` is optional and reserved for a later session-backed task. JWT foundation neither creates sessions nor requires `sid`. If an approved caller supplies it, it must be a UUID and never replaces `sub`.
- Claims consumed by application code use a closed typed schema. Do not treat unknown payload claims as trusted state.

### Token classes

| Token type | Required claims | Optional claims | Forbidden baseline claims |
| --- | --- | --- | --- |
| `access` | `sub`, `iss`, `aud`, `iat`, `exp`, `jti`, `typ=access` | `nbf`, `sid` | email, username, profile, roles, permissions, `isAdmin`, password data, secrets, mutable business state |
| `refresh` | `sub`, `iss`, `aud`, `iat`, `exp`, `jti`, `typ=refresh` | `sid` only when a later session task requires it | authorization state, profile, email, password data, secrets, mutable business state |

### Signing and verification boundary

- RS256 is the sole signing and accepted verification algorithm. Verification must explicitly reject algorithm substitution.
- Signing derives `iss`, `aud`, `iat`, `exp`, and a new `jti` internally from validated configuration and current time. Callers cannot override those values.
- Access issuance uses `JWT_ACCESS_TOKEN_EXPIRES_IN`; refresh issuance uses `JWT_REFRESH_TOKEN_EXPIRES_IN`. No lifetime default or hard-coded replacement is allowed.
- Validate configured lifetimes before issuing tokens. Invalid lifetime configuration fails initialization or issuance safely without issuing a token.
- Verification validates cryptographic signature, RS256 algorithm, issuer, audience, expiry, applicable `nbf`, and closed payload shape before returning a typed result.
- The verified result contains only `sub`, `jti`, `typ`, optional `sid`, `iat`, and `exp`. It never contains raw token text or untrusted arbitrary claims.
- Use Zod or an equivalent existing project-compatible strict runtime schema at the payload boundary.

### Key handling and startup

- Read configured key paths only in API infrastructure. Private key content never reaches CMS/browser code, logs, errors, fixtures, or Git.
- Unreadable, empty, malformed, or non-RS256-compatible key material causes deterministic sanitized startup failure. Never start normal API handling with an unsafe JWT boundary.
- Initialize JWT infrastructure after validated environment is loaded and logging is available, before normal API work depends on JWT behavior.
- Preserve existing API startup, security middleware, logging, database, and Redis behavior outside this narrow initialization dependency.

## 9. Applicable Contracts

### Configuration Contract

| Variable | Required | Type | Validation | Default | Secret |
| --- | --- | --- | --- | --- | --- |
| `JWT_PRIVATE_KEY_PATH` | Yes | non-empty path string | Existing environment validation requires a non-empty value; JWT initialization requires readable valid RS256 private key material | None - startup fails if missing/invalid | Yes |
| `JWT_PUBLIC_KEY_PATH` | Yes | non-empty path string | Existing environment validation requires a non-empty value; JWT initialization requires readable valid RS256 public key material | None - startup fails if missing/invalid | Yes |
| `JWT_ISSUER` | Yes | non-empty string | Existing environment validation; exact signed/verified issuer | None - startup fails if missing/invalid | No |
| `JWT_AUDIENCE` | Yes | non-empty string | Existing environment validation; exact signed/verified audience | None - startup fails if missing/invalid | No |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Yes | non-empty lifetime string | Existing environment validation plus signing-boundary lifetime validation | None - startup fails if missing/invalid | No |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Yes | non-empty lifetime string | Existing environment validation plus signing-boundary lifetime validation | None - startup fails if missing/invalid | No |

### API Contract

Not applicable - this task creates no endpoint, request, response, OpenAPI operation, or client-visible JWT error contract.

### Database Contract

Not applicable - this task reads no identity row and creates no schema, migration, session, revocation, or token persistence record. `users.id` is only the approved semantic source for `sub`.

### UI Contract

Not applicable - this task changes no CMS UI or browser behavior.

## 10. File Impact

Expected paths are based on current top-level focused infrastructure-module patterns and must be verified before editing.

### Expected Create

- `apps/api/src/jwt/index.ts` - focused JWT initialization, signing, and verification boundary.
- `apps/api/tests/jwt.test.ts` - isolated JWT contract tests.

### Expected Modify

- `apps/api/src/server.ts` - initialize JWT infrastructure after validated configuration and before normal API startup.
- `apps/api/tests/env.test.ts` only if JWT lifetime validation needs explicit environment-contract coverage.

### Expected Not Modified

- Database schema/migrations, identity data, Redis behavior, logging design, security middleware behavior, CMS code, package dependencies, API routes, and successor auth/session/revocation modules.

## 11. Runtime Behavior

1. Load and validate environment configuration.
2. Initialize terminal/file logging using existing safe logging behavior.
3. Read and validate configured private/public RS256 key material and create the JWT boundary.
4. Initialize current database and Redis dependencies, then start normal HTTP listening.
5. A future approved caller requests access or refresh issuance with an approved user UUID and explicit token type. The boundary creates standard claims, a new JTI, and only allowed optional claims.
6. A future approved caller verifies raw token input with an explicit expected type. The boundary validates signature and approved claims, then returns the small typed result or a sanitized internal verification failure.
7. Initialization failure reports safe operational information through existing logging/stderr behavior, sets failure state, and does not start the server.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Missing, unreadable, empty, or malformed PEM | Initialization fails deterministically. | Never log path contents or key contents; no API start. |
| Key incompatible with RS256 | Initialization fails deterministically. | No fallback algorithm or unsafe signer. |
| Invalid configured lifetime | Initialization or issuance fails safely. | No implicit lifetime or issued token. |
| Wrong/unsupported algorithm | Verification rejects token. | Explicit RS256-only allowlist prevents algorithm substitution. |
| Invalid signature, issuer, audience, expiry, or present future `nbf` | Verification rejects token. | No raw token or verifier detail in external errors/logs. |
| Missing/invalid UUID `sub` | Verification rejects token. | Never substitute email, role, or session identity. |
| Missing/invalid UUID `jti` | Verification rejects token. | No token tracking assumption without unique identifier. |
| Missing/unknown/mismatched `typ` | Verification rejects token. | Access and refresh tokens cannot be confused. |
| Present invalid `sid` | Verification rejects token. | `sid` remains separate from user principal. |
| Extra payload claims | Verification may parse signature but returns only approved typed claims. | Extra data is never trusted authorization/business state. |
| Error path | Internal code may distinguish failure categories for tests/control flow. | Client-facing behavior stays sanitized; no key/token/secret leakage. |

## 13. Security Requirements

- `sub` always means the `users.id` UUID principal. Do not overload it with session semantics.
- RS256 only. Enforce exact issuer/audience, expiry, required JTI, and applicable `nbf` during verification.
- Generate an independent UUID JTI for every issued token, including each access/refresh pair and future rotation.
- Keep claims minimal and typed. No roles, permissions, `isAdmin`, email, profile, password metadata, secrets, or mutable authorization state in baseline tokens.
- Backend authorization remains `user -> role -> permission -> action`; JWT foundation does not snapshot authorization state.
- Never log, return, commit, or fixture raw token text, private/public key content, passwords, credentials, or secrets.
- Do not add session persistence, refresh rotation, revocation, authorization middleware, cookie transport, or API error behavior.

## 14. Test Requirements

### Happy Path

- Issue and verify valid access and refresh tokens using an ephemeral isolated RS256 key pair generated at test runtime.
- Assert `sub` is the expected user UUID, `typ` matches requested token class, standard claims exist, and each issuance produces a distinct JTI.

### Validation

- Verify exact issuer/audience enforcement, expiry enforcement, and `nbf` enforcement when present.
- Verify token input and decoded payload reject missing/malformed UUID `sub`, missing/malformed UUID `jti`, missing `typ`, unknown `typ`, and invalid optional `sid`.
- Verify access verification rejects refresh tokens and refresh verification rejects access tokens.

### Negative / Failure

- Reject wrong algorithm, invalid signature, malformed token/payload, malformed or unreadable key, and invalid configured token lifetime.
- Assert safe initialization/verification failures do not issue a token or continue unsafe startup.

### Security

- Assert no token, key, or secret value appears in thrown safe external messages or captured Pino output.
- Assert verified result omits raw token text, roles, permissions, and unknown claims.

### Regression and Isolation

- Run existing API Jest tests unchanged.
- Generate temporary test keys at runtime, isolate configuration/time, and clean temporary files deterministically. Never commit static private-key fixtures or wait for real expiration windows.

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Valid access token | Typed verified access result with UUID `sub`, unique JTI, and required claims | Unit |
| Valid refresh token | Typed verified refresh result with UUID `sub`, unique JTI, and required claims | Unit |
| Token-type mismatch | Explicit verifier rejects opposite token class | Unit |
| Algorithm/signature/issuer/audience violation | Token rejects safely | Unit |
| Expired/future-`nbf` token | Token rejects safely | Unit with controlled time |
| Missing/malformed required claim | Token rejects safely | Unit |
| Invalid keys/lifetime | Initialization or issuance fails safely | Unit |
| Sensitive error path | No raw key/token/secret leakage | Unit |
| Existing API tests | Existing behavior remains passing | Regression |

## 15. Task-Level Expected Results

- A narrow RS256 JWT infrastructure boundary exists and is initialized before normal API startup.
- Tokens contain only the approved minimal claims and have an independently generated JTI.
- Verification returns only approved typed claims after complete cryptographic and claim validation.
- API behavior, database state, sessions, revocation, and authorization remain unchanged.

## 16. Acceptance Criteria

- [ ] `sub` is required, UUID-formatted, and represents `users.id` for access and refresh tokens.
- [ ] RS256 is the sole signing and verification algorithm.
- [ ] Exact issuer, audience, expiry, and present `nbf` are enforced.
- [ ] Every token has a newly generated unique UUID JTI.
- [ ] Required `typ` only permits `access` or `refresh`; each verifier rejects the opposite type.
- [ ] Optional `sid` is UUID-validated when present and remains unused unless a later session task approves it.
- [ ] Baseline JWT claims omit roles, permissions, `isAdmin`, profile, email, password data, secrets, and mutable authorization state.
- [ ] Malformed keys, configuration, and tokens fail safely without raw key/token/secret disclosure.
- [ ] No login, session persistence, refresh rotation, revocation persistence, authorization middleware, API route, or CMS behavior is introduced.
- [ ] Focused JWT tests, applicable full tests, lint, typecheck, Code Anti-Slop, and `git diff --check` pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Reject generic JWT payload abstractions, duplicate issuer/claim checks, unused wrappers/dependencies, hidden TODO/FIXME/HACK, unjustified `any`/assertions, fake cryptography, committed fixtures/keys, raw secret logging, and scope creep into auth/session features. UI Anti-Slop and visual verification: not applicable - no UI change.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused `apps/api/tests/jwt.test.ts`.
- `bun run --cwd apps/api test`.

### Build / Database / UI

Not applicable - API package has no build script; no database or UI change is expected.

### Anti-Slop

- Run Code Anti-Slop during implementation and again after fixes.

## 19. Completion Evidence

| Acceptance criterion | Evidence |
| --- | --- |
| RS256 keys and startup boundary | Focused initialization/key tests and startup integration review |
| Required claims and typed result | `apps/api/tests/jwt.test.ts` valid access/refresh cases |
| Algorithm, issuer, audience, expiry, `nbf`, JTI, and type enforcement | `apps/api/tests/jwt.test.ts` negative cases |
| Minimal claims and sensitive-data safety | Focused payload/error/log assertions |
| No regression | `bun run --cwd apps/api test` |
| Static correctness | lint and typecheck command output |
| Scope and whitespace hygiene | `git status`, `git diff`, and `git diff --check` review |
| Anti-Slop | Code Anti-Slop output or exact unavailable reason |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture | `docs/ARCHITECTURE.md` backend boundaries and authorization model |
| Security | `docs/SECURITY.md` JWT and secret-handling baseline |
| Database | `tasks/be/04-identity-schema/technical.md` `users.id` UUID primary key |
| Configuration | `apps/api/src/config/env.ts` JWT environment contract |
| Dependency task | `be/02-environment-validation`, `be/04-identity-schema`, `be/07-security-foundation` |
| Test IDs | Not applicable - project has no test-ID system |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] Acceptance criteria and approved scope are satisfied.
- [ ] JWT infrastructure initializes safely and does not start normal API work when secure initialization fails.
- [ ] Focused and applicable full tests pass with isolated generated test keys.
- [ ] Code Anti-Slop passes; UI Anti-Slop and visual verification are documented as not applicable.
- [ ] Lint, typecheck, and `git diff --check` pass.
- [ ] Changed files and diff are reviewed; no raw key, token, secret, generated junk, or unrelated change remains.
- [ ] No database migration, OpenAPI change, API route, browser verification, or UI work is claimed without evidence.
