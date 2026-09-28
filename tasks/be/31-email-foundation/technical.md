# be/31-email-foundation — SMTP Transactional Email Foundation

## 1. Metadata

| Field           | Value                                                                |
| --------------- | -------------------------------------------------------------------- |
| Task ID         | `be/31-email-foundation`                                             |
| Batch           | Authentication email infrastructure                                  |
| Owning Feature  | Transactional email                                                  |
| Workstream      | Backend                                                              |
| Task Category   | Infrastructure foundation                                            |
| Repository/App  | `apps/api`                                                           |
| Status          | Complete — validation evidence recorded (2026-09-26)                 |
| Priority        | High                                                                 |
| Suggested Size  | Small                                                                |
| Depends On      | `be/06-logging-foundation`, `be/21-api-module-architecture-refactor` |
| Blocks          | `be/32-email-template-foundation`, `be/33-email-queue-worker`        |
| Execution Order | 31                                                                   |

## 2. Outcome

Provide a validated, lifecycle-managed SMTP transport contract that business modules can use without importing SMTP-provider libraries or credentials.

## 3. Context

Current source has no notification/email module, SMTP dependency, SMTP environment configuration, or email sender. `config/` owns infrastructure; modules own business behavior. Pino redaction and sanitized startup failures already exist.

## 4. Dependencies

Requires the implemented logging and startup lifecycle. The approved transport is standard SMTP; provider credentials and sender identity are deployment configuration, not source constants. No live SMTP connection is required for startup.

## 5. In Scope

- Add infrastructure-owned SMTP configuration, transport adapter, typed send input, error normalization, initialization, and close lifecycle.
- Compose the adapter from `server.ts`; business modules receive only the typed contract.
- Define test-only fake transport support.

## 6. Out of Scope

Templates, authentication flows, queue workers, DB changes, migrations, public endpoints, marketing mail, and environment-file edits.

## 7. Existing Implementation

Inspect `apps/api/src/config/env.ts`, `config/logger/logger.ts`, `server.ts`, `shutdown.ts`, package manifest, and existing error tests before implementation. No current email capability exists.

## 8. Implementation Requirements

