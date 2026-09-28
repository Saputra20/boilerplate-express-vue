# be/32-email-template-foundation — Transactional Email Templates

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/32-email-template-foundation` |
| Batch | Authentication email infrastructure |
| Owning Feature | Transactional email |
| Workstream | Backend |
| Task Category | Shared transactional-email rendering |
| Repository/App | `apps/api` |
| Status | IMPLEMENTED — VISUAL / CLIENT REVIEW PENDING |
| Priority | High |
| Suggested Size | Medium |
| Depends On | `be/31-email-foundation`, `be/21-api-module-architecture-refactor` |
| Blocks | `be/33-email-queue-worker`, `be/34-email-verification`, `be/35-password-recovery` |
| Execution Order | 32 |

## 2. Outcome

Create a notification-owned renderer that returns a subject, preheader, HTML body, and plain-text body for email-verification, password-reset, and password-changed security messages. The templates share one restrained visual system, render safely on mobile and in common email clients, and contain no auth HTML in Auth services.

## 3. Context

- `docs/ARCHITECTURE.md` assigns domain capabilities to `apps/api/src/modules/<module>/` and infrastructure to `config/`.
- `docs/DESIGN.md` still says the product brand is undefined. The user has approved the current CMS identity in repository source as the transactional-email brand source; this explicit task approval wins for be/32. The supplied image provides composition direction, not literal placeholder content.
- `tasks/be/31-email-foundation/technical.md` provides the implemented `EmailTransport` boundary and SMTP sender configuration. Templates must not import Nodemailer or add a competing transport.
- `tasks/be/33-email-queue-worker/technical.md` remains blocked on secure token-to-worker handoff and delivery-state decisions. This task must not resolve or bypass that dependency.
- `tasks/be/34-email-verification/technical.md` and `tasks/be/35-password-recovery/technical.md` own challenge, API, TTL, and auth-flow decisions. Their unresolved expiry values and token inputs must not be guessed here.

## 4. Dependencies

- Requires the implemented email transport contract in `be/31` and the module architecture in `be/21`.
- Branding decision approved: transactional email templates use the existing CMS/product identity as the branding source of truth. Support/privacy/terms URLs are optional and must be omitted when no real approved destination is configured.
- Renderer implementation does not depend on the queue handoff. Integration with a queue worker must wait for `be/33` to approve and implement a safe data handoff; this task does not put rendered HTML or raw tokens into queue data. This avoids a dependency cycle because `be/33` depends on this renderer task.
- Expiry copy and action-link data must be supplied by the owning auth flow using its approved TTL and URL contract. No TTL or public URL is created here.

## 5. In Scope

- Add a focused `notification` module with typed email template/rendering code.
- Implement a shared transactional email base layout and the following renderers:
  - Email verification.
  - Password reset.
  - Password changed security confirmation. This renderer is in scope because it is part of the approved visual direction; sending it, its trigger, and auth behavior remain out of scope.
- Return subject, concise preheader, HTML, and first-class plain-text content for each renderer.
- Use the supplied image and requirements as a visual composition reference, and a development-only preview mechanism for synthetic data.
- Add deterministic rendering, validation, escaping, and output tests without real email delivery.

## 6. Out of Scope

- SMTP transport, BullMQ producer/worker, delivery persistence, token generation/storage, auth endpoints, challenge lifecycle, and auth business rules.
- Deciding whether/when a password-changed email is sent, or changing password/session behavior.
- Product/brand creation, new logo design, fabricated support/privacy/terms URLs, invented email content, or invented TTLs.
- Marketing email, newsletter, localization implementation, notification preferences, SMS, WhatsApp, push, or frontend forgot/reset pages.
- A public preview endpoint, production preview capability, or real SMTP sends from tests/previews.
- Device or location claims without reliable approved input from an owning auth/security contract.

## 7. Existing Implementation

Before implementation, verify current source and consumers:

- `apps/api/src/modules/` module layout and app composition.
- `apps/api/src/config/email/` transport/configuration from `be/31`.
- `apps/api/src/modules/auth/**` for existing auth ownership and absence of template logic.
- `tasks/be/31-email-foundation/technical.md`, `tasks/be/33-email-queue-worker/technical.md`, `tasks/be/34-email-verification/technical.md`, and `tasks/be/35-password-recovery/technical.md` for final upstream contracts.
- `docs/DESIGN.md` for current brand-source status.
- Existing API test, package, format, and preview conventions.

The paths above are guidance; inspect existence and actual source before editing.

## 8. Implementation Requirements

### Module and renderer boundary

- Put template definitions, typed inputs, and rendering in the Notification module, expected under `apps/api/src/modules/notification/email/templates/`.
- Auth services and controllers must not contain or import template HTML, CSS, or the SMTP library.
- Each renderer returns `{ subject, previewText, html, text }` using the `be/31` transport's supported send contract.
- Use explicit template-specific input types. Inputs may include only approved values required to render the message, such as the final action URL, approved expiry display text, configured product identity, and optional configured links.
- Transactional action URLs require HTTPS. The only exception is HTTP URLs on `localhost`, `127.0.0.1`, or `::1` when an explicit validated development/test rendering option is passed; production renderers keep HTTPS mandatory. Template code must not read `process.env` or infer runtime mode.
- Accept an already-approved final action URL; do not create tokens, append guessed query parameters, or log/output the URL outside rendered message delivery. CTA and visible fallback link must use the same URL.
- Do not accept arbitrary raw HTML. Escape all untrusted text and validate URL protocols/hosts against the owning approved URL contract. Do not invent allowed hosts or URL configuration.
- Password-changed metadata (timestamp, device, location) is optional. Render a field only when reliable approved data is provided; omit absent fields without placeholder values. The message remains understandable without these fields.

### Shared visual system

- Use a clean, minimal SaaS transactional-security style: controlled whitespace, clear hierarchy, restrained primary color, neutral surfaces, subtle borders, readable type, and one dominant CTA where an action exists.
- Reuse one base layout across messages. Keep it focused; do not create an abstraction for every trivial markup fragment.
- Layout composition: brand/sender identity and message type; small optional security illustration; heading and supporting copy; primary CTA; approved expiry statement when relevant; visible fallback URL; contextual security notice; restrained footer.
- Verification and reset are action emails and each has one primary CTA. Password-changed is informational and must not gain a competing CTA; a support action may appear only when a configured, approved support URL exists.
- CTA target: centered, semibold, high-contrast label, moderate radius, adequate horizontal padding, and approximately 44–48 px minimum visual height. Mobile may make it full width.
- Use email-safe font stacks (including system fallbacks); do not depend on remote font loading. Target approximate typography: headings 20–24 px semibold/bold, body 14–16 px, captions 12–14 px, CTA 14–16 px.
- Define email-safe semantic tokens from current `apps/cms/src/styles.css`: primary `#465fff`, primary light `#ecf3ff`, text `#1d2939`, muted `#667085`, border `#e4e7ec`, background `#f9fafb`, surface `#ffffff`, dark background `#101828`, dark surface `#141c2b`, and dark text `#f2f4f7`. These values belong to the existing CMS identity. Do not copy placeholder colors from the reference image or TailAdmin-specific branding.
- Product identity is `CMS`, with `Content workspace` as its supporting label, from `apps/cms/src/components/AppNavigation.vue` and `AppHeader.vue`. Use a simple text `C` mark matching the current navigation mark; no stable reusable email-safe logo asset exists. Do not invent a replacement logo.
- Use Outfit as the CMS typography direction but include email-safe fallbacks (`Arial`, `Helvetica`, sans-serif); do not fetch a remote font in email.
- Small security illustrations may indicate envelope/check, lock/reset, and shield/check. Keep them nonessential, provide appropriate alt text, and ensure content remains complete when images are blocked. No external asset may be critical.
- Footer uses only approved product identity and configured, real support/privacy/terms destinations. Omit optional links when unconfigured. Never render fake links or marketing subscription controls.

### Email HTML, theme, and responsive behavior

- This is email HTML, not Vue/Tailwind UI. Select markup/CSS strategy compatible with the renderer selected during implementation; use conservative HTML, inline styles and table layout where email-client support needs them.
- Provide a light presentation matching the reference. Add dark-mode-aware styling where practical, while preserving legibility in clients that ignore or automatically transform dark colors. Do not use fragile CSS to force pixel-identical dark mode.
- Use a centered, bounded desktop email container and a single-column narrow-screen layout with reduced horizontal padding.
- Ensure headings wrap, CTA remains usable, fallback URL wraps and stays selectable, footer wraps, optional info blocks fit, and no horizontal overflow occurs.
- Preview representative Gmail web/mobile, Apple Mail, and Outlook rendering where the available tooling permits. Report only clients actually inspected; do not claim universal client compatibility.

### Template content

- Verification: concise account-verification subject/preheader, activation explanation, CTA and same-URL fallback, approved verification expiry display, and safe ignore-this-email guidance.
- Password reset: concise reset subject/preheader, reset explanation, CTA and same-URL fallback, approved reset expiry display, and safe ignore-this-email guidance.
- Password changed: concise confirmation subject/preheader and explanatory security notice. Only include approved timestamp/device/location data. Support action is conditional on configured approved support destination.
- Every template includes a plain-text equivalent with subject/context, action URL where applicable, approved expiry where applicable, security notice, and configured identity/link information.
- Final copy is concise and professional. Reference copy is illustrative; do not ship `YourApp`, placeholder/example token URLs, guessed TTLs, fake help links, or fake device/location data.
- Preheader is concise and should add context rather than repeat a long subject verbatim.

### Development preview

- Provide a local development-only renderer/preview script that writes stable review artifacts under `tasks/be/32-email-template-foundation/artifacts/`; do not expose an HTTP route.
- Preview all three renderers with synthetic values and no auth operations or network/email delivery.
- Support inspection of desktop/light and mobile/light layouts, plus dark-mode-aware output where practical. Plain text must also be inspectable.
- Ensure preview output is excluded from production capability and cannot accidentally include real tokens, recipient data, or configured secrets.

## 9. Applicable Contracts

### Configuration Contract

Uses the existing `be/31` email transport configuration only. No new runtime environment variables are approved by this task.

| Variable | Required | Type | Validation | Default | Secret |
| --- | --- | --- | --- | --- | --- |
| `EMAIL_ENABLED` | No | boolean string | Exactly `true` or `false` | `false` | No |
| `SMTP_HOST` | When email enabled | string | Non-empty host without whitespace | None — startup must fail if email is enabled and missing | No |
| `SMTP_PORT` | When email enabled | integer | 1–65535 | None — startup must fail if email is enabled and missing | No |
| `SMTP_SECURE` | When email enabled | boolean string | Exactly `true` or `false` | None — startup must fail if email is enabled and missing | No |
| `SMTP_USERNAME` | Optional | string | Must be configured with password | None | No |
| `SMTP_PASSWORD` | Optional | string | Preserved exactly; must be configured with username | None | Yes |
| `SMTP_FROM_EMAIL` | When email enabled | email address | Valid address | None — startup must fail if email is enabled and missing | No |
| `SMTP_FROM_NAME` | When email enabled | string | Non-empty after trim | None — startup must fail if email is enabled and missing | No |

Branding is fixed to the approved existing CMS identity in the renderer; this task adds no branding environment variables. Support/privacy/terms links are optional renderer inputs and must be omitted when absent. Other SMTP variables remain solely owned by `be/31`.

### API Contract

Not applicable — no HTTP API or public preview route is introduced.

### Database Contract

Not applicable — no schema or migration is introduced.

### UI Contract

Not applicable — this task renders email documents, not a browser UI. Email rendering has its own compatibility, responsive, accessibility, preview, and visual evidence requirements in sections 8, 14, 17, 18, and 19.

## 10. File Impact

**Expected Create:** Notification module files (`apps/api/src/modules/notification/`) for template/rendering/types and focused tests; a development-only preview mechanism if supported by existing conventions; local preview artifacts only if ignored/excluded from production. These are business-module files, not a new top-level `apps/api/src` directory.

**Expected Modify:** app/module composition only if required to expose the renderer to its future owning delivery worker; package manifest/lockfile only if the selected rendering implementation needs a dependency and after compatibility/license/maintenance review. Renderer ownership remains `modules/notification`; do not move email business behavior into global config/helpers/common.

**Expected Not Modified:** Auth business flows/endpoints, `config/email` SMTP transport, BullMQ contract/lifecycle, database schema/migrations, auth token/challenge policy, CMS source, existing API routes, and unrelated modules.

Expected paths are guidance; inspect repository before finalizing changes.

## 11. Runtime Behavior

An approved delivery caller provides typed, validated template data → Notification selects the named renderer → renderer escapes text and constructs consistent subject/preheader/HTML/plain text from the same approved values → delivery layer receives both bodies and passes them to the `be/31` transport under the separately approved worker flow. A local preview invokes renderers directly with synthetic data and displays/saves local output without auth operations or external delivery. No API preview route or SMTP connectivity is involved.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Required template data missing or invalid | Deterministic internal validation failure; no partial message send | Do not include sensitive values in error/log output |
| Unsafe action URL | Reject rendering | HTTPS required; explicit development/test option permits only loopback HTTP; reject credentials and arbitrary HTTP hosts; never rewrite it or expose URL in logs |
| User-controlled text contains HTML/script | Escape text in HTML; preserve safe plain text | Tests prove no executable markup is emitted |
| Long action URL | Wrap safely in HTML and remain selectable; preserve exact URL in text | Same action URL for CTA and fallback |
| Optional support/privacy/terms URL absent | Omit that footer/action element | Never fabricate a destination |
| Optional device/location/timestamp absent | Omit corresponding detail | Do not render placeholder or inferred data |
| Images blocked | Message remains understandable from text and CTA | Illustration is not the sole carrier of meaning |
| Email client ignores dark-mode rules | Text, surfaces, and CTA remain legible | Compatibility takes priority over exact dark rendering |
| Preview invoked in production | Preview capability is unavailable | No public endpoint or production auth bypass |

## 13. Security Requirements

- Never render passwords, password hashes, SMTP credentials, access/refresh tokens, database IDs, stack traces, or unrelated PII.
- The recipient-facing final verification/reset URL necessarily contains the credential required by the recipient; treat it as secret. Do not log it, snapshot it with a real value, persist it here, or expose it in preview fixtures.
- Keep raw token values out of renderer debug output and queue payloads. Renderer receives only the values permitted by the approved task-33 handoff.
- Escape all untrusted text and validate typed inputs at the module boundary.
- Tests/previews use synthetic URLs and identities. Never send external email from automated checks.
- Do not claim password-changed email sending is approved by the renderer being present.

## 14. Test Requirements

| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Verification renderer | Subject, preheader, HTML, and text contain expected safe content | Unit |
| Password-reset renderer | Subject, preheader, HTML, and text contain expected safe content | Unit |
| Password-changed renderer | Both body formats render; optional fields appear only when approved data is supplied | Unit |
| CTA/fallback parity | CTA and visible fallback use the same deterministic synthetic URL | Unit |
| Approved expiry data | Expiry display is rendered as supplied; renderer invents no TTL | Unit |
| Unsafe/untrusted text | HTML is escaped and plain text remains readable | Security/unit |
| Production URL policy | HTTPS accepted; HTTP rejected; credentials and malformed values rejected | Unit |
| Development/test URL policy | Loopback HTTP accepted only for `localhost`, `127.0.0.1`, and `::1`; arbitrary/private-network HTTP rejected | Unit |
| Invalid/missing required fields and unsafe URL | Render rejects deterministically | Unit |
| Long URL and mobile-safe markup | URL remains selectable/wrapped; output has no fixed-width overflow pattern | Unit/markup |
| Optional footer links | Configured approved links render; absent links are omitted | Unit |
| Security metadata | Absent values are omitted; no fabricated device/location appears | Unit |
| Preview behavior | Synthetic previews cover three templates, light desktop/mobile and available dark view, plus text | Preview/manual |
| Secret scan | Synthetic snapshots contain no real token, recipient, credentials, or message logs | Security |
| Isolation | Tests are deterministic, repeatable, order-independent, and perform no network delivery | Unit |

## 15. Task-Level Expected Results

- One shared reusable base template and three typed security-message renderers exist.
- Every renderer produces subject, preheader, HTML, and plain text.
- Approved values are used without inventing brand, destination URLs, TTL, device/location, or send triggers.
- Rendering remains independent from Auth business logic, SMTP implementation, and the unresolved queue handoff.
- A development-only local preview and evidence path supports design review without real account data or delivery.

## 16. Acceptance Criteria

- [x] AC-001: Verification, password-reset, and password-changed renderers return typed subject, preheader, HTML, and plain text.
- [ ] AC-002: Templates compose one shared base layout and use a restrained, consistent visual system matching the approved reference direction. Source review confirms a shared layout; rendered comparison is pending.
- [x] AC-003: Action emails include one CTA, same-URL visible fallback, caller-provided expiry wording, and contextual security notice; the renderer invents no expiry or URL.
- [x] AC-004: Password-changed output is informational; optional security metadata and support action appear only from reliable approved values/configuration.
- [x] AC-005: Optional footer links are omitted when not configured; no fake product/help/privacy URLs or placeholder brand is shipped.
- [x] AC-006: HTML and plain-text output remain understandable without images; text values are escaped and CTA/content hierarchy is accessible.
- [ ] AC-007: Responsive desktop/mobile output and dark-mode-aware behavior are locally previewable; common-client compatibility claims match actual inspection evidence. Preview generation passed; visual/client inspection is pending.
- [x] AC-008: Template input validation, URL handling, optional-value behavior, long-link behavior, and rendered output have focused tests.
- [x] AC-009: A development-only preview path uses synthetic values, performs no auth operations or email send, and is unavailable in production.
- [x] AC-010: Renderer does not own SMTP, queue payload/token handoff, auth API, token generation, persistence, or password-changed send policy.
- [x] AC-011: Code Anti-Slop passes; lint, typecheck, applicable tests, and `git diff --check` pass.

## 17. Anti-Slop Requirements

- **Code Anti-Slop:** reject duplicate layout/renderers, generic template frameworks, unnecessary component abstractions/dependencies, dead code, unsafe `any`/assertions, raw HTML injection, fake preview behavior, placeholder values presented as real, hidden TODOs, and secret-bearing snapshots/logs.
- **UI Anti-Slop:** apply to rendered email composition even though this is not browser UI. Reject generic marketing layouts, excessive decoration/gradients/shadows/icons, competing CTAs, inconsistent spacing/type/color, inaccessible content, image-dependent meaning, and mobile overflow.
- **Copy Anti-Slop:** reject clickbait, marketing copy, unsupported security claims, fabricated expiry/device/location/support copy, and subject/preheader repetition.
- **Visual Verification:** required. Inspect real rendered local preview for all three templates in desktop/light, mobile/light, and dark-aware modes where supported; inspect plain text separately. Record inspected clients and limitations. A screenshot alone does not prove email-client compatibility.

## 18. Validation Requirements

- **Static:** API formatting, lint, TypeScript, changed-file review, `git diff --check`, and secret review.
- **Automated Tests:** focused renderer/content/escaping/URL/optional-data/preview tests; full relevant API suite; no external SMTP.
- **Build:** applicable API build/typecheck.
- **Database:** not applicable — no schema or migration.
- **UI:** local generated preview inspection (not a web route), responsive/dark-aware/plain-text review, and representative email-client inspection where available.
- **Anti-Slop:** Code Anti-Slop, UI visual Anti-Slop, and Copy Anti-Slop pass; rerun after fixes.

## 19. Completion Evidence

- AC-001 → `apps/api/tests/email-templates.test.ts` verifies all three typed renderers and their subject, preheader, HTML, and text output. PASS.
- AC-002 → source review confirms a shared layout and approved palette; visual comparison NOT RUN.
- AC-003/004/005/006/008 → `apps/api/tests/email-templates.test.ts` covers CTA/fallback parity, caller expiry, optional metadata/support, escaping, omission of remote images, and long links. PASS.
- AC-007 → preview artifacts were generated by `bun run email:preview`; visual/client inspection NOT RUN because the browser policy rejected the local `file://` preview and prohibited alternate routes around that restriction.
- AC-009 → `bun run email:preview` wrote synthetic previews under the repository-local task artifact directory; `NODE_ENV=production bun apps/api/scripts/preview-email-templates.ts` rejected execution. Source review confirms no route or delivery code. PASS.
- AC-010 → module boundary/source review confirms no SMTP, queue, auth, persistence, or password-changed trigger integration. PASS.
- AC-011 → focused and full API tests, API lint/typecheck/format check, Code Anti-Slop source audit, `git diff --check`, changed-file review, and secret review. PASS. Full Jest reports 28 suites/162 tests passed and 3 suites/8 opt-in tests skipped, with an open-handle warning after exit.

## 20. Traceability

Not applicable — project has no traceability ID system for this capability.

## 21. Open Points

- **Resolved — product identity:** user approved current CMS identity and palette as transactional-email brand source. `docs/DESIGN.md` remains discrepant because it still says the brand is undefined; current UI source and explicit be/32 approval are authoritative for this task. Update docs/DESIGN.md in its owning documentation task rather than expanding be/32 scope.
- **Optional destinations:** support/help/privacy/terms URLs are not present in current project sources. Omit these elements unless real approved destinations are configured.
- **Deferred expiry integration:** verification and reset TTLs are unresolved by `be/34` and `be/35`. Those tasks own the values and supply approved display text; pure renderers accept caller-provided text and must not assume the reference's 24-hour/1-hour examples.
- **Deferred integration — secure delivery:** `be/33` remains blocked on a raw-token-to-worker handoff. Resolve in that owning task before connecting renderers to delivery; this does not block implementation/testing of pure renderers with synthetic typed data. Do not place tokens or rendered HTML in job payloads as a workaround.
- **Password-changed delivery:** renderer is included, but trigger/recipient policy and whether any flow sends it remain unapproved and out of scope.
- **Visual verification not run:** the in-app browser security policy rejected the local `file://` preview; its response prohibits alternate browser surfaces or workarounds. A human must inspect the generated preview or provide an allowed preview method before this visual gate can pass. No email-client compatibility claim is made.
- **Client availability:** record unavailable email clients and do not claim unverified support.
- The reference image is attached to the planning request and is not stored in this repository. This task contract records its visual requirements; no repository asset path is assumed.

### Current Verification State

| Check | State | Evidence |
| --- | --- | --- |
| Implementation | PASS | Three renderers and shared layout are present in `apps/api/src/modules/notification/email/templates.ts`. |
| Focused tests | PASS | `bun run test --runTestsByPath tests/email-templates.test.ts` — 6 tests pass. |
| Lint | PASS | `bun run lint` in `apps/api`. |
| Typecheck | PASS | `bun run typecheck` in `apps/api`. |
| Formatting | PASS | `bun run format:check` in `apps/api`. |
| Preview generation | PASS | `bun run email:preview`; deterministic synthetic artifacts are written to this task's `artifacts/` directory. |
| Preview production guard | PASS | Running the preview script with `NODE_ENV=production` exits with the development-only guard error. |
| `git diff --check` | PASS | No whitespace errors. |
| Visual Anti-Slop | NOT RUN | Requires human rendered inspection of the repository-local HTML previews. |
| Rendered visual review | NOT RUN | No rendered evidence inspected yet. |
| Email-client compatibility review | NOT RUN | Gmail, Apple Mail, and Outlook output have not been inspected. |

### Manual Review Checklist

Inspect these stable artifacts in `tasks/be/32-email-template-foundation/artifacts/` and record findings before changing design:

- `verify-email.html` and `verify-email.txt`
- `reset-password.html` and `reset-password.txt`
- `password-changed.html` and `password-changed.txt`

- Desktop/light layout and container width.
- Mobile responsive behavior and horizontal overflow.
- Dark-mode-aware rendering where supported.
- CTA hierarchy and action destination presentation.
- Fallback URL wrapping and selectability, including its deliberately long synthetic query.
- Footer identity, optional support link, and wrapping.
- Typography and spacing, including long synthetic metadata in password-changed.
- Plain-text fallback content, links, and expiry wording in all three `.txt` files.
- Client-specific rendering only for clients actually inspected; do not infer universal compatibility.

## 22. Definition Of Done

- [ ] Transactional email templates use the approved CMS/product identity as their branding source of truth. Optional footer destinations remain omitted unless configured with approved real URLs. Auth flows provide approved expiry wording; the task-33 secure-handoff blocker is resolved before delivery integration, not before pure renderer implementation.
- [ ] All acceptance criteria and scoped outcomes are satisfied without changing SMTP, queue, auth, API, or schema contracts.
- [ ] Focused and relevant API tests, lint, typecheck/build, and source review pass; tests never send external email.
- [ ] Required local preview and plain-text evidence are visually reviewed; client claims reflect actual inspection. (NOT RUN — pending manual review.)
- [ ] Code/UI/Copy Anti-Slop checks pass after any remediation.
- [ ] `git diff --check`, changed-file review, and secret review pass; no unrelated changes remain.
