# fe/24-first-login-change-password — First Login Change Password

## 1. Metadata

| Field           | Value                                                                                                                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID         | `fe/24-first-login-change-password`                                                                                                                                                                                                                             |
| Batch           | Authentication email flows                                                                                                                                                                                                                                      |
| Owning Feature  | CMS authentication                                                                                                                                                                                                                                              |
| Workstream      | Frontend                                                                                                                                                                                                                                                        |
| Task Category   | Auth/session/route security                                                                                                                                                                                                                                     |
| Repository/App  | `apps/cms`                                                                                                                                                                                                                                                      |
| Status          | IN PROGRESS — implementation and automated checks pass; authenticated browser visual gate not run                                                                                                                                                               |
| Priority        | Security-sensitive                                                                                                                                                                                                                                              |
| Suggested Size  | Medium                                                                                                                                                                                                                                                          |
| Depends On      | `fe/06-auth-state`, `fe/07-login-page`, `fe/08-route-guard`, `fe/11-frontend-testing`, `fe/13-tailadmin-ui-foundation`, `be/10-login-session`, `be/25-authenticated-rbac-context`, `be/35-password-recovery`, `be/38-authenticated-first-login-password-change` |
| Blocks          | None                                                                                                                                                                                                                                                            |
| Execution Order | 24                                                                                                                                                                                                                                                              |

## 2. Outcome

An authenticated user whose `/api/v1/me` identity has `user.mustChangePassword: true` is restricted to `/change-password` and can complete the backend-approved authenticated change flow. Normal CMS navigation resumes only after a fresh `/me` response confirms the flag is false.

## 3. Context

- Backend execution contract and evidence: [`tasks/be/38-authenticated-first-login-password-change/technical.md`](../../be/38-authenticated-first-login-password-change/technical.md).
- Existing auth architecture and dependencies: `tasks/be/10-login-session/technical.md`, `tasks/be/25-authenticated-rbac-context/technical.md`, `tasks/be/35-password-recovery/technical.md`, and FE-06/07/08/11/13 task documents.
- Runtime/API sources: auth login and context services, `apps/api/src/modules/auth/v1/auth.openapi.yaml`, and `apps/api/src/modules/me/v1/me.openapi.yaml`.
- Frontend sources: `apps/cms/src/api/{types.ts,client.ts}`, `apps/cms/src/stores/auth.ts`, `apps/cms/src/router/index.ts`, `AuthLayout.vue`, and `CmsPasswordInput.vue`.
- The user approved `/change-password` and its routing rules in the current conversation. `/api/v1/me` is the durable source; login’s optional top-level flag is preserved but is not authoritative client state. Refresh remains token-only and is followed by `/me` during restoration.

## 4. Dependencies

- BE-38 is implemented and validated; it provides login flag, database-backed `/me`, authenticated `POST /api/v1/auth/change-password`, `204`, server enforcement, password policy, and session outcome.
- Refresh rotates tokens only; frontend restore must load `/me` before route decisions.
- No new infrastructure, environment, or external system is required.

## 5. In Scope

- Parse the optional login `mustChangePassword: true` field without changing the wire shape; require `user.mustChangePassword` in the `/me` response schema and auth identity.
- Keep `/me` as the canonical source after login, refresh, reload, and bootstrap.
- Add the authenticated change-password API client method with strict `{ currentPassword, newPassword }` request validation; never send UI confirmation.
- Add `/change-password`; require authentication, route required-change users there after bootstrap and on every protected navigation, and avoid self-redirect loops.
- Redirect compliant authenticated users away from this mandatory-only route to `/`.
- Build a responsive, accessible auth-layout form with current, new, and confirmation fields; apply the backend’s 12–128 Unicode code-point new-password policy without trimming; present safe validation, pending, success, and API error states.
- After `204`, reload `/me`; leave access gated unless it confirms `false`. On `password_change_not_required`, rehydrate `/me` and leave only if false.
- Provide sign-out through the existing auth-store logout behavior.
- Add focused API-client, auth-store, guard, and page tests.

