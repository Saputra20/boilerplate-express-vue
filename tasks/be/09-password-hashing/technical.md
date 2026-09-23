# be/09-password-hashing - Password Hashing

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/09-password-hashing` |
| Batch | N/A |
| Owning Feature | N/A |
| Workstream | Backend |
| Task Category | Password foundation |
| Repository/App | `apps/api` |
| Status | Ready: approved for implementation |
| Priority | Foundation execution order 9 |
| Suggested Size | Small - focused local password hashing/verification module and tests |
| Depends On | `be/04-identity-schema` |
| Blocks | `be/10-login-session` |
| Execution Order | 9 |

## 2. Outcome

Provide an Argon2id password hashing and verification boundary. It accepts only passwords from 12 to 128 Unicode code points without mutating credential content, returns encoded hashes only, and never persists, logs, or returns plaintext passwords.

## 3. Context

- `docs/SECURITY.md` and `AGENTS.md` require Argon2id and forbid password logging.
- `tasks/be/04-identity-schema/technical.md` defines `users.password_hash` as an Argon2id-hash-only field.
- `apps/api/package.json` already includes `argon2`.
- Installed `argon2` types expose `hash`, `verify`, `needsRehash`, `argon2id`, `memoryCost`, `timeCost`, and `parallelism`. No new dependency is needed.
- Current API modules use focused top-level infrastructure directories and Jest tests under `apps/api/tests`.

## 4. Dependencies

- Installed repository-compatible `argon2` package.
- Identity schema contract for storing only encoded `password_hash` values.
- Existing logging redaction and safe-error rules.
- No database access, API endpoint, session, JWT, external breach service, or configuration variable is required.

## 5. In Scope

- Validate password length before hashing.
- Hash valid password strings with explicit Argon2id parameters and library-managed random salt behavior.
- Verify an encoded Argon2id hash against a candidate password.
- Return safe outcomes for invalid lengths, malformed hashes, and Argon2 failures.
- Add isolated focused tests and full applicable validation evidence.

## 6. Out of Scope

- Registration, login, password change/reset, forgot-password flow, UI validation, or password strength meter.
- Breached-password checks, remote services, offline breach data, or third-party quality services.
- Account lockout, credential history/reuse prevention, forced expiration/rotation, MFA, session/JWT issuance, or authorization.
- New user columns such as `password_expires_at`, separate salt storage, static/global salts, or manual salt reuse.
- Character-class composition requirements, password normalization, trimming, or truncation.
- Automatic rehash-on-login or password upgrade infrastructure. A later task may use the installed `needsRehash` API if approved.

## 7. Existing Implementation

- `apps/api/src/database/schema.ts` - `users.passwordHash` maps to required `password_hash` storage.
- `apps/api/src/logging/index.ts` - password redaction rules and safe logging conventions.
- `apps/api/src/security/index.ts` - centralized safe error behavior.
- `apps/api/tests/` - Jest test structure.
- `apps/api/package.json` and installed `argon2` type definitions - existing hashing dependency and supported options.

## 8. Implementation Requirements

### Password policy

- Password input is opaque credential material. Never trim, normalize, lowercase, uppercase, truncate, or otherwise mutate it before hashing or verification.
- Password length uses Unicode code-point count via a repository-compatible equivalent of `Array.from(password).length`. It is not byte count and does not normalize grapheme sequences.
- Reject fewer than 12 code points before hashing. Accept exactly 12 code points.
- Reject more than 128 code points before hashing. Accept exactly 128 code points.
- Do not require uppercase, lowercase, digit, symbol, or any character-class combination. A valid-length lowercase passphrase, no-symbol password, and no-number password remain valid.
- Password policy does not include breached-password checks. Do not call external services or load breach datasets.
- Do not add periodic forced password expiration without a later approved policy/compliance task.

### Argon2id contract

- Use installed `argon2` with type/algorithm `argon2id` only.
- Use explicit production options: `memoryCost: 19456` KiB, `timeCost: 2`, and `parallelism: 1`.
- Omit manual `salt` configuration so the library creates a secure random per-password salt. The encoded hash must preserve the Argon2 parameters and salt needed for later verification.
- Do not replace Argon2id with bcrypt, scrypt, PBKDF2, direct SHA-family hashing, or custom cryptography.
- Provide one focused hash function equivalent to `hashPassword(plaintextPassword): Promise<string>` and one verification function equivalent to `verifyPassword(encodedHash, candidatePassword): Promise<boolean>`. Use repository-consistent final names after inspecting current module conventions.
- Hashing validates length before invoking Argon2, returns only the encoded hash, and never writes credential data.
- Verification validates candidate length without mutation, calls Argon2 verification with encoded hash and candidate only, and returns `false` for a wrong candidate or malformed stored hash. Unexpected Argon2 operation failure must raise a sanitized internal error without credential values.
- Do not create a generic credential service, repository, route, controller, or account-existence behavior.

## 9. Applicable Contracts

### Configuration Contract

Not applicable - production Argon2 parameters are explicit internal constants in the password module. No environment variable, implicit default, or secret configuration is introduced.

### API Contract

Not applicable - this task creates no route, request, response, OpenAPI operation, or client-visible password error.

### Database Contract

No schema change. Hash output is only suitable for the existing required `users.password_hash` field. No plaintext password, separate salt, breach result, password history, or expiration field is persisted.

### UI Contract

Not applicable - this task creates no UI validation or CMS behavior.

## 10. File Impact

Expected paths are based on current focused infrastructure-module patterns and must be verified before editing.

### Expected Create

- `apps/api/src/password/index.ts` - focused policy validation, Argon2id hashing, and verification boundary.
- `apps/api/tests/password.test.ts` - isolated password-boundary tests.

### Expected Modify

- No existing application module is expected to change unless discovery finds a direct approved password-boundary consumer.

### Expected Not Modified

- API routes/controllers, login/session/JWT modules, database schema/migrations, CMS code, environment configuration, package dependencies, audit behavior, and unrelated security middleware.

## 11. Runtime Behavior

1. An approved future caller passes a candidate password to the focused boundary.
2. The boundary preserves the exact input and counts Unicode code points.
3. Passwords outside 12 to 128 code points reject before Argon2 runs.
4. A valid password hashes with explicit Argon2id options and library-generated random salt, returning one encoded hash string.
5. Verification preserves the candidate, validates its length, then verifies against the supplied encoded hash.
6. Correct candidate returns `true`; wrong candidate or malformed encoded hash returns `false`; unexpected Argon2 failure returns a sanitized internal failure.
7. No route, persistence, logging, session, token, or authorization behavior is triggered.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| 11 code points | Reject before Argon2 hashing. | Do not log or mutate credential. |
| 12 code points | Accept if otherwise valid. | No composition rule. |
| 128 code points | Accept if otherwise valid. | No truncation. |
| 129 code points | Reject before Argon2 hashing. | Do not truncate or hash a prefix. |
| Lowercase/no-number/no-symbol valid-length password | Accept. | Passphrases and password-manager output remain valid. |
| Leading/trailing whitespace | Preserve it exactly. | Candidate with trimmed value must not silently verify. |
| Same password hashed twice | Encoded hashes differ due to random salts. | Both verify with original exact candidate. |
| Wrong password | Return `false`. | No account/session information or credential data leaks. |
| Malformed encoded hash | Return `false`. | Do not expose Argon2 parser details. |
| Unexpected Argon2 failure | Raise sanitized internal failure. | Never include plaintext, encoded hash, salt, or implementation detail. |
| Breached-password lookup | Not performed. | Deferred to separate approved credential-policy task. |

## 13. Security Requirements

- Argon2id is required with `memoryCost: 19456`, `timeCost: 2`, and `parallelism: 1`.
- Use library-managed secure random per-password salts; never static, derived, reused, or separately persisted salts.
- Plaintext passwords never enter logs, exceptions, test snapshots, structured metadata, persistence, API responses, or fixtures.
- Encoded password hashes are sensitive credential material. Do not log or return them outside approved persistence behavior.
- Passwords are opaque strings. Length validation must not alter their bytes/code points before Argon2 receives them.
- Keep account-existence, timing, login, and authorization decisions outside this local primitive.
- Breach checking, forced password expiration, and composition policy changes require separate explicit approval.

## 14. Test Requirements

### Happy Path

- Hash and verify valid password values with Argon2id.
- Verify two hashes from the same password differ while both verify correctly.

### Validation

- Test 11 rejected, 12 accepted, 128 accepted, and 129 rejected before hashing.
- Test valid-length lowercase-only, no-symbol, and no-number passwords without composition rejection.
- Test leading/trailing whitespace remains part of the credential.

### Negative / Failure

- Test wrong password returns `false`.
- Test malformed encoded hash returns `false` without raw Argon2 error detail.
- Test sanitized Argon2 failure path if the module permits deterministic dependency failure injection without adding abstraction solely for tests.

### Security and Isolation

- Use clearly synthetic passwords only. Never commit real credentials, salts, hashes, or snapshots containing credential values.
- Assert output differs from plaintext and does not appear in safe error messages/logging metadata.
- Do not assert exact encoded hash strings. Tests must be isolated, order-independent, and deterministic apart from expected salt uniqueness.

### Regression

- Run all current API Jest tests unchanged.

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Length boundaries | 11/129 reject; 12/128 accept before hashing | Unit |
| No composition policy | Valid lowercase/no-symbol/no-number passwords hash | Unit |
| Whitespace | Exact whitespace verifies; trimmed candidate fails | Unit |
| Salt behavior | Two hashes differ; both verify | Unit |
| Verification | Correct candidate succeeds; wrong/malformed fails safely | Unit |
| Sensitive failure | No password/hash value in safe errors or logs | Unit |
| Existing API suite | No regression | Regression |

## 15. Task-Level Expected Results

- One narrow local Argon2id hash/verify boundary exists.
- Valid password policy is explicit, stable, and shared by future password-acceptance tasks.
- Encoded hashes use random per-password salt and required Argon2id parameters.
- No product auth flow, persistence, breach integration, or credential lifecycle behavior exists.

## 16. Acceptance Criteria

- [ ] Argon2id is the sole password hashing algorithm.
- [ ] Minimum password length is exactly 12 Unicode code points.
- [ ] Maximum password length is exactly 128 Unicode code points.
- [ ] No uppercase, lowercase, number, or symbol composition rule is enforced.
- [ ] Password values are not trimmed, normalized, truncated, or otherwise mutated.
- [ ] Breached-password checking is explicitly out of scope.
- [ ] Explicit Argon2 options use memory cost 19456 KiB, time cost 2, and parallelism 1.
- [ ] Random per-password library salt behavior is preserved; no separate/static/reused salt exists.
- [ ] Plaintext passwords and encoded hashes are never persisted, logged, returned, or exposed in errors.
- [ ] Correct verification succeeds; wrong password and malformed encoded hash fail safely.
- [ ] Focused boundary tests cover length, complexity absence, whitespace, salt, verification, and sensitive-data cases.
- [ ] No registration, login, password reset/change, breach check, MFA, credential history, session, or JWT behavior is introduced.
- [ ] Code Anti-Slop, lint, typecheck, full applicable tests, and `git diff --check` pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Reject custom cryptography, library-default Argon2 parameters, duplicated policy checks, hidden TODO/FIXME/HACK, unjustified `any`/assertions, generic credential abstractions, static fixtures/salts, secret logging, fake breach checks, and scope creep into auth flows. UI Anti-Slop and visual verification: not applicable - no UI change.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused `apps/api/tests/password.test.ts`.
- `bun run --cwd apps/api test`.

### Build / Database / UI

Not applicable - API package has no build script; no database or UI change is expected.

### Anti-Slop

- Run Code Anti-Slop during implementation and again after fixes.

## 19. Completion Evidence

| Acceptance criterion | Evidence |
| --- | --- |
| Length and no-composition policy | `apps/api/tests/password.test.ts` boundary cases |
| Argon2id options and salt behavior | Focused hash/verify tests and encoded metadata assertions without fixed hash fixtures |
| Whitespace and no plaintext exposure | Focused exact-candidate/error assertions |
| Wrong/malformed verification behavior | Focused negative tests |
| No regression | `bun run --cwd apps/api test` |
| Static correctness | lint and typecheck command output |
| Scope and whitespace hygiene | `git status`, `git diff`, and `git diff --check` review |
| Anti-Slop | Code Anti-Slop output or exact unavailable reason |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Security | `docs/SECURITY.md`, `AGENTS.md`, and `.codex/skills/security/security-review/SKILL.md` |
| Database | `tasks/be/04-identity-schema/technical.md` `users.password_hash` contract |
| Dependency | Installed `argon2` type definitions under `apps/api/node_modules/argon2/argon2.d.cts` |
| Test IDs | Not applicable - project has no test-ID system |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] Acceptance criteria and approved scope are satisfied.
- [ ] Argon2id boundary validates length before hashing and preserves credential content.
- [ ] Focused and applicable full tests pass with synthetic password values only.
- [ ] Code Anti-Slop passes; UI Anti-Slop and visual verification are documented as not applicable.
- [ ] Lint, typecheck, and `git diff --check` pass.
- [ ] Changed files and diff are reviewed; no plaintext, hash fixture, salt, secret, generated junk, or unrelated change remains.
- [ ] No migration, API route, login/session behavior, OpenAPI update, or UI work is claimed without evidence.
