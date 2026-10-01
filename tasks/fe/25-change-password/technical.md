# fe/25-change-password  -  Voluntary Change Password

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `fe/25-change-password` |
| Batch | Account self-service |
| Owning Feature | CMS account management |
| Workstream | Frontend |
| Task Category | Authenticated account/API integration |
| Repository/App | `apps/cms` |
| Status | IMPLEMENTED — mobile viewport visual verification unavailable |
| Priority | Normal; security-sensitive |
| Suggested Size | Medium |
| Depends On | `fe/04-theme-design-system`, `fe/06-auth-state`, `fe/11-frontend-testing`, `fe/13-tailadmin-ui-foundation`, `be/39-authenticated-self-service-password-change` |
| Blocks | None |
| Execution Order | 25 |

## 2. Outcome

An authenticated user whose mandatory first-login change is not required can voluntarily change their password from `/settings/change-password` using a backend-approved authenticated self-service contract. The page follows the backend-defined validation, error, audit, and session outcome.

## 3. Context

- The separately approved mandatory first-login flow is [`tasks/fe/24-first-login-change-password/technical.md`](../24-first-login-change-password/technical.md); its `/change-password` route remains distinct.
- [`tasks/be/38-authenticated-first-login-password-change/technical.md`](../../be/38-authenticated-first-login-password-change/technical.md) and `apps/api/src/modules/auth/v1/auth.openapi.yaml` define `POST /api/v1/auth/change-password` as mandatory-only: it accepts `{ currentPassword, newPassword }`, returns `204`, and returns `409 password_change_not_required` when the database flag is false. It is not a voluntary-change contract.
- [`tasks/be/39-authenticated-self-service-password-change/technical.md`](../../be/39-authenticated-self-service-password-change/technical.md) defines the separate, implemented voluntary operation `POST /api/v1/auth/change-password/self-service` (`changeCurrentUserPassword`). Its HTTP, OpenAPI, and PostgreSQL integration tests pass.
- `apps/api/src/modules/me/v1/me.openapi.yaml` is the source for authenticated identity context. `docs/API.md` records `/me` as canonical for the database-backed mandatory-change state.
- Frontend architecture and conventions: `apps/cms/src/{router/index.ts,stores/auth.ts,api/client.ts,api/types.ts,components/CmsProfileMenu.vue,components/ui/}`, `tasks/fe/06-auth-state`, and `tasks/fe/13-tailadmin-ui-foundation`.
- `docs/DESIGN.md` names Tailwind and accessible CMS primitives but leaves detailed brand, breakpoints, and accessibility targets unresolved. Reuse existing CMS patterns; do not introduce a new visual system.

## 4. Dependencies

- `be/39-authenticated-self-service-password-change` supplies the approved operation and exact API contract below; its required validation is complete.
- `be/38-authenticated-first-login-password-change` remains mandatory-only and must not be used for voluntary changes.
- Frontend foundations: FE-04, FE-06, FE-11, and FE-13 are existing dependencies. The task must inspect their current implementation before edits.
- No new infrastructure or external service is in scope.

## 5. In Scope

- Add the authenticated `/settings/change-password` route, distinct from FE-24 `/change-password` and public forgot/reset routes.
- Render a TailAdmin-compatible form using fields required by the approved voluntary endpoint. Confirmation may be local-only when not part of the backend schema.
- Consume only the approved endpoint, request schema, password policy, and error codes; validate requests at the API boundary using current CMS patterns.
- Keep password values only in transient component state; clear them after success and when the page unmounts.
- Follow the approved successful session outcome and refresh identity/session only through the established auth-store API.
- Preserve FE-24 routing and server enforcement. If `/me` says `mustChangePassword === true`, the mandatory flow continues to own navigation; this page cannot bypass it.
- Add the account menu link only if the resulting route is implemented and the existing menu pattern supports it.
- Add focused tests for authenticated route access, fields/validation, API outcomes, loading/disabled behavior, safe errors, and FE-24 non-regression.

## 6. Out of Scope

