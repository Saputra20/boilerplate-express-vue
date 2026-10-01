# fe/21-forgot-password — Forgot Password

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/21-forgot-password` |
| Batch | Authentication email flows |
| Owning Feature | CMS authentication |
| Workstream | Frontend |
| Task Category | Auth UI/API integration |
| Repository/App | `apps/cms` |
| Status | READY FOR FE IMPLEMENTATION |
| Priority | Security-sensitive |
| Suggested Size | Medium |
| Depends On | `fe/04-theme-design-system`, `fe/06-auth-state`, `fe/07-login-page`, `fe/11-frontend-testing`, `fe/13-tailadmin-ui-foundation`, `be/35-password-recovery`, `be/37-auth-email-quality-gate` |
| Blocks | `fe/22-reset-password`, `fe/23-verify-email` |
| Execution Order | 21 |

**Contract status:** Backend request contract is approved and implemented. be/37 records integrated validation PASS. The stale unchecked acceptance item in be/34 is noted as a documentation discrepancy in the shared map; it does not alter this request contract.

## 2. Outcome
Add a public `/forgot-password` CMS page that submits an email to the approved password-reset request API and always displays the backend’s generic confirmation for an accepted request, without revealing account eligibility.

## 3. Context
Sources: `tasks/be/35-password-recovery/technical.md`, `tasks/be/37-auth-email-quality-gate/technical.md`, `apps/api/src/modules/auth/v1/{auth.router.ts,controllers/password-recovery.controller.ts,password-recovery-rate-limit.ts,validation/password-recovery.validation.ts,auth.openapi.yaml}`, `apps/api/src/modules/auth/services/password-recovery.service.ts`, and `apps/api/tests/password-recovery.test.ts`. Frontend conventions and current login/auth implementation are in `tasks/fe/06-auth-state`, `tasks/fe/07-login-page`, `apps/cms/src/{router/index.ts,views/LoginView.vue,api/client.ts,api/types.ts,components/ui/}`, and `apps/cms/tests/`.

## 4. Dependencies
- `be/35-password-recovery`: implementation COMPLETE; contract is present in source/OpenAPI; be/37 records integrated API and full-suite validation PASS.
- `be/37-auth-email-quality-gate`: COMPLETE; integrated validation PASS.
- `fe/06-auth-state`, `fe/07-login-page`, and TailAdmin foundation tasks exist; frontend auth routes, API client, Zod, Pinia, shared controls, and Vitest/jsdom/Vue Test Utils are already in use.
- `PUBLIC_APP_URL` is backend delivery configuration, not a value the browser should derive or request. Password-reset email links end in `/reset-password?token=<raw-token>`.

## 5. In Scope
- Add `/forgot-password` as a public route, linked from the existing login page.
- Add an email form using a focused Zod schema consistent with existing CMS/backend email parsing; submit the entered email to `POST /api/v1/auth/password-reset/request`.
- Use the existing API client, safe `ApiError` handling, TailAdmin-compatible auth presentation and existing primitives. Establish/reuse one shared auth layout for login and the four planned auth pages; any extraction must preserve existing login behavior and styling.
- Render idle, local validation, submitting/disabled, accepted/generic confirmation, source-IP rate-limit, network/timeout, and safe unexpected-error states.
- Provide a direct return-to-login action and keyboard/accessibility/responsive behavior.
- Add focused Vitest/jsdom/Vue Test Utils coverage.

## 6. Out of Scope
- Backend/API, email template, delivery configuration, rate-limit policy, auth/session, or database changes.
- Claiming that a message was delivered; the API hides eligibility and queue outcome.
- Showing whether an account exists, whether it is active, or whether it is eligible.
- Resend controls on this page, new auth state, persistent browser state, or new UI dependencies.
- Changing the login flow beyond composing it through the shared auth layout if that extraction is needed for consistency.

## 7. Existing Implementation
- `apps/cms/src/router/index.ts`: `/login` is public; protected CMS routes live under `/` and are guarded.
- `apps/cms/src/views/LoginView.vue`: existing login form and auth presentation; add only the forgot-password navigation and preserve its behavior.
- `apps/cms/src/api/client.ts`: typed API client, `ApiError`, error normalization, request timeout, and auth methods.
- `apps/cms/src/api/types.ts`: Zod request/response types.
- `apps/cms/src/components/ui/{CmsInput.vue,CmsButton.vue,CmsCard.vue,CmsErrorState.vue,CmsLoadingState.vue}` and `FeedbackState.vue`: reuse applicable primitives.
- `apps/cms/tests/{login-page.test.ts,api-client.test.ts,ui-primitives.test.ts}` and existing Vitest/jsdom/Vue Test Utils configuration.
- Backend contract: `POST /api/v1/auth/password-reset/request`, strict `{ email }`, generic `202` response; implementation in task-35 files listed above.

## 8. Implementation Requirements
- Keep this action unauthenticated and outside Pinia session state. Do not use or mutate auth tokens.
- Send `{ email }` to the exact endpoint; backend lowercases email. Do not add frontend normalization/business rules beyond the existing email validation convention.
- The backend returns `202` with `{ message: "If the account is eligible for a password reset, a reset email will be sent." }` for account eligibility and delivery outcomes. Render a neutral confirmation that preserves this privacy meaning. Do not condition copy on account state.
- Backend request validation is `z.email()` with lowercase transformation and strict object shape. `400` is a safe malformed request response. The frontend validates email for feedback, but the server remains authoritative.
- The source-IP request limit is 20/hour and returns `429 { message: "Too many requests" }`. A per-normalized-email 5/hour ceiling and 60-second eligible-account cooldown are enforced while retaining generic `202`; the frontend cannot identify these account-level denials and must display the same confirmation.
- Use existing API error mapping. Do not expose untrusted/internal server text. Do not log email or request body. No account enumeration by copy, timing-dependent state, route parameters, or alternate API calls.
- Shared auth layout must use existing TailAdmin-compatible visual language and primitives. Do not add an unrelated design system or fabricate extra auth options.
- Handle keyboard form submission, associated labels/errors, focus, disabled duplicate submit, visible focus, and narrow viewports.

## 9. Applicable Contracts
**API Contract**

| Method | Path | Auth | Request | Success | Errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/password-reset/request` | None | Strict `{ email: string }`; backend parses email and lowercases it | `202 { message: "If the account is eligible for a password reset, a reset email will be sent." }` | `400 { message: "Bad request" }`; source-IP `429 { message: "Too many requests" }`; sanitized `500` |

