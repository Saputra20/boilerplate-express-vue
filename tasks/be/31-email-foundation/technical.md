# be/31-email-foundation — SMTP Transactional Email Foundation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/31-email-foundation` |
| Batch | Authentication email infrastructure |
| Owning Feature | Transactional email |
| Workstream | Backend |
| Task Category | Infrastructure foundation |
| Repository/App | `apps/api` |
| Status | Planned — requires human approval before implementation |
| Priority | High |
| Suggested Size | Small |
| Depends On | `be/06-logging-foundation`, `be/21-api-module-architecture-refactor` |
| Blocks | `be/32-email-template-foundation`, `be/33-email-queue-worker` |
| Execution Order | 31 |

## 2. Outcome

Provide a validated, lifecycle-managed SMTP transport contract that business modules can use without importing SMTP-provider libraries or credentials.

## 3. Context

Current source has no notification/email module, SMTP dependency, SMTP environment configuration, or email sender. `config/` owns infrastructure; modules own business behavior. Pino redaction and sanitized startup failures already exist.

## 4. Dependencies

Requires the implemented logging and startup lifecycle. SMTP provider, sender identity, public frontend URL, and local SMTP catcher choice are external configuration decisions.

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
- Validate required production SMTP settings at startup. Credentials, authorization headers, raw message bodies, and recipient addresses must never enter application logs.
- Normalize provider failures to stable internal categories without exposing transport exceptions publicly.
- Close transport during graceful shutdown if the selected provider requires it. Startup must fail safely if email delivery is configured as required by the approved runtime contract.
- Choose and justify the smallest maintained SMTP library only after dependency/license/version inspection; do not install it in this planning task.

## 9. Applicable Contracts

### Configuration Contract

| Concept | Required | Validation | Secret |
| --- | --- | --- | --- |
| SMTP host/port/TLS mode | Production | explicit host, valid port, unambiguous TLS mode | No |
| SMTP username/password | Provider-dependent | paired non-empty credentials when required | Yes |
| Sender address/name | Production | valid address; non-empty display name if configured | Address: No |
| Public frontend URL | Auth-link flows | absolute approved HTTPS URL in production | No |

Exact variable names and development behavior: `TODO: REQUIREMENT NEEDED` — align with the existing env naming pattern when the provider/runtime decision is approved.

### API / Database / UI Contracts

Not applicable — no HTTP, persistent-model, or UI change.

## 10. File Impact

Expected create: `src/config/email/**`, focused tests. Expected modify: `config/env.ts`, startup/shutdown composition, package manifest/lockfile only after approval. No new top-level source directory; no module, schema, migration, or env file change in this planning run.

## 11. Runtime Behavior

Environment validates → email config builds → provider transport initializes → owning module later calls typed send contract → safe success/failure returns → shutdown closes the transport before logging closes.

## 12. Error And Edge Cases

| Scenario | Expected result |
| --- | --- |
| Missing/invalid production config | sanitized startup failure naming keys only |
| Provider rejects or times out | normalized internal delivery failure; safe structured log |
| Transport shutdown fails | sanitized shutdown failure; no credential/message dump |

## 13. Security Requirements

No authentication secret, verification/reset token, password, hash, SMTP credential, access/refresh token, or message body may appear in logs, audit metadata, BullMQ metadata, Queue Monitor, or public responses.

## 14. Test Requirements

Unit tests cover env validation, success, normalized provider error, redaction, and close. Integration tests use a fake/test SMTP transport only; no external email is sent.

## 15. Task-Level Expected Results

One infrastructure contract exists; Auth and other modules remain provider-agnostic; lifecycle and safe diagnostics are proven.

## 16. Acceptance Criteria

- [ ] Validated SMTP configuration and typed transport are implemented without business-module SMTP imports.
- [ ] Credentials/message content are absent from logs and errors.
- [ ] Fake transport tests and lifecycle tests pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: reject generic notification frameworks, duplicate transports, hidden TODOs, `any`, unused provider abstraction, fake delivery, and secret logging. UI/visual: not applicable.

## 18. Validation Requirements

API format, lint, typecheck, focused/full tests, applicable build, secret scan, `git diff --check`, changed-file review, and Code Anti-Slop.

## 19. Completion Evidence

Transport/config tests prove AC-1/3; log-redaction tests and changed-file secret review prove AC-2; command output and diff review prove static gates.

## 20. Traceability

Not applicable — no project traceability ID system.

## 21. Open Points

Provider/library, exact configuration names, required-vs-optional deployment posture, sender identity, public URL, and local SMTP-catcher policy require approval.

## 22. Definition Of Done

Approved scope, explicit configuration contract, focused tests, static checks, Code Anti-Slop, secret review, and diff review pass with no API/schema/migration change.
