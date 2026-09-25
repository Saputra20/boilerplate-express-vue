# fe/07-login-page — Login Page

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/07-login-page` |
| Batch | N/A |
| Owning Feature | CMS login |
| Workstream | Frontend |
| Task Category | Auth UI/form |
| Repository/App | `apps/cms` |
| Status | Implemented — verification incomplete |
| Priority | Security-sensitive |
| Suggested Size | Medium |
| Depends On | `fe/04-theme-design-system`, `fe/06-auth-state` |
| Blocks | `fe/08-route-guard` |
| Execution Order | 7 |

**Contract Status:** Ready.

**Execution Status:** Implemented and verified; browser verification and human visual review remain pending.

## 2. Outcome
Implement `/login` with email/password form, Zod validation, auth-state submission, safe errors, sanitized return navigation, and accessible responsive states.

## 3. Context
Backend OpenAPI defines exact login request/response. Current Login view is placeholder only. No username, social login, remember-me, or forgot-password contract exists.

## 4. Dependencies
Needs minimal UI foundation and Pinia auth state. Uses existing Zod/Vue/Tailwind.

## 5. In Scope
- Fields `email`, `password`.
- Idle, invalid, submitting, auth failure, rate limited, network failure, safe unexpected error, success states.
- Duplicate-submit prevention, labels, autocomplete, keyboard submit, focus/error association, responsive layout.
- Success updates auth state and navigates to sanitized return target or `/`; authenticated `/login` goes `/`.

## 6. Out of Scope
Username, social login, remember-me, forgot password, marketing layout, invented copy, account enumeration, and backend changes.

## 7. Existing Implementation
`apps/cms/src/views/LoginView.vue` now provides the email/password form, Zod validation, auth-store submission, safe error states, sanitized return navigation, authenticated redirect, and responsive accessible states. `apps/cms/tests/login-page.test.ts` covers validation, submission, duplicate prevention, failure messaging, safe redirects, and authenticated redirects.

## 8. Implementation Requirements
Use email/password exact schema. Password is never trimmed or logged. Backend remains authoritative. Use concise neutral functional copy and do not reveal account existence.

## 9. Applicable Contracts
**API:** `POST /api/v1/auth/login`; body `{ email, password }`; token response; `400`, `401`, `413`, `429`, `500` safe errors.

**Route:** `/login` public; authenticated access redirects `/`.

**UI:** consume `fe/04`; no marketing treatment.

## 10. File Impact
Expected Modify: Login view/form, auth integration, tests, styles. Expected Not Modified: backend, dependencies, and future auth features.

## 11. Runtime Behavior
Open `/login` → validate fields → submit once → auth state updates → safe return target or `/`; failure shows contextual safe state.

## 12. Error And Edge Cases
Invalid input, duplicate submission, 401, 429, network/timeout, unexpected safe error, authenticated visit, unsafe return target, keyboard-only use, and narrow viewport.

## 13. Security Requirements
No password/token leakage, account enumeration, unsafe redirect, or client authorization claim.

## 14. Test Requirements
Validation/submission/loading/disabled/error/success/authenticated redirect/returnTo sanitization/accessibility tests. Browser verify responsive form and keyboard/focus/error states.

## 15. Task-Level Expected Results
- Exact backend login request is used.
- Login UI is usable and safe.
- Return navigation is same-origin/application-relative.

## 16. Acceptance Criteria
- [x] Only email/password fields exist.
- [x] Zod and backend validation states are distinct and safe.
- [x] Duplicate submission is prevented.
- [x] Success updates auth state and navigates safely.
- [ ] Required UI/accessibility states pass.

## 17. Anti-Slop Requirements
Primary `frontend-patterns`; optional `ui-styling`; final `antislop`, `antislop-ui`, `antislop-human`, `antislop-layoutmobile`, `browser-verification`, `verification-loop`. Copy audit only if copy changes materially.

## 18. Validation Requirements
Focused/full tests, lint, typecheck, build, UI audits, browser verification, `git diff --check`, and secret review.

## 19. Completion Evidence
`LoginView.vue` sends `{ email, password }` through the Pinia auth store, preserves password input without trimming, prevents duplicate submits, maps safe `401`/`429`/network/timeout errors, focuses invalid fields, and restricts return navigation to application-relative paths. `bun run test` passes 32 tests; lint, typecheck, build, and diff checks pass. Browser verification and human visual review remain NOT RUN/PENDING.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
None. Product decisions previously open are explicitly resolved by this contract.

## 22. Definition Of Done
Login implementation, tests, browser evidence, Anti-Slop, static checks, safe redirect proof, diff/secret review, and human review complete.