There is no distinction in response for unknown, disabled, deleted, active, delivery-failed, cooldown, or per-account-limited addresses. Existing CMS request timeout is 10 seconds.

**Route Contract:** Public `/forgot-password`; `/login` remains `/login`. Email URL setting is not read by CMS. `PUBLIC_APP_URL` is the canonical backend link base and its generated reset action path is `/reset-password?token=…`.

**UI Contract:** Existing TailAdmin Vue presentation and CMS primitives only. Shared auth layout across login, forgot, reset, verification, and change-password surfaces; no added design library.

## 10. File Impact
**Expected Create:** focused forgot-password view and focused test; shared auth layout only if repository inspection confirms no reusable auth-layout component.

**Expected Modify:** `apps/cms/src/router/index.ts`, `apps/cms/src/views/LoginView.vue` for link/layout composition as needed, `apps/cms/src/api/client.ts`, `apps/cms/src/api/types.ts`, and relevant tests.

**Expected Not Modified:** `apps/api/**`, DB/migrations, backend task contracts, package manifests/lockfiles, auth persistence/session behavior, and unrelated CMS modules. Expected paths are guidance; inspect before implementation.

## 11. Runtime Behavior
Open `/login` → choose Forgot password → navigate to public `/forgot-password` → enter email → local validation → submit once → `POST /api/v1/auth/password-reset/request` with `{ email }` → on `202`, show the same generic confirmation and link back to `/login`. On local `400`, retain field feedback; on `429`, show safe retry-later messaging; on network/timeout/5xx, show a safe generic failure and allow retry. No response causes authenticated state, session refresh, or account-specific UI.

## 12. Error And Edge Cases
| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Invalid email or malformed request | Inline email validation / safe `400` | Do not submit invalid form; backend remains authority |
| Eligible and ineligible addresses | Same accepted confirmation | Prevent account enumeration |
| Per-account ceiling or cooldown | Generic `202` confirmation | API intentionally conceals outcome; no countdown inference |
| IP ceiling | `429`, neutral wait-and-retry message | Do not expose limiter internals |
| Network, timeout, sanitized server failure | Generic retryable error | Do not echo backend internals or body |
| Repeated click while submitting | One request; control disabled | Avoid duplicate requests |
| Direct unauthenticated URL | Page remains accessible | Public route must not invoke auth restoration to block it |
| Keyboard-only/narrow viewport | Reachable form and actions; no horizontal overflow | Labels, focus, reflow |

