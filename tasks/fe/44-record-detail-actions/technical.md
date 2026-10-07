# fe/44-record-detail-actions — Consistent detail actions

## 1. Metadata

| Field           | Value                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Task ID         | `fe/44-record-detail-actions`                                                                                      |
| Batch           | N/A                                                                                                                |
| Owning Feature  | CMS record lists                                                                                                   |
| Workstream      | Frontend                                                                                                           |
| Task Category   | Detail navigation and UI                                                                                           |
| Repository/App  | `apps/cms`                                                                                                         |
| Status          | Approved by current human request                                                                                  |
| Priority        | Normal                                                                                                             |
| Suggested Size  | Medium, scoped to three list surfaces and two detail pages                                                         |
| Depends On      | Existing Role, User, and Audit Trail read APIs; `fe/19-role-form-dedicated-page`; `fe/20-user-form-dedicated-page` |
| Blocks          | N/A                                                                                                                |
| Execution Order | After existing list and detail implementations                                                                     |

## 2. Outcome

Roles, Users, and Audit Trail list rows expose a consistent, keyboard-accessible View details action. Role and User details have dedicated read-only routes; Audit Trail uses its existing detail route.

## 3. Context

- Current human instruction requests detail actions for Roles, Users, and Audit Trail to improve the CMS experience.
- `AGENTS.md` requires dedicated routed detail pages for explicitly reworked record workflows. Current Users detail uses a modal; current Roles have no detail route; Audit Trail already has `/audit-trail/:id`.
- Existing `role.read`, `user.read`, and `audit.read` routes and API methods are the authority for access. `docs/DESIGN.md` and current CMS list/detail components supply visual conventions.
- Existing FE/19 and FE/20 task documents own Create/Edit behavior; this task changes only detail navigation and presentation.

## 4. Dependencies

Current authenticated CMS shell, route guard, `getRole`, `getUser`, and `getAuditEvent` API client methods. No backend, database, or new dependency.

## 5. In Scope

- Add a visible eye-icon View details action with an accessible name to each Roles, Users, and desktop Audit Trail row.
- On the Audit Trail mobile row, provide a clear text View details link alongside the existing event label link.
- Add `/roles/:id` and `/users/:id` read-only detail routes guarded by `role.read` and `user.read` respectively.
- Replace the Users detail modal with navigation to the User detail route; make Role name and User email open their detail routes, matching the existing Audit Trail event-label link.
- Display only fields already available in approved Role and User detail responses, with loading, not-found, denied/error, and retry states.
- Provide a predictable Back to Roles/Users link on each new detail page. Preserve current list Create/Edit/Delete actions and Audit Trail detail behavior.

## 6. Out of Scope

Backend/API or permission changes, new fields, detail edit/delete controls, list filters/pagination/sorting, Audit Trail detail redesign, shared generic detail framework, and migrations.

## 7. Existing Implementation

- `apps/cms/src/views/RoleView.vue`, `UserView.vue`, `AuditTrailView.vue`, `AuditEventDetailView.vue` — current list/detail surfaces.
- `apps/cms/src/router/index.ts` — authenticated routes and permission metadata.
- `apps/cms/src/api/client.ts`, `types.ts` — existing typed Role/User/Audit read calls and safe response fields.
- `apps/cms/src/components/CmsIcon.vue`, `components/ui/`, `FeedbackState.vue` — existing UI primitives.
- `apps/cms/tests/role-page.test.ts`, `user-page.test.ts`, `audit-page.test.ts`, `router-guard.test.ts` — current behavior evidence.

## 8. Implementation Requirements

1. Use actual links for detail navigation, with 44px minimum hit targets, visible focus, and per-row accessible labels. Do not make entire rows clickable.
2. Keep Role and User read routes under the existing authenticated shell, with `role.read` / `user.read` guards. Backend RBAC remains authoritative.
3. Load each detail by route ID through the existing GET client method. Do not trust list-row data as complete detail and do not fetch the permission catalog or role list for read-only detail.
4. Role detail shows name, code, description when present, permission codes, and existing creation/update timestamps. Protected Admin remains viewable under `role.read`.
5. User detail shows the fields already in its current detail modal: email, status, role, email verification, last login, creation date, and first-login password-change requirement. Do not show credentials, hashes, tokens, or deleted data.
6. Preserve stable layout on loading and failure. A 404 presents Not found with Back; retriable failures show Retry. Direct URL, refresh, back/forward, and list return must work.
7. Audit Trail detail route, authorization, projections, and label link remain. Add the action affordance only.

## 9. Applicable Contracts

**Configuration:** Not applicable — no new configuration.

