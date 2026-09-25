# fe/06-auth-state — Authentication And Session State

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/06-auth-state` |
| Batch | N/A |
| Owning Feature | CMS authentication/session |
| Workstream | Frontend |
| Task Category | Authentication |
| Repository/App | `apps/cms` |
| Status | Implemented — verified |
| Priority | Security-sensitive |
| Suggested Size | Medium |
| Depends On | `fe/05-api-client` |
| Blocks | `fe/07-login-page`, `fe/08-route-guard`, `fe/09-permission-guard` |
| Execution Order | 6 |

**Contract Status:** Ready.

**Execution Status:** Implemented and verified; browser auth-flow verification remains pending until rendered auth UI exists.

## 2. Outcome
Create Pinia auth/session state for login, one-time restoration, single-flight refresh, current/logout-all, safe cleanup, and RBAC-ready user/role/permission shape without fabricating values.

## 3. Context
Backend returns access/refresh tokens in JSON and accepts refresh JSON. Backend exposes login, refresh, logout, and logout-all only; no current-user/effective-permission endpoint exists.

## 4. Dependencies
Depends on API client. Uses Pinia and browser `sessionStorage`; no new dependency.

## 5. In Scope
- In-memory access token only.
- `sessionStorage` refresh token for current session, explicitly not equivalent to Secure HttpOnly cookies.
- Initial restoration: no refresh token unauthenticated; token triggers one refresh; success rotates stored token; failure clears session.
- Single-flight refresh; waiters share one operation; refresh endpoint never recursively refreshes.
- Current logout and logout-all; always clear local state safely.
- Structurally typed current user, roles, effective permissions without fabricated values.

## 6. Out of Scope
LocalStorage/IndexedDB access-token persistence, invented profile endpoint, JWT claim authorization, role names, permission keys, backend changes, and opaque auth/permission guard combination.

## 7. Existing Implementation
`apps/cms/src/stores/auth.ts` provides Pinia auth/session state, one-time restoration, single-flight refresh, login, current logout, logout-all, memory-only access-token state, and `sessionStorage` refresh-token rotation. `apps/cms/src/main.ts` starts restoration before app mount. `apps/cms/tests/auth-store.test.ts` covers lifecycle and failure behavior. No profile or permission endpoint is fabricated.

## 8. Implementation Requirements
Use actual token response and endpoints. Never persist access token. `sessionStorage` refresh persistence follows current JSON backend contract and must document weaker security than Secure HttpOnly cookie transport. Do not render protected content authenticated before restoration resolves.

## 9. Applicable Contracts
**API:** login/refresh token response; refresh request; logout/logout-all bearer `204`; 401 invalid auth/refresh.

**Session Contract:** access token memory; refresh token `sessionStorage`; single-flight refresh; clear on failure/logout.

**RBAC Contract:** state may expose user/roles/effective permissions only when approved backend source exists; current source is absent.

## 10. File Impact
Expected Create/Modify: Pinia auth store/service, API integration, tests. Expected Not Modified: backend, manifests, permission endpoint, and route guards.

## 11. Runtime Behavior
App starts → restoration pending → one refresh if stored token exists → authenticated or unauthenticated → requests use memory access token → eligible 401s share refresh → failure clears state → logout clears state.

## 12. Error And Edge Cases
Missing/expired/replayed refresh, concurrent 401s, refresh endpoint 401, network failure, logout failure, reload, and multiple tabs require deterministic cleanup tests. Multi-tab uses native browser sync only if needed.

## 13. Security Requirements
No access token in storage. No raw token logging. SessionStorage limitation documented. API remains auth/RBAC authority; JWT snapshots do not grant permissions.

## 14. Test Requirements
Login state, restoration no-token/token/success/failure, rotation, single-flight refresh, recursion prevention, logout current/all cleanup, failure cleanup, and secret non-disclosure.

## 15. Task-Level Expected Results
- Auth lifecycle is typed and centralized in Pinia.
- Refresh storms are prevented.
- RBAC-ready shape exists without invented identity/roles/permissions.

## 16. Acceptance Criteria
- [x] Access token is memory-only.
- [x] Refresh token uses current JSON transport and `sessionStorage`.
- [x] Restoration and refresh are single-flight and failure-safe.
- [x] Logout current/all clear local state.
- [x] No fabricated profile/permission values or JWT authorization workaround.

## 17. Anti-Slop Requirements
Primary `frontend-patterns`; `security-review` required; final `tdd-workflow`, `code-review`, `antislop`, `verification-loop`. Browser verification applies to rendered auth flows.

## 18. Validation Requirements
Focused/full tests, lint, typecheck, build, security review, Anti-Slop, browser auth-flow verification when UI exists, and `git diff --check`.

## 19. Completion Evidence
`apps/cms/src/stores/auth.ts` consumes the existing API client, keeps access tokens in memory, stores only the refresh token under `sessionStorage`, performs one-time restoration, shares concurrent refreshes, prevents refresh recursion, rotates refresh tokens, and clears state on refresh/logout failure. `apps/cms/tests/auth-store.test.ts` passes 9 focused tests; full CMS tests pass 27 tests; lint, typecheck, and build pass. RBAC data remains absent and owned by `fe/09`.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
None for approved auth policy. Backend current-user/effective-permission source is not an auth-state implementation blocker; it is localized to `fe/09`.

## 22. Definition Of Done
Pinia lifecycle, tests, security review, static checks, Anti-Slop, applicable browser evidence, diff/secret review, and human review complete.
