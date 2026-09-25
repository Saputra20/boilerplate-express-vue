# fe/09-permission-guard — RBAC UX Foundation / Permission Guard

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/09-permission-guard` |
| Batch | N/A |
| Owning Feature | CMS RBAC-ready UX |
| Workstream | Frontend |
| Task Category | Authorization UX |
| Repository/App | `apps/cms` |
| Status | Implemented — verification incomplete |
| Priority | Security-sensitive |
| Suggested Size | Medium |
| Depends On | `fe/06-auth-state`, `fe/08-route-guard`, `be/25-authenticated-rbac-context` |
| Blocks | `fe/10-ux-states` |
| Execution Order | 9 |

**Contract Status:** Ready.

**Execution Status:** Implemented against approved `GET /api/v1/me`. Automated tests and static checks pass. Browser denied-state verification and human review remain pending.

## 2. Outcome
Provide one frontend RBAC UX boundary capable of consuming backend user → role → permission → action data, filtering navigation/actions, and rendering denied state without becoming authorization authority.

## 3. Context
Backend exposes approved `GET /api/v1/me` with `{ user: { id, email }, roles, permissions }`. Permission keys and role codes come from backend response; API authorization remains server-side.

## 4. Dependencies
Depends on auth state/route guard and completed `be/25-authenticated-rbac-context`.

## 5. In Scope
- Typed frontend shape for roles/effective permissions without actual names/keys.
- One `can(permission)`-equivalent boundary.
- Typed route metadata support for `requiresAuth` and optional `requiredPermission`.
- Navigation/action filtering: no requirement show; granted show; missing required permission hide by default.
- Dedicated authenticated denied/403-style state; never redirect permission denial to login.
- Fixture-only tests cover generic UX filtering and route metadata; `/api/v1/me` remains the backend contract source.

## 6. Out of Scope
Backend endpoint, permission keys, role names, admin/super-admin bypass, JWT decoding workaround, real profile hydration, business modules, and API authorization changes.

## 7. Existing Implementation
`apps/cms/src/stores/auth.ts` hydrates identity, roles, and effective permissions from `/api/v1/me`. `auth.can(permission)` is the single permission boundary. Navigation filtering, route metadata, and denied UX are implemented.

## 8. Implementation Requirements
Frontend checks are UX only. Use exact backend permission keys only after approved contract supplies them. Do not infer authoritative permissions from JWT claims, hidden links, Pinia state, or route visibility.

## 9. Applicable Contracts
**Backend RBAC:** `users → user_roles → roles → role_permissions → permissions`; permission code format is backend-validated, but no concrete keys are approved for CMS.

**Backend Context Contract:** `GET /api/v1/me` returns frontend-safe identity, role codes, and effective permission codes. Backend remains enforcement authority.

**UI Contract:** hide unavailable navigation/actions by default; authenticated missing permission renders denied state, not login.

## 10. File Impact
Expected Modify/Create: frontend types/state/helper, route/navigation metadata support, denied state, fixtures/tests only after backend contract exists. Expected Not Modified: backend modules, schema, migrations, dependencies, and permission catalog.

## 11. Runtime Behavior
Approved profile/permission source loads → frontend state receives values → `can()` filters UX → API still enforces → backend `403` renders denied state → no client bypass.

## 12. Error And Edge Cases
Missing source, unknown permission, stale state, denied route/action, API `401/403`, and profile load failure require safe UX. No invented fallback grant.

## 13. Security Requirements
API is authorization authority. No admin bypass, role shortcut, JWT authorization workaround, or client-only access enforcement.

## 14. Test Requirements
Fixture-based tests for `can`, navigation filtering, route metadata, granted/denied/unknown, denied state, and server `403`. Label fixtures as non-backend integration until contract exists.

## 15. Task-Level Expected Results
- Single RBAC UX boundary exists.
- Backend gap is explicit and localized.
- No roles/permission keys or endpoint are invented.

## 16. Acceptance Criteria
- [x] `be/25-authenticated-rbac-context` endpoint and response contract is implemented and approved.
- [x] `can()`-equivalent boundary is singular and typed.
- [x] Navigation/action default filtering is hide-on-denied.
- [x] Denied state is distinct from unauthenticated login.
- [x] API authorization authority is explicit in docs/tests.

## 17. Anti-Slop Requirements
Primary `frontend-patterns`; `security-review` required; final `tdd-workflow`, `code-review`, `antislop`, `antislop-human`, `browser-verification` when rendered, and `verification-loop`.

## 18. Validation Requirements
Contract review, focused/full tests, lint, typecheck, build, security review, Anti-Slop, browser denied-state verification when unblocked, and `git diff --check`.

## 19. Completion Evidence
`GET /api/v1/me` is consumed by the CMS API client and auth store. Navigation filtering, denied route handling, and generic fixture tests are implemented. Browser verification and human review remain pending.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
None. Backend context contract is implemented and approved.

## 22. Definition Of Done
Backend contract approved, frontend UX boundary implemented, fixture/integration distinction documented, tests/security review/static checks/Anti-Slop pass, browser verification recorded, and human review complete.