**API:** Existing authenticated `GET /api/v1/roles/:id` requires `role.read`; `GET /api/v1/users/:id` requires `user.read`; `GET /api/v1/audit-events/:id` requires `audit.read`. No request/response/status change.

**Database:** Not applicable — no schema or query changes.

**UI:** Role/User/Audit list action is View details; Role/User detail are dedicated read-only pages; Audit detail remains current page. Applicable loading, success, denied/error, not-found, focus, responsive, and mobile states must be usable.

## 10. File Impact

**Expected Create:** `RoleDetailView.vue`, `UserDetailView.vue`, this task's documents.

**Expected Modify:** CMS router; Role, User, Audit list views; focused existing CMS tests where needed.

**Expected Not Modified:** API/backend, database, auth/permissions, Role/User forms, Audit detail, package manifests. Paths are guidance; verify before edits.

## 11. Runtime Behavior

List loads under its existing read guard. A View details link opens the matching guarded detail route. The detail page loads by ID, renders safe data, or presents the appropriate failure. Back returns to the relevant list route. Existing Edit/Delete actions continue independently.

## 12. Error And Edge Cases

| Scenario                                   | Expected result                | Security / Recovery          |
| ------------------------------------------ | ------------------------------ | ---------------------------- |
| Direct route without read permission       | Existing denied route          | No client bypass             |
| Missing/deleted ID or API 404              | Not-found state and Back link  | No stale row fallback        |
| Network/server failure                     | Safe error with Retry and Back | No sensitive diagnostic text |
| Empty permission list or missing user role | Plain empty text               | No fabricated values         |

## 13. Security Requirements

Keep existing route guards and backend RBAC. Render only typed approved response fields. Do not expose credential or audit metadata, broaden permissions, or infer identity from mutable list state.

## 14. Test Requirements

Happy Path: each action opens its detail route; safe fields display. Validation: direct-route IDs use existing client validation. Negative/Failure: 404, permission denial, and retry. Security: no secrets and read guard. Regression: existing Create/Edit/Delete/list behavior. Isolation: deterministic API mocks and route state.

## 15. Task-Level Expected Results

Three lists have consistent detail affordances; two new read-only detail pages and routes exist; User detail modal is removed; Audit existing detail works unchanged.

## 16. Acceptance Criteria

- [ ] Every list row in Roles, Users, and Audit Trail exposes a labeled View details action.
- [ ] Role/User details open via direct, guarded, refreshable routes and display approved data.
- [ ] Loading, not-found, denied/error, retry, and Back states work on both new pages.
- [ ] Existing list Create/Edit/Delete and Audit detail behavior remain intact.
- [ ] Keyboard/focus and desktop/mobile layouts remain usable without page overflow.

## 17. Anti-Slop Requirements

Code Anti-Slop: no generic CRUD/detail abstraction, duplicate API call, dead modal state, fake content, hidden TODO, or unnecessary dependency. UI Anti-Slop: no extra cards or decorative actions, one clear primary heading, truthful empty/error states, consistent action order and labels, visible focus, 44px targets, and mobile reflow. Browser verification required for meaningful UI.

## 18. Validation Requirements

Static: CMS ESLint, TypeScript, formatting, `git diff --check`. Automated Tests: focused component/router evidence when authorized. Build: CMS build. UI: rendered desktop/mobile navigation and states. Anti-Slop: code, UI, human/accessibility, and mobile audits.

## 19. Completion Evidence

AC1 → list source and rendered action inspection. AC2–3 → route/detail source, focused interaction evidence, direct-route browser inspection. AC4 → changed-file review and regression evidence. AC5 → desktop/mobile and keyboard inspection. All → static/build/Anti-Slop results and `git diff --check`.

## 20. Traceability

| Trace Type          | References                                                                       |
| ------------------- | -------------------------------------------------------------------------------- |
| PRD                 | N/A                                                                              |
| Feature             | Role, User, Audit Trail read UI                                                  |
| Requirement         | Current human detail-action instruction; `AGENTS.md` route-based record workflow |
| Acceptance Criteria | This document AC1–5                                                              |
| API Operation       | Existing Role/User/Audit GET detail operations                                   |
| Database            | N/A                                                                              |
| Test IDs            | Existing CMS Role/User/Audit/router suites                                       |
| Design/Figma        | Existing CMS list/detail visual system                                           |

## 21. Open Points

None — existing read APIs and route rule determine the detail behavior.

## 22. Definition Of Done

- [ ] Scope and acceptance criteria satisfied; focused behavior evidence reviewed.
- [ ] Code/UI Anti-Slop, lint, typecheck, applicable tests/build/browser checks pass.
- [ ] `git diff --check`, changed-file/secret review, and unrelated-change preservation confirmed.