- Put provider-specific implementation under `apps/api/src/config/email/`; it must not import Auth or other business modules.
- Expose a narrow typed operation accepting recipient, subject, HTML body, and plain-text body. It must reject malformed runtime input through the existing error path.
- Validate enabled SMTP configuration before other startup work. Credentials, authorization headers, raw message bodies, and recipient addresses must never enter application logs.
- Normalize provider failures to stable internal categories without exposing transport exceptions publicly.
- Close the transport during graceful shutdown after queue workers stop.
- Keep the SMTP library behind the infrastructure transport boundary; do not build a custom SMTP client.
- Use Nodemailer 10.0.10. At implementation review it has current upstream releases, MIT No Attribution licensing, ESM support tested with Bun, bundled TypeScript definitions, and standard SMTP with explicit TLS/STARTTLS settings. See [releases](https://github.com/nodemailer/nodemailer/releases), [project runtime/license/types](https://github.com/nodemailer/nodemailer), and [SMTP/TLS options](https://nodemailer.com/smtp).
- Define the `EMAIL_ENABLED` feature flag. When false, do not create an SMTP transport; when true, require a complete SMTP configuration. In production, missing or invalid enabled configuration fails environment validation deterministically. In development/test, email may remain disabled or use an injected fake transport/test SMTP service.
- Create the SMTP transport without a live connection check. A temporary SMTP outage must not prevent unrelated API routes from starting or make general readiness fail.
- Normalize network/transient and SMTP 4xx failures as retryable; normalize invalid configuration, authentication/recipient/message rejection, and SMTP 5xx failures as permanent. Unknown provider errors are normalized without exposing the original error; retry classification must be conservative and tested.
- Keep transport creation, send, error mapping, and cleanup behind the `EmailTransport` contract. Auth modules must not import the selected library.

## 9. Applicable Contracts

### Configuration Contract

Environment names use the repository's `UPPER_SNAKE_CASE` convention. `EMAIL_ENABLED` defaults to `false` when omitted. If enabled, all connection and sender fields are required and validated in every environment; username/password are optional only as a pair to support SMTP relays without authentication. In production, enabling email without the complete valid configuration fails startup validation. In development/test, an omitted/false flag requires no SMTP configuration and tests use an injected fake transport or an isolated SMTP test service.

| Variable          | Required           | Type           | Validation                                         | Default                                                  | Secret |
| ----------------- | ------------------ | -------------- | -------------------------------------------------- | -------------------------------------------------------- | ------ |
| `EMAIL_ENABLED`   | No                 | boolean string | exactly `true` or `false`                          | `false`                                                  | No     |
| `SMTP_HOST`       | When email enabled | string         | non-empty host, no whitespace                      | None — startup must fail if email is enabled and missing |
| `SMTP_PORT`       | When email enabled | integer        | 1–65535                                            | None — startup must fail if email is enabled and missing |
| `SMTP_SECURE`     | When email enabled | boolean string | exactly `true` or `false`; explicit TLS mode       | None — startup must fail if email is enabled and missing |
| `SMTP_USERNAME`   | Optional           | string         | non-empty when set; must be paired with password   | None                                                     |
| `SMTP_PASSWORD`   | Optional           | string         | preserve exact value; must be paired with username | None                                                     | Yes    |
| `SMTP_FROM_EMAIL` | When email enabled | email address  | valid address                                      | None — startup must fail if email is enabled and missing |
| `SMTP_FROM_NAME`  | When email enabled | string         | non-empty after trim                               | None — startup must fail if email is enabled and missing |

Port and TLS mode are explicit independent values; do not infer provider/port conventions. `SMTP_SECURE=true` uses implicit TLS; `false` requires STARTTLS. Do not validate connectivity at startup. Credentials are never logged.

### API / Database / UI Contracts

Not applicable — no HTTP, persistent-model, or UI change.

## 10. File Impact

Expected create: `src/config/email/**`, focused tests. Expected modify: `config/env.ts`, startup/shutdown composition, `apps/api/package.json`, and `bun.lock` for the selected SMTP library. No new top-level source directory; no business module, schema, migration, `.env`, or `.env.example` change.

## 11. Runtime Behavior

Environment validates → when `EMAIL_ENABLED=true`, SMTP transport object is constructed without opening a network connection → API continues normal initialization/listen → delivery caller sends through the typed email transport → normalized success or retryable/permanent error returns to the delivery layer → shutdown closes the initialized transport before logging closes. When disabled, no SMTP transport is created. SMTP is not added to general readiness.

## 12. Error And Edge Cases

| Scenario                                              | Expected result                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `EMAIL_ENABLED=true` with missing/invalid SMTP config | sanitized startup validation failure naming invalid keys only; API does not listen    |
| `EMAIL_ENABLED=false` with no SMTP config             | normal startup; no SMTP transport                                                     |
| Provider is offline during startup                    | normal startup; no SMTP network request is made                                       |
| Provider rejects or times out during send             | normalized retryable/permanent delivery error; no raw error reaches a public response |
| Transport shutdown fails                              | sanitized shutdown failure; no credential/message dump                                |

## 13. Security Requirements

No authentication secret, verification/reset token, password, hash, SMTP credential, access/refresh token, or message body may appear in logs, audit metadata, BullMQ metadata, Queue Monitor, or public responses.

## 14. Test Requirements

Tests cover valid enabled production config, missing enabled production config, invalid port/TLS values, optional disabled development/test config, injected fake transport, successful send, retryable/permanent failure normalization, secret redaction, and transport close. Automated tests must not send external email or perform live SMTP connectivity checks.

## 15. Task-Level Expected Results

One infrastructure contract exists; Auth and other modules remain provider-agnostic; lifecycle and safe diagnostics are proven.

## 16. Acceptance Criteria

- [x] AC-001: Nodemailer meets the approved maintenance, license, Bun, TypeScript, SMTP/TLS, and testability criteria and is isolated behind the typed transport abstraction.
- [x] AC-002: `EMAIL_ENABLED` and all SMTP variables follow the approved config contract; enabled config validates before startup continues without a live connection check.
- [x] AC-003: Disabled development/test config starts without SMTP settings; transport tests inject a fake mailer.
- [x] AC-004: Sends normalize transient/retryable and permanent failures without exposing raw provider errors.
- [x] AC-005: Credentials, auth secrets, and complete sensitive message content are absent from errors/logging; transport cleanup is covered.
- [x] AC-006: SMTP does not affect general readiness.

## 17. Anti-Slop Requirements

Code Anti-Slop: reject generic notification frameworks, duplicate transports, hidden TODOs, `any`, unused provider abstraction, fake delivery, and secret logging. UI/visual: not applicable.

## 18. Validation Requirements

API format, lint, typecheck, focused/full tests, applicable build, secret review, `git diff --check`, changed-file review, and Code Anti-Slop. Nodemailer maintenance/release, MIT license, Bun-tested ESM support, bundled TypeScript definitions, SMTP/TLS support, and fake transport seam were checked against official project sources linked in section 8.

## 19. Completion Evidence

AC-001 → Nodemailer v10.0.10 in `apps/api/package.json`; official release/runtime/license/type/SMTP documentation links in section 8. AC-002/003 → `apps/api/tests/env.test.ts` (valid production config, missing config, invalid port/TLS, optional development/test config). AC-004/005 → `apps/api/tests/email-transport.test.ts` (sender mapping, fake transport, success, transient/permanent normalization, secret-sanitized errors, close). AC-006 → source review confirms SMTP is absent from readiness. Static evidence: API typecheck, lint, format check, and full test commands all PASS; full tests report 27 suites passed and 3 opt-in suites skipped (156 passed, 8 skipped). `git diff --check` PASS; API has no build script, so build is NOT APPLICABLE. Code Anti-Slop and changed-file/secret review PASS.

## 20. Traceability

Not applicable — no project traceability ID system.

## 21. Open Points

None. Provider-specific credentials and sender values are supplied by deployment configuration. The selected library is an implementation choice bounded by the criteria in sections 8 and 18.

## 22. Definition Of Done

- [x] Acceptance criteria and approved scope are satisfied; no schema, migration, or HTTP API changed.
- [x] Required configuration, transport implementation, and focused regression tests are present.
- [x] API typecheck, lint, formatting, and full tests pass; API build is not applicable because no build script exists.
- [x] Code Anti-Slop, secret review, changed-file review, and `git diff --check` pass.
- [x] SMTP configuration is validated before startup continues, transport construction performs no live network check, and readiness is unchanged.