## 6. Out of Scope

- Backend/API/OpenAPI/session/audit/rate-limit/enforcement changes.
- General account password changes; `/change-password` is only the mandatory first-login flow.
- Public password-reset or email-verification behavior changes.
- Client-side authorization claims; backend remains authoritative for API access.
- Password-history, breach, composition, or other policy not present in BE-38.
- Changes to normal CMS pages, navigation, roles, or permissions beyond route gating.

## 7. Existing Implementation

- `apps/cms/src/stores/auth.ts` stores refresh token in session storage, keeps access token in memory, calls `/me` after login and refresh restore, and owns logout cleanup.
- `apps/cms/src/api/types.ts` validates token and authenticated-context payloads; its `/me` user schema must include the BE-38 boolean.
- `apps/cms/src/api/client.ts` owns transport/auth headers and currently has password recovery methods.
- `apps/cms/src/router/index.ts` installs auth restoration and permission guard.
- `apps/cms/src/components/AuthLayout.vue`, `components/ui/CmsPasswordInput.vue`, `CmsButton.vue`, and `FeedbackState.vue` provide established auth UI primitives.
- `apps/cms/src/views/ResetPasswordView.vue` and its tests are a pattern for password length/confirmation/error handling only; its public token API must not be reused.
- CMS tests use Vitest, jsdom, and Vue Test Utils under `apps/cms/tests/`.

## 8. Implementation Requirements

1. `tokenResponseSchema` may accept optional literal `mustChangePassword: true`; login parsing preserves it. Refresh response remains token-only.
2. `authenticatedContextSchema` requires `user.mustChangePassword: boolean`. Store this in `AuthIdentity`; login and restore use the value loaded from `/me`, not the optional login field.
3. Bootstrap order remains refresh tokens → `/me` → route guard decision. Login resolves only after `/me` succeeds. A failed identity load must not create an allowed state.
4. Add API client `changePassword` using bearer auth and strict `{ currentPassword, newPassword }`; require 204 and do not include confirmation.
5. `/change-password` is authenticated, not public. Required-change users may access it without permission checks. Required-change users navigating to any other protected CMS route are redirected there. Login visits by authenticated users route to `/change-password` when required, otherwise `/`. This page route does not redirect to itself. An authenticated compliant user visiting it is redirected to `/`.
6. Preserve a sanitized `returnTo` destination when routing an attempted protected page or post-login destination to `/change-password`. After successful API response, clear password fields and reload `/me`. Route to the saved destination only when fresh identity says false; otherwise use `/`. If reload fails or remains true, keep the user on the page and explain that status could not be confirmed; do not locally clear the flag.
7. For `password_change_not_required`, reload `/me`; route to `/` only when the response says false. Map `invalid_current_password`, `password_policy_violation`, `password_unchanged`, and `429` to safe field/form messages. Never display raw backend details.
8. New password is 12–128 Unicode code points; count with `Array.from`, do not trim or mutate password values, and require exact confirmation match in the UI. The confirmation is never sent.
9. Prevent duplicate submissions, disable fields while submitting, focus the first invalid field, associate errors with inputs, and clear all password values on successful change and unmount.
10. Sign out calls the existing store action; local auth state is cleared by that action even when its request fails, then route to login. Router restrictions are UX only; BE-38 performs server enforcement.
11. A `401` from the authenticated change or identity reload clears the local session through the existing store action and routes to login with `/change-password` as the return target, retaining a sanitized post-change destination.
12. Reuse the existing TailAdmin auth layout and password input. No new dependency or generic auth abstraction.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no configuration changes.

### API Contract