- Mandatory first-login password-change behavior, route, API policy, or session semantics (FE-24 / BE-38).
- Forgot-password or public reset-token flows.
- Backend/API/OpenAPI/database/session/audit/rate-limit changes; these require their own approved backend task.
- Guessing whether current password is required, password policy, same-password behavior, error codes, rate limits, session retention/revocation, or success status.
- Password history, breach checks, password expiration, or new validation policy.
- New notification framework, auth architecture, or account settings framework.

## 7. Existing Implementation

- `apps/cms/src/router/index.ts` contains authenticated route metadata and the FE-24 guard for `/change-password`.
- `apps/cms/src/stores/auth.ts` restores tokens then `/api/v1/me`, exposes identity, and calls the mandatory-only password endpoint through `changePassword`.
- `apps/cms/src/api/client.ts` and `api/types.ts` own typed API operations and response validation.
- `apps/cms/src/components/CmsProfileMenu.vue` is the existing user menu; inspect its current links before adding one.
- `apps/cms/src/components/ui/` includes CMS buttons, password input, and feedback primitives. `apps/cms/src/views/ChangePasswordView.vue` is mandatory-flow UI and is not the voluntary route or behavior.
- Backend evidence: `apps/api/src/modules/auth/v1/auth.router.ts`, `auth.openapi.yaml`, `self-service-password-change.service.ts`, and `self-service-password-change.repository.ts`; `GET /api/v1/me` is defined beside the auth module and in `apps/api/src/modules/me/v1/me.openapi.yaml`.
- `apps/api/tests/self-service-password-change.test.ts`, `openapi.test.ts`, and `self-service-password-change.integration.test.ts` pass; the integration suite used a disposable local PostgreSQL cluster.
- There is no current `/settings` or `/profile` route; FE-25 creates its route as scoped here.

## 8. Implementation Requirements

1. Use the BE-39 operation exactly: `POST /api/v1/auth/change-password/self-service`, bearer auth, strict `{ currentPassword, newPassword }`, and `204 No Content` success.
2. The page route is `/settings/change-password`, requires authentication, and is not public. It must not replace, alias, or redirect FE-24's `/change-password` route.
3. Auth bootstrap must finish before the guard decides access. If `mustChangePassword` is true, route through the existing FE-24 mandatory guard; the voluntary route must not enable normal protected navigation or submit a general-purpose change request in that state.
4. Use only backend-approved form fields. Do not send confirmation unless the approved request schema requires it. Do not mutate, trim, log, persist, or expose password values.
5. Reuse the canonical password input and validation helper only after confirming its rules match the voluntary endpoint contract. Do not duplicate policy constants or assume BE-38's mandatory endpoint applies.
6. Map only documented backend error codes/statuses to UI. Network and unexpected errors use the existing safe CMS error pattern; never display raw exception details.
7. Prevent duplicate submission, disable the submit control and relevant fields while pending, associate field errors with controls, and clear sensitive fields after success and unmount.
8. On success, perform only the session action documented by the backend. If the backend keeps the current session, remain authenticated; if it rotates/revokes sessions, use the existing auth flow as specified. Do not infer behavior from FE-24.
9. Keep route accessible from the existing profile menu only after the route and backend contract are implemented. Do not add placeholder account links.
10. Use the existing TailAdmin-derived CMS primitives and responsive layout; do not add a design or notification dependency.

## 9. Applicable Contracts

**API Contract:** `POST /api/v1/auth/change-password/self-service`; Bearer access token; strict `{ currentPassword: string, newPassword: string }`; no extra fields or confirmation field. Password values are not trimmed or normalized. `newPassword` must contain 12–128 Unicode code points using the canonical backend rule. Success is `204 No Content`; the current session and refresh chain remain active, while other active sessions and their active refresh tokens are revoked. Errors: `400 invalid_current_password`, `400 password_policy_violation`, `400 password_unchanged`, generic `401`, `403 password_change_required`, existing `413`, existing `429 { message: "Too many requests" }`, and safe centralized `500`. The response issues no replacement tokens. See BE-39 OpenAPI for response schemas.

**Authentication Contract:** `GET /api/v1/me` provides `user.mustChangePassword`; FE-24 owns navigation while it is true. Refresh remains token-only and the CMS rehydrates `/me` through the auth store.

