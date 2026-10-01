# fe/23-verify-email — Verify Email

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/23-verify-email` |
| Batch | Authentication email flows |
| Owning Feature | CMS authentication |
| Workstream | Frontend |
| Task Category | Auth UI/API integration |
| Repository/App | `apps/cms` |
| Status | READY FOR FE IMPLEMENTATION |
| Priority | Security-sensitive |
| Suggested Size | Medium |
| Depends On | `fe/21-forgot-password`, `fe/04-theme-design-system`, `fe/06-auth-state`, `fe/11-frontend-testing`, `fe/13-tailadmin-ui-foundation`, `be/34-email-verification`, `be/37-auth-email-quality-gate` |
| Blocks | None |
| Execution Order | 23 |

**Contract status:** Verification and request/resend contracts are approved and implemented. be/37 records HTTP/OpenAPI and integration validation PASS. See shared dependency map for the stale be/34 checklist discrepancy and URL base-path condition.

## 2. Outcome
Add a public `/verify-email?token=…` page compatible with the actual verification email URL. On entry, submit the token once to the verification API, then show verified or contract-supported error state; optionally provide email-based resend through the already-approved generic request endpoint. Verification never authenticates the user.

## 3. Context
Sources: `tasks/be/34-email-verification/technical.md`, `tasks/be/37-auth-email-quality-gate/technical.md`, `apps/api/src/modules/auth/{services/email-verification.service.ts,v1/auth.router.ts,v1/controllers/email-verification.controller.ts,v1/validation/email-verification.validation.ts,v1/email-verification-rate-limit.ts,v1/auth.openapi.yaml}`, `apps/api/src/modules/auth/services/auth-action-url.ts`, tests `email-verification.test.ts`, `email-verification.integration.test.ts`, `email-templates.test.ts`; frontend sources `tasks/fe/07-login-page`, `tasks/fe/13-tailadmin-ui-foundation`, `apps/cms/src/{router/index.ts,api/client.ts,api/types.ts,stores/auth.ts,components/ui/}`.

## 4. Dependencies
- `be/34-email-verification`: implementation COMPLETE; URL and API contracts are present. be/37 records integrated validation PASS. Task 34 retains one unchecked recipient-at-rest criterion; be/37 records the encrypted-recipient migration and validation PASS. This is a documentation-status discrepancy, not a frontend contract blocker; see `tasks/fe/AUTH_EMAIL_DEPENDENCY_MAP.md`.
- `be/37-auth-email-quality-gate`: COMPLETE; auth HTTP/OpenAPI, integration, and API suite validation recorded PASS.
- `fe/21-forgot-password`: shared auth layout and API error integration conventions.
- Backend route URL is `<PUBLIC_APP_URL>/verify-email?token=<raw-token>`; token is base64url, expires after 24 hours, and consumed once.

## 5. In Scope
- Add public `/verify-email` route and verification result page. Read token only from query parameter `token`.
- Submit automatically once on entry to `POST /api/v1/auth/email-verification/verify` with `{ token }`, guarded against duplicate submits/navigation re-entry.
- Keep token only in component memory; remove query from visible URL/history after capture. Never persist token in localStorage, sessionStorage, Pinia persistence, logs, telemetry, or returnTo. Set an early no-referrer policy before app scripts load and require deployment access logs to redact the initial request query for this route.
- Render verifying, verified, missing token, invalid/used, expired, rate-limited, network/safe-server-failure states.
- If resend is included, use the supported `POST /api/v1/auth/email-verification/request` with an email input, render the same generic `202` confirmation for every eligible/ineligible/cooldown state, and show only source-IP `429` where exposed. No resend without email collection.
- On verification success, show an explicit success state with navigation to sign in. Do not refresh identity or assume automatic authentication.
- Use shared TailAdmin auth layout/primitives, responsive/accessibility practices, and existing test framework.

## 6. Out of Scope
- Backend, API, email templates, verification policy, auth/session changes, or changes to login eligibility.
- Distinct already-verified endpoint behavior: backend does not expose it.
- Automatic authentication, `/me` identity refresh to discover verification status, or redirect to CMS based on an assumed session policy.
- Resend by token, email extracted from token, resend countdown, or eligibility-specific status. Resend request accepts email only.
- Any token storage beyond component memory, new framework, or alternate token path format.

## 7. Existing Implementation
- `apps/api/src/modules/auth/services/email-verification.service.ts`: creates 32 random bytes/base64url, SHA-256 fingerprint, 24-hour expiry, builds `/verify-email?token=…`, one-time verify.
- `apps/api/src/modules/auth/services/auth-action-url.ts`: appends auth route path to `PUBLIC_APP_URL`, adds URL-encoded `token` query.
- `apps/api/src/modules/auth/v1/{auth.router.ts,controllers/email-verification.controller.ts,validation/email-verification.validation.ts,email-verification-rate-limit.ts,auth.openapi.yaml}`: exact routes, schemas, outcomes, limits.
- `apps/api/tests/{email-verification.test.ts,email-verification.integration.test.ts,email-templates.test.ts}`: URL, service, limiter, and integration evidence.
- `apps/cms/src/router/index.ts`: public login and protected CMS routes; current history base defaults through Vite.
- `apps/cms/src/api/{client.ts,types.ts}`: typed API/errors; `apps/cms/src/stores/auth.ts`: identity/session behavior; `components/ui/` and login view: shared presentation candidates.

## 8. Implementation Requirements
- Actual email URL is `<PUBLIC_APP_URL>/verify-email?token=<raw-token>`; current root route suffix is `/verify-email`, query parameter `token`. Do not treat query as a guess or switch it to a path segment.
- Verification is `POST /api/v1/auth/email-verification/verify`, strict `{ token }`; success `200 { message: "Email verified" }`. Token schema accepts string length 1–128; service accepts exactly 43 base64url characters. Do not expose token in any error.
- Automatically perform one consume request when token is present; this is the operation, not a preflight. Use an in-flight/idempotence guard in page state to prevent accidental duplicate requests. Immediately replace the URL to remove token query while preserving route. Client cleanup happens after the host has already received the document request; hosting access logs must redact its query string.
- Token is random 32 bytes, base64url (43 chars), expires at 24 hours, and is single use. `400` code `invalid_or_used_verification_token` combines invalid, used, revoked, unknown, and malformed values. `400` code `verification_token_expired` distinguishes expiry. Do not render already-verified success for the former: backend has no distinct already-verified response; a consumed challenge maps to invalid/used.
- Verification attempt source-IP limiter is 20 attempts per 15 minutes, returns `429 { message: "Too many requests" }`. Generic sanitized `500`, network, timeout, and invalid response map to safe failure.
- Successful verification changes `emailVerifiedAt`; it does not issue or refresh tokens. `/api/v1/me` has only user ID/email, roles, and permissions; it does not include verification state. Route to a success state with sign-in action. If an existing session means `/login` guard redirects to CMS, preserve the established guard behavior; do not silently clear or refresh session.
- Resend is supported by `POST /api/v1/auth/email-verification/request`, `{ email }`, `202` generic message for account/queue outcomes. Limits: 5/hour per normalized email, 20/hour per source IP, 60-second eligible-account cooldown; per-account/cooldown response remains generic `202`; IP limit returns `429`. Resend UI must collect email and never reveal eligibility. Include only if the implementer can keep the flow clear within the page.
- Keep error copy neutral; don't expose server internals. Use common auth layout, semantic status/error announcements, keyboard/focus handling, and responsive controls.

## 9. Applicable Contracts
**API Contract**

| Method | Path | Auth | Request | Success | Errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/email-verification/verify` | None | Strict `{ token: string }` | `200 { message: "Email verified" }` | `400` invalid/used/revoked: `invalid_or_used_verification_token`; expired: `verification_token_expired`; IP `429`; sanitized `500` |
| POST | `/api/v1/auth/email-verification/request` | None | Strict `{ email: string }` | `202 { message: "If the account is eligible for email verification, a verification email will be sent." }` | `400 { message: "Bad request" }`; source-IP `429`; sanitized `500` |