| Method / Path                       | Auth                           | Request                                   | Response / behavior                                                                             |
| ----------------------------------- | ------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/login`           | Public                         | Existing `{ email, password }`            | Existing token payload; optional top-level `mustChangePassword: true` preserved only when true. |
| `POST /api/v1/auth/refresh`         | Refresh token                  | Existing `{ refreshToken }`               | Token fields only; follow with `/me`.                                                           |
| `GET /api/v1/me`                    | Bearer                         | None                                      | `200 { user: { id, email, mustChangePassword }, roles, permissions }`; database-backed boolean. |
| `POST /api/v1/auth/change-password` | Bearer; allowed while required | Strict `{ currentPassword, newPassword }` | `204`; same session remains valid; then reload `/me`.                                           |

Errors consumed from BE-38: `400 invalid_current_password`, `400 password_policy_violation`, `400 password_unchanged`, `409 password_change_not_required`, `403 password_change_required` for other protected APIs, and `429` rate limit. UI does not treat router checks as API authorization.

### Database Contract

Not applicable — backend owns `users.must_change_password` and password/session state; no frontend database access.

### UI Contract

- Page: dedicated `/change-password` auth-layout route, distinct from recovery routes.
- Fields: current, new, confirmation; policy text; inline field errors; request feedback; pending button state; sign-out action.
- Responsive: one-column form at all widths; no horizontal overflow; usable mobile keyboard and touch targets.
- Accessibility: labels, `autocomplete`, visible focus, keyboard operation, field error association, status/error announcements, and focus on first invalid field.
- Source visual reference: existing TailAdmin auth layout, shared password input, and design tokens/components.

## 10. File Impact

| Classification        | Expected files                                                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expected Create       | `apps/cms/src/views/ChangePasswordView.vue`; `apps/cms/tests/change-password.test.ts`                                                                                                   |
| Expected Modify       | `apps/cms/src/api/types.ts`, `apps/cms/src/api/client.ts`, `apps/cms/src/stores/auth.ts`, `apps/cms/src/router/index.ts`, and relevant API/auth/router tests and auth identity fixtures |
| Expected Not Modified | Backend source/OpenAPI/database; password recovery and verification views/contracts; unrelated CMS features; dependencies/manifests/lockfiles                                           |

Expected paths are guidance; agent must inspect repository before finalizing changes.

## 11. Runtime Behavior

1. Login obtains the existing token response, stores tokens per current auth architecture, then calls `/me`. The returned database-backed flag is stored in identity before navigation resolves.
2. On reload, router guard awaits restore: rotate refresh token, request `/me`, then decide navigation. No state from a prior page load is trusted.
3. When required, authenticated normal protected navigation and authenticated login visits go to `/change-password`; direct route access is allowed without permission check. Unauthenticated route access follows the existing login redirect.
4. Form submission validates client-side, sends only current/new password with bearer auth, then clears entered values and calls `/me`. `false` permits the sanitized saved destination or `/`; true or failed context leaves the gate active and reports safe recovery guidance.
5. A compliant user opening `/change-password` is routed to `/`. Logout uses existing API/store cleanup and routes to `/login`. A change or identity request returning `401` clears local session and routes to login; later login re-enters the mandatory route and reloads `/me`.

## 12. Error And Edge Cases

| Scenario                                              | Expected Result                                                              | Security / Recovery                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Refresh succeeds, `/me` says required                 | Route to `/change-password`                                                  | `/me` is authoritative; no protected view rendered first   |
| `/me` fails during bootstrap                          | Existing restore clears/denies session                                       | Never default to allowed                                   |
| Invalid current password                              | Inline current-password error                                                | Do not expose response internals                           |
| New password out of range / unchanged                 | Inline new-password error                                                    | Do not trim or mutate input                                |
| Confirmation mismatch                                 | Client validation; no API call                                               | Confirmation is never transmitted                          |
| API rate limit                                        | Safe retry-later message                                                     | Do not echo server body                                    |
| `password_change_not_required`                        | Reload `/me`; route only if false                                            | Do not clear flag locally                                  |
| Password API succeeds but `/me` fails or remains true | Stay on page, clear entered secrets, show status recovery message            | Keep route restriction active                              |
| Session expires during change or `/me` reload         | Clear local session and route to login with `/change-password` return target | Later login rehydrates `/me`; never proceed on stale state |
| Logout request fails                                  | Existing store clears local auth; route to login                             | No credential retained in page state                       |
| Already-compliant user opens route                    | Redirect to `/`                                                              | Route is not general password settings                     |

## 13. Security Requirements

- Backend `/me` and centralized access middleware remain sources of truth; router is only a user-experience gate.
- Never persist passwords, confirmation, or duplicate auth requirement state in browser storage.
- Send no reset token and never call the public reset-confirm endpoint.
- Use the active bearer token for change-password; never expose raw API details or credentials in UI/logs.
- Clear password values after success and when unmounting the page.

## 14. Test Requirements

| Category           | Required proof                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Happy Path         | Login and restore hydrate requirement from `/me`; valid change sends exact current/new body, reloads `/me`, and routes only after false, preserving sanitized `returnTo`. |
| Validation         | 11/12/128/129 Unicode code-point boundaries, whitespace preservation, exact confirmation, current-password required, invalid-first-field focus.                           |
| Negative / Failure | Invalid current, policy violation, unchanged, rate limit, password-change-not-required, reload failure/true, duplicate submit, logout failure.                            |
| Security           | Confirmation excluded from request; no password values in storage; login flag preserved; refresh flag not required; safe errors.                                          |
| Regression         | Existing login, recovery, email verification, permission guard, and compliant navigation remain functional.                                                               |
| Isolation          | Each component/store/router test isolates Pinia, API mock, router, and browser storage; no real credentials or order dependence.                                          |

## 15. Task-Level Expected Results

- API response schemas represent the optional login flag and required `/me` boolean accurately.
- Auth identity persists the requirement through login and refresh restoration by loading `/me`.
- `/change-password` route applies approved mandatory routing without loops and handles compliant users.
- Form uses the exact BE-38 endpoint/body and requires backend-confirmed clearance before normal navigation.
- Focused tests prove route, store, client, form, error, and regression behavior.

## 16. Acceptance Criteria

- [x] Login parser preserves optional top-level `mustChangePassword: true`; refresh remains token-only.
- [x] Auth identity gets required boolean from `/me` after login and refresh/reload.
- [x] Required-change identity is redirected from protected navigation and login to `/change-password`; direct path does not loop.
- [x] Unauthenticated access uses existing login flow; compliant users are redirected from `/change-password` to `/`.
- [x] Form uses authenticated `POST /api/v1/auth/change-password` with only `{ currentPassword, newPassword }` and validates 12–128 Unicode code points without mutation.
- [x] Password success and `password_change_not_required` require fresh `/me === false` before leaving the route.
- [x] Logout, safe errors, pending/disabled, and keyboard states work; no client-side security claim is made.
- [ ] Authenticated visual verification at desktop/mobile widths and rendered Anti-Slop gate pass.
- [x] Focused tests, CMS lint, typecheck, full tests, format check, and build pass; final diff checks remain.

## 17. Anti-Slop Requirements

- **Code Anti-Slop:** required; review for duplicate auth state, unnecessary wrappers, dead code, fake success, hidden TODO/FIXME/HACK, unjustified assertions/`any`, comments, and unrelated changes.
- **UI Anti-Slop:** required; audit consistency with auth layout/tokens, useful hierarchy/copy, non-generic UI, no fake behavior, and all relevant loading/error/success/disabled/focus states.
- **Accessibility Anti-Slop:** required; audit labels, error association/announcement, focus behavior, keyboard controls, contrast and visible focus.
- **Responsive Anti-Slop:** required; audit narrow, intermediate, and desktop reflow, overflow, text scaling, input visibility with keyboard, and 44px controls.
- **Visual Verification:** required for this meaningful auth flow; inspect desktop and mobile rendered UI and actual form/guard states.

## 18. Validation Requirements

- **Static:** `bun run --cwd apps/cms lint`, `typecheck`, `format:check`, and `git diff --check`.
- **Automated Tests:** focused Vitest client/store/router/page tests, then `bun run --cwd apps/cms test`.
- **Build:** `bun run --cwd apps/cms build`.
- **Database:** Not applicable — no database changes.
- **UI:** run CMS Vite app; inspect `/change-password` at desktop and mobile widths, validation/error/pending/success states, keyboard/focus, and route redirects.
- **Anti-Slop:** run Code Anti-Slop and UI, accessibility, and responsive specialist audits against the changed code/render; address findings and rerun.

## 19. Completion Evidence

- AC-001 → API client schema/test for login and refresh responses.
- AC-002 → auth-store tests for login and restore calling `/me` and storing the boolean.
- AC-003/004 → router guard tests covering bootstrap, direct route, required/compliant identities, and no loop.
- AC-005/006 → API client and page tests for exact request, boundaries, and server-confirmed state transitions.
- AC-007 → component/store tests and source-level accessibility/responsive inspection; browser rendering remains NOT RUN.
- AC-008 → command output for lint, typecheck, full tests, format, and build; browser and visual Anti-Slop gates remain NOT RUN; `git diff --check` and final diff/status review remain.

Execution evidence:

- `bun run --cwd apps/cms lint` — PASS.
- `bun run --cwd apps/cms typecheck` — PASS.
- `bun run --cwd apps/cms format:check` — PASS.
- `bun run --cwd apps/cms test` — PASS, 18 files / 179 tests.
- `bun run --cwd apps/cms build` — PASS; Vite emitted dependency comment-annotation warnings from Zod and completed the build.
- Focused client/store/router/page tests — PASS, 4 files / 79 tests.
- Code Anti-Slop — PASS by changed-file source review: no duplicate auth subsystem, unnecessary dependency, fake success, hidden TODO, unjustified assertion/`any`, or unrelated source changes.
- UI/accessibility/responsive source audit — PASS for semantic labels, described errors, keyboard focus, target sizing, shared auth layout, and single-column reflow; rendered visual audit — NOT RUN.
- Browser direct unauthenticated `/change-password` — PASS: guard routes to `/login?returnTo=/change-password`. Authenticated desktop/mobile page inspection — NOT RUN because no browser session is authenticated and submitting a password change requires human handoff; component tests prove the page states and interaction behavior.
- `git diff --check` and changed-file/status review — pending.

## 20. Traceability

| Trace Type          | References                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| PRD                 | Not defined for this behavior                                                                                 |
| Feature             | CMS authentication; `fe/24-first-login-change-password`                                                       |
| Requirement         | User-approved FE-24 route decision in current conversation; BE-38 implementation contract                     |
| Acceptance Criteria | AC-001–AC-008 in this task                                                                                    |
| API Operation       | `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/me`, `POST /api/v1/auth/change-password` |
| Database            | Not applicable to frontend; backend uses `users.must_change_password`                                         |
| Test IDs            | Not applicable — no test ID registry                                                                          |
| Design/Figma        | Existing CMS auth layout and tokens; no Figma source                                                          |

## 21. Open Points

None. Route, backend endpoint, password policy, session outcome, and identity refresh contract are defined by current user approval and completed BE-38.

## 22. Definition Of Done

- [ ] Acceptance criteria and approved scope satisfied.
- [ ] Frontend implementation and focused behavior tests pass.
- [x] Code Anti-Slop passes; UI/accessibility/responsive source audits pass.
- [x] CMS lint, typecheck, full tests, format, and build pass.
- [ ] Authenticated browser verification and rendered UI Anti-Slop checks pass.
- [ ] `git diff --check` passes; changed files and secrets reviewed; no unrelated changes.