**UI Contract:** Authenticated `/settings/change-password`; TailAdmin-compatible CMS form. Exact fields, policy helper text, and success messaging follow the backend contract. Route is distinct from `/change-password`.

**Database Contract:** Not applicable  -  frontend task; backend persistence is defined by the dependency task.

**Configuration Contract:** Not applicable  -  no new configuration.

## 10. File Impact

**Expected Create:** voluntary password-change view and focused CMS tests after dependency completion.

**Expected Modify:** `apps/cms/src/router/index.ts`, API client/types, and `CmsProfileMenu.vue` only as needed for the approved route and account link; applicable CMS tests.

**Expected Not Modified:** `apps/api/**`, `apps/cms/src/views/ChangePasswordView.vue` mandatory-flow behavior, reset/forgot flows, dependencies, environment files, and unrelated CMS modules.

Expected paths are guidance; agent must inspect repository before finalizing changes.

## 11. Runtime Behavior

After auth restoration, router checks `/api/v1/me`-derived identity. Unauthenticated users follow the existing login return path. A user with `mustChangePassword === true` remains in FE-24's mandatory flow. A compliant authenticated user may open `/settings/change-password`, enter approved fields, and submit once to the approved authenticated API operation. Pending state prevents duplicate submission. A documented success triggers only the backend-approved session action and safe success state. Documented validation errors map to field/form feedback; session expiry follows current auth-client behavior; network or unknown failure uses safe generic feedback. No password value is stored outside transient form state.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Mandatory flag true | FE-24 guard owns `/change-password`; backend returns 403 if the state changes during a request | Do not submit voluntary change |
| User not authenticated/session expired | Existing auth restore/client redirects to login | No password submission |
| Mandatory flag true | FE-24 guard owns `/change-password` flow | No bypass through voluntary page |
| Missing/invalid fields | Client feedback follows approved backend rules | Do not impose unapproved policy |
| Documented password/current-password error | Map exact supported code to safe field/form feedback | Never show raw backend exception |
| Rate limit, if contract defines it | Show neutral retry state for documented response | Do not invent code or timer |
| Duplicate submit | Keep one request in flight and disable action | Avoid repeated password attempts |
| Session outcome after success | Execute exact backend policy only | No assumed session retain/revoke behavior |
| Network/5xx/unrecognized response | Safe generic error; keep or clear values only as approved UX allows, then clear on unmount | Avoid credential/error leakage |

## 13. Security Requirements

Use authenticated API client and existing CSRF/session protections. Never log, persist, return, or place passwords in Pinia, browser storage, URLs, telemetry, or test snapshots. Clear sensitive form state after success and unmount. Do not expose backend internals. Do not weaken FE-24 route guards or treat client state as API authorization. Submit only to the backend-approved endpoint and follow its current-password, rate-limit, audit, and session rules.

## 14. Test Requirements

| Category | Required proof |
| --- | --- |
| Happy Path | Authenticated compliant user can submit exact approved request; documented success and session result are followed |
| Validation | Required fields, confirmation mismatch if present, and all client validation match backend contract; frontend-only confirmation is omitted from request unless explicitly required |
| Negative / Failure | Documented current-password/policy/conflict/rate-limit responses, expired session, network and safe server failure are handled |
| Security | No browser persistence/logging; bearer-authenticated API client; mandatory `true` continues through FE-24; no public-reset endpoint use |
| Regression | FE-24 `/change-password`, public forgot/reset, auth restore, and token refresh tests remain passing and behavior unchanged |
| Isolation | Vitest/jsdom/Vue Test Utils tests use isolated API mocks, deterministic cleanup, and do not depend on test order |

## 15. Task-Level Expected Results

- An authenticated voluntary-change route exists separately from FE-24.
- The view consumes an approved backend contract without request/response guessing.
- Form state is transient and success/session behavior matches backend policy.
- Focused tests prove supported API outcomes and FE-24 remains intact.

## 16. Acceptance Criteria

