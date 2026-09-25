# fe/08-route-guard — Authentication Route Guard

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/08-route-guard` |
| Batch | N/A |
| Owning Feature | CMS authentication routing |
| Workstream | Frontend |
| Task Category | Routing/security |
| Repository/App | `apps/cms` |
| Status | Implemented — verification incomplete |
| Priority | Security-sensitive |
| Suggested Size | Small |
| Depends On | `fe/06-auth-state`, `fe/07-login-page` |
| Blocks | `fe/09-permission-guard` |
| Execution Order | 8 |

**Contract Status:** Ready.

**Execution Status:** Implemented and verified; browser critical-flow verification and human review remain pending.

## 2. Outcome
Enforce authentication routing for `/login`, `/`, and future CMS descendants without combining authentication and permission authorization.

## 3. Context
Router and minimal route metadata exist; no guard exists. Backend auth validates bearer tokens; API remains security authority.

## 4. Dependencies
Needs auth restoration/state and login route. Uses Vue Router; no new dependency.

## 5. In Scope
- Public `/login`.
- Protected `/` and future CMS descendants by default unless explicitly public.
- Wait for initial restoration before redirect.
- Unauthenticated protected access to `/login?returnTo=<safe-relative-location>`.
- Authenticated `/login` to `/`.
- Same-origin/application-relative returnTo validation.

## 6. Out of Scope
Permission checks, 403 behavior, role logic, business routes, token storage, auth API implementation, and login form.

## 7. Existing Implementation
`apps/cms/src/router/index.ts` installs an authentication-only `beforeEach` guard. `apps/cms/src/router/return-to.ts` rejects external, protocol-relative, malformed, control-character, and backslash return targets. `apps/cms/src/main.ts` installs the guard with the Pinia auth store before mounting the app. `apps/cms/tests/router-guard.test.ts` covers restoration, protected/public access, authenticated login, permission separation, and sanitization.

## 8. Implementation Requirements
Do not redirect while restoration is unresolved. Reject absolute, protocol-relative, external, malformed, or unsafe return targets. Authenticated permission denial goes to `fe/09`, not login.

## 9. Applicable Contracts
**Route:** `/login` public; `/` and future CMS descendants protected by default.

**Auth:** restoration state from `fe/06`; bearer/API authority remains backend.

**UI:** loading/redirect state uses `fe/10` only where actual repetition exists.

## 10. File Impact
Expected Modify: router guard/meta, returnTo helper, tests. Expected Not Modified: backend, permission guard, dependencies, and business routes.

## 11. Runtime Behavior
Navigation starts → wait restoration → authenticated protected route proceeds → unauthenticated protected route redirects safe returnTo → authenticated `/login` redirects `/` → permission denial remains separate.

## 12. Error And Edge Cases
Initial restoration pending, refresh failure, direct protected URL, authenticated login, unsafe returnTo, unknown route, and concurrent navigation.

## 13. Security Requirements
Guard is UX routing plus backend enforcement, not sole security boundary. No open redirects, role bypass, or JWT permission inference.

## 14. Test Requirements
Route access, restoration pending, unauthenticated redirect, safe/unsafe returnTo, authenticated login, refresh failure, unknown route, and distinction from permission denial.

## 15. Task-Level Expected Results
- Authentication routing is explicit and separate from RBAC.
- Unsafe redirects are rejected.
- Initial restoration is respected.

## 16. Acceptance Criteria
- [x] Public/protected routes follow contract.
- [x] Restoration blocks premature redirect.
- [x] ReturnTo is safe-relative only.
- [x] Authenticated `/login` redirects `/`.
- [x] Permission denial is not converted to login.

## 17. Anti-Slop Requirements
Primary `frontend-patterns`; `security-review` applicable; final `tdd-workflow`, `antislop`, `verification-loop`, and browser verification when rendered.

## 18. Validation Requirements
Focused/full tests, lint, typecheck, build, security review, Anti-Slop, browser critical-flow verification, and `git diff --check`.

## 19. Completion Evidence
The router guard awaits auth restoration, protects routes marked `requiresAuth`, redirects unauthenticated users to `/login` with sanitized `returnTo`, redirects authenticated `/login` visits to `/`, and ignores permission metadata. `bun run test` passes 43 tests; lint, typecheck, build, and diff checks pass. Browser critical-flow verification and human review remain NOT RUN/PENDING.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
None. Auth vs permission boundary is resolved.

## 22. Definition Of Done
Guard, safe redirect tests, auth/permission separation proof, static checks, security review, applicable browser evidence, and human review complete.