**Link Contract:** `<PUBLIC_APP_URL>/verify-email?token=<URL-encoded raw token>`; 32 random bytes, 43 base64url characters, 24-hour TTL, one-time consume.

**UI Contract:** Public `/verify-email`; result page and optional supported email-based resend form. Success is unauthenticated verification only; show sign-in action.

## 10. File Impact
**Expected Create:** verification view and focused tests.

**Expected Modify:** router, API client/types, `apps/cms/index.html` for early no-referrer policy, shared auth layout as introduced in FE-21, and relevant API/component tests.

**Expected Not Modified:** `apps/api/**`, auth store/session state unless test proves an unnecessary coupling, DB/migrations, dependencies, manifests/lockfiles, and unrelated CMS routes. Expected paths are guidance; inspect before implementation.

## 11. Runtime Behavior
Open link → read query token into transient component memory → replace visible URL without token → if missing, show invalid-link state → otherwise send one POST verification request → `200` renders success and sign-in action; expired error renders expired state; invalid/used error renders generic invalid-link state; `429`/network/5xx render safe failure. No successful response authenticates user or updates `/me`. Optional resend collects email → request endpoint → always show backend generic `202` confirmation for all account/cooldown states.

## 12. Error And Edge Cases
| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Missing token | Invalid/missing-link state; no API request | No token persistence |
| Verify pending | Progress state and duplicate trigger disabled | Prevent accidental replay |
| `200` | Verified success; sign-in action | No token/session issuance |
| `verification_token_expired` | Expired-link message and supported resend guidance | Do not expose token |
| `invalid_or_used_verification_token` | Generic invalid/already-used link message; optional resend | Backend doesn't distinguish already verified |
| Attempt IP `429` | Retry-later state | Do not expose limiter internals |
| Network/timeout/500 | Generic failure with retry only if in-memory token remains, otherwise ask user to reopen link | Never persist token for retry |
| Resend account limit/cooldown | Generic accepted confirmation | No countdown or account-state distinction |
| Resend source-IP limit | Neutral `429` state | No internal detail |
| Existing auth session | Keep auth store/session unchanged; existing router rules apply | Do not infer auth from verified status |