- [x] Backend contract dependency is approved, implemented, and linked with its task ID and exact API operation before FE implementation begins; database integration evidence remains noted in BE-39.
- [x] Authenticated `/settings/change-password` is distinct from mandatory `/change-password` and public reset routes.
- [x] Only backend-approved fields, validation, endpoint, error codes, and success/session outcome are used.
- [x] Passwords are not persisted or logged and are cleared after success/unmount.
- [x] Mandatory-change users remain controlled by FE-24 and cannot bypass the mandatory route.
- [x] Pending, validation, documented failure, session-expiry, and success states are accessible and tested.
- [x] Focused/full CMS tests, lint, typecheck, build, Code/UI Anti-Slop pass. Browser visual review completed at 860 CSS px; mobile-sized viewport check is NOT RUN because the available browser control has no viewport-resize operation.
- [x] `git diff --check` and FE-25 changed-file scope review pass. The workspace contains pre-existing changes from other approved tasks; no unrelated files were edited for FE-25.

## 17. Anti-Slop Requirements

- **Code Anti-Slop:** required; inspect duplicate password rules, guessed endpoint/error handling, unnecessary wrappers, dead code/dependencies, fake success, hidden TODO/FIXME/HACK, unjustified `any`/assertions, and unrelated changes.
- **UI Anti-Slop:** required after implementation; use current CMS hierarchy and shared primitives, avoid generic account-card decoration, and ensure all controls/states are real.
- **Visual Verification:** required for the rendered page at desktop/tablet/mobile where browser capability exists; compare against existing CMS TailAdmin patterns. Report `NOT RUN  -  <reason>` if unavailable.
- Apply copy/accessibility/responsive checks to errors, labels, visibility controls, focus, loading, and narrow layouts. Planning phase Anti-Slop was requested during planning; this document was reviewed for invented contract claims and generic/unnecessary prose.

## 18. Validation Requirements

- **Static:** CMS lint, typecheck, formatting where configured, `git diff --check`.
- **Automated Tests:** focused page/API/router tests plus CMS frontend suite; exact commands should be confirmed from `apps/cms/package.json` during implementation.
- **Build:** CMS production build.
- **Database:** Not applicable  -  frontend task.
- **UI:** desktop/tablet/mobile browser inspection and keyboard/error-state review when browser tools are available.
- **Anti-Slop:** Code + UI, with copy/accessibility/responsive review; rerun after fixes.

## 19. Completion Evidence

- AC-001/002 → BE-39 task/OpenAPI plus `tests/router-guard.test.ts`.
- AC-003/004 → `tests/api-client.test.ts`, `tests/self-service-change-password.test.ts`.
- AC-005 → `tests/router-guard.test.ts`; FE-24 `tests/change-password.test.ts` and full suite.
- AC-006 → `bun run --cwd apps/cms test` (20 files, 200 tests), lint, typecheck, format check, and build passed; Code/UI Anti-Slop source/rendered review passed. Browser visual review at 860 CSS px showed no horizontal overflow; mobile viewport verification NOT RUN because viewport resizing is unavailable in the browser controls.
- AC-007 → `git diff --check` passed; FE-25 source diff reviewed. Existing workspace edits belong to other tasks and were preserved; `.env` was not read or modified.

## 20. Traceability

| Trace Type | References |
| --- | --- |
| PRD | Not defined for account self-service |
| Feature | `fe/25-change-password`; distinct from `fe/24-first-login-change-password` |
| Requirement | User-provided authenticated voluntary password-change request |
| Acceptance Criteria | AC-001-AC-007 in this task |
| API Operation | `changeCurrentUserPassword`; `POST /api/v1/auth/change-password/self-service` (BE-39) |
| Database | Not applicable to frontend |
| Test IDs | Not applicable  -  project has no test ID registry |
| Design/Figma | `docs/DESIGN.md`; existing CMS TailAdmin-derived patterns; no dedicated account design |

## 21. Open Points

- None.

## 22. Definition Of Done

- [x] Backend contract is approved and implemented in BE-39; database integration evidence remains pending there.
- [x] Acceptance criteria and scope are satisfied.
- [x] API integration, page, route, and behavior tests pass.
- [x] Lint, typecheck, build, and required Code/UI Anti-Slop pass.
- [x] Browser verification completed at the available 860 CSS px viewport; mobile viewport verification is recorded as NOT RUN because viewport resizing is unavailable.
- [x] `git diff --check`, changed-file review, secret review, and FE-25 scope review pass.