## 13. Security Requirements
No account enumeration; no email/request-body logging; no password or token input/storage; no token/persistent state; no unsafe redirects; no internal backend error disclosure. Keep request public and do not attach stale bearer credentials intentionally. Auth state remains unchanged.

## 14. Test Requirements
| Scenario | Expected Result | Test Type |
| --- | --- | --- |
| Page render and login link | Public form and return link render | Component |
| Valid email submission | Exact POST/body; generic confirmation | API/component |
| Invalid email | Inline validation; no request | Component |
| Pending request | Loading/disabled and duplicate prevented | Component |
| `202` across address outcomes | Same confirmation | Component/contract |
| `429` | Safe rate-limit state | Component |
| `400`, `500`, network, timeout, malformed API response | Safe errors; no raw backend text | Component/API client |
| Token/session isolation | Auth state and storage untouched | Store/component |
| Shared auth layout | Login and recovery page use same layout without changed login behavior | Component/regression |
| Accessibility/responsive basics | Label/error association, keyboard submit/focus, small viewport layout | Component; browser per UI task |

Use existing Vitest, jsdom, and Vue Test Utils only. No new framework.

## 15. Task-Level Expected Results
- CMS has an accessible `/forgot-password` entry from login.
- The browser calls the real password-reset request contract through the existing API client.
- Accepted requests always show the generic, non-enumerating confirmation.
- Rate-limit, network, validation, and safe unexpected errors are distinguishable where the API supports them.
- Auth layout and existing login visuals remain coherent.

## 16. Acceptance Criteria
- [ ] Public route and login link render through the approved shared TailAdmin auth presentation.
- [ ] Valid input sends only `{ email }` to `POST /api/v1/auth/password-reset/request`.
- [ ] Every `202`, including account-level throttling/cooldown, produces account-neutral confirmation.
- [ ] Source-IP `429`, local validation, network, and unexpected safe errors render without internal detail.
- [ ] Duplicate submissions are prevented; no auth/session state changes.
- [ ] Focus, labels, errors, keyboard, and responsive layout are covered by focused tests and rendered review.
- [ ] No backend, database, dependency, or unrelated route changes.

## 17. Anti-Slop Requirements
Code Anti-Slop: inspect duplication, dead imports/dependencies, fake or incomplete behavior, hidden TODO/FIXME/HACK, unsafe `any`/assertions, and excessive comments. UI Anti-Slop: maintain existing TailAdmin hierarchy and shared auth composition, avoid generic extra cards/decoration/fake delivery claims, and cover states. Apply copy review to account-neutral language. Accessibility and mobile audits plus browser verification are required for rendered UI. No visual verification claim without browser evidence.

## 18. Validation Requirements
- Static: applicable CMS lint, typecheck, format check, `git diff --check`.
- Automated Tests: focused forgot-password/API client/login regression tests; CMS suite if focused changes affect shared auth.
- Build: CMS production build.
- Database: Not applicable — no schema work.
- UI: desktop and narrow viewport render, keyboard/focus, success/error/rate-limit interaction via browser.
- Anti-Slop: Code + UI + applicable copy/accessibility/mobile review; repeat after fixes.

## 19. Completion Evidence
- AC-001 → router and rendered component test plus browser capture.
- AC-002 → API-client test asserting method, endpoint, and body.
- AC-003/004 → component tests for generic `202`, `429`, and safe failures.
- AC-005 → component/store assertions showing no state or storage mutation and duplicate prevention.
- AC-006 → accessibility/component tests and desktop/mobile browser inspection.
- AC-007 → reviewed `git diff` and `git diff --check`.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
- **Deployment base path:** backend builds action URL by appending `reset-password` to `PUBLIC_APP_URL` while Vue Router history uses Vite `BASE_URL` (currently default `/`). If production `PUBLIC_APP_URL` has a path prefix, deployment must configure the matching CMS base path. Deployment documentation currently does not state whether path-prefixed CMS hosting is supported; resolve the runtime base-path contract before release if applicable. Root deployment is directly compatible.
- be/34 contains an unchecked recipient-at-rest acceptance item while be/37 records encrypted-recipient migration and validation PASS. This task does not depend on recipient persistence; retain discrepancy in shared dependency map and resolve through task-doc ownership if those documents are maintained.

## 22. Definition Of Done
- [ ] Acceptance criteria and approved scope satisfied.
- [ ] Focused tests, lint, typecheck, format, and build pass.
- [ ] Applicable Anti-Slop passes.
- [ ] Browser verification covers rendered states and responsive layout.
- [ ] `git diff --check`, changed-file review, no-secret/no-PII review, and no unrelated changes.