## 13. Security Requirements
Never persist/log/telemetry the raw verification token; scrub token query from visible URL history after capture; keep it transient only while the operation is pending. Set no-referrer before app scripts and require hosting/CDN logs to redact the initial `/verify-email` query because the server receives that query before Vue runs. Avoid duplicate consume calls. No account enumeration in resend. Do not expose backend internals or redirect parameters. Verification is not authentication and must not mutate auth store/session.

## 14. Test Requirements
| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Email URL route/query | Reads `token` query and calls exact endpoint/body | Component/API client |
| Token cleanup | Router replacement removes query; no browser storage | Security/component |
| Verifying/duplicate navigation | One request and progress state | Component |
| Success | `200` shows success/sign-in; auth unchanged | Component/store |
| Expired code | Expired-specific UI | Component |
| Invalid/used code | Combined neutral state | Component |
| Missing token, `429`, network, 5xx | Safe states | Component |
| Resend (if included) | `{ email }` request; generic `202`, IP `429` handling | API/component |
| Accessibility/responsive | Status announced, labels, keyboard/focus, narrow view | Component + browser |

Use Vitest, jsdom, Vue Test Utils only.

## 15. Task-Level Expected Results
- Real generated email URL opens the CMS route with the backend's actual query token.
- Verification is consumed once through the existing API client.
- Success is shown without authenticating or refreshing identity.
- Supported resend, if included, preserves generic account privacy and real server limits.
- Token and error handling remain transient and safe.

## 16. Acceptance Criteria
- [ ] `/verify-email?token=…` matches backend URL and remains public.
- [ ] Token is scrubbed from visible URL and submitted once to the exact verification endpoint.
- [ ] Success `200`, expired `400`, invalid/used `400`, rate-limit, missing-token, network, and safe-server-error states render accurately.
- [ ] Already-verified is not represented as a distinct backend result; no automatic login/session refresh occurs.
- [ ] Resend, if included, uses supported request endpoint and generic `202`; per-account throttle/cooldown does not produce a different state.
- [ ] Auth state and persistent browser storage remain unchanged; token not logged or exposed.
- [ ] Responsive/accessibility review passes; no backend/dependency/unrelated changes.

## 17. Anti-Slop Requirements
Code Anti-Slop: review fake behavior, duplicate request logic, unused code/dependencies, hidden TODO/FIXME/HACK, unjustified casts, and excessive comments. UI Anti-Slop: use shared TailAdmin auth layout; avoid made-up already-verified/resend countdown behavior and unnecessary decoration; cover loading/success/error. Apply copy, accessibility, mobile, and browser audits; do not claim rendered verification without evidence.

## 18. Validation Requirements
- Static: applicable CMS lint, typecheck, format check, `git diff --check`.
- Automated Tests: exact API and link handling, token cleanup, all supported states, auth isolation, optional resend.
- Build: CMS production build.
- Database: Not applicable — no schema changes.
- UI: browser inspect desktop/narrow view, loading/result/errors, focus and status announcement.
- Anti-Slop: Code + UI + copy/accessibility/mobile review; repeat after fixes.

## 19. Completion Evidence
- AC-001/002 → router and API client/component tests with token query fixture and URL cleanup.
- AC-003/004 → status/error/guard/store tests.
- AC-005 → resend API/component test if shipped.
- AC-006/007 → security assertions, browser screenshots/inspection, static/build output, Anti-Slop and diff review.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
- **Deployment base path:** backend preserves a path prefix from `PUBLIC_APP_URL`; current Vite base/router default to `/`. Root deployment is compatible; if path-prefix deployment is supported, align Vite `base` and router history base with `PUBLIC_APP_URL` pathname. Resolve before release if applicable.
- **Hosting access logs:** first navigation sends the token query to the static host/CDN before frontend code can scrub it. Confirm query redaction for `/verify-email` before deployment. FE implementation can set no-referrer and clear browser history but cannot alter the initial request already received by the host.
- **be/34 checklist discrepancy:** task-34 still has an unchecked recipient-at-rest criterion, while be/37 records the encrypted migration/integration validation as PASS. Runtime contract for verification endpoints and email link is present and tested. See dependency map.
- **Resend UI choice:** backend supports the email request endpoint. Implementation may omit an inline resend form if it would require introducing an unapproved confusing flow; if included, it must collect email and use generic contract. No BE decision is missing.

## 22. Definition Of Done
- [ ] Acceptance criteria and approved scope satisfied.
- [ ] Focused tests, lint, typecheck, format, and build pass.
- [ ] Applicable Anti-Slop passes.
- [ ] Browser verification covers rendered states and responsive layout.
- [ ] `git diff --check`, changed-file review, no-secret/no-PII review, and no unrelated changes.
