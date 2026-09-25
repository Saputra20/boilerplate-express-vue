# fe/13-tailadmin-ui-foundation — TailAdmin UI Foundation

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `fe/13-tailadmin-ui-foundation` |
| Batch | N/A |
| Owning Feature | CMS TailAdmin visual foundation |
| Workstream | Frontend |
| Task Category | UI foundation |
| Repository/App | `apps/cms` |
| Status | Implemented — verification incomplete |
| Priority | High |
| Suggested Size | Large — split implementation if review becomes too broad |
| Depends On | `fe/12-frontend-quality-gate` |
| Blocks | `fe/14-category-crud`, `fe/15-role-crud`, `fe/16-user-management`, `fe/17-dashboard-summary` |
| Execution Order | 13 |

## 2. Outcome

Provide one TailAdmin Vue-compatible visual foundation for existing CMS routes without changing authentication, API, Router, Pinia, RBAC, or backend behavior.

## 3. Context

TailAdmin Vue demo is the sole visual reference. Existing CMS contracts are limited to authentication, session restoration, `/api/v1/me`, shell, home, denied, and 404. Business CRUD contracts are separate dependency-gated tasks.

## 4. Dependencies

Existing Vue 3, Vite, TypeScript, Tailwind, Vue Router, Pinia, Axios, Zod, and auth/RBAC state. No new dependency is approved by this task.

## 5. In Scope

- TailAdmin-style login composition using existing auth behavior.
- Authenticated shell, responsive sidebar, header, page container, breadcrumbs, and page header.
- Business-agnostic card, button, input, password input, select, checkbox, badge, table, pagination, dropdown, modal, loading, empty, and error primitives.
- Existing navigation configuration and permission filtering.
- Home visual shell with no fabricated metrics.
- Desktop, tablet, mobile, keyboard, focus, and dark-mode behavior where existing foundation supports it.

## 6. Out of Scope

Category, role, user, or dashboard API behavior; business fields; permission catalog changes; fake metrics; demo routes; mock authentication; new dependencies; backend/database changes.

## 7. Existing Implementation

Inspect `apps/cms/src/components/`, `apps/cms/src/views/`, `apps/cms/src/router/`, `apps/cms/src/navigation.ts`, `apps/cms/src/stores/auth.ts`, `apps/cms/src/styles.css`, and `apps/cms/tests/` before editing.

## 8. Implementation Requirements

Adapt TailAdmin patterns instead of inventing a parallel design system. Keep component behavior in Vue modules, transport in the API client, shared auth in Pinia, and authorization in the backend. Do not add navigation entries without approved routes.

## 9. Applicable Contracts

**API Contract:** Existing login, logout, session, and `GET /api/v1/me` contracts only. No new endpoint.

**UI Contract:** Existing routes render through one responsive shell; shared primitives expose visual behavior without business data assumptions.

## 10. File Impact

Expected Modify/Create: existing CMS shell, login, styles, shared UI components, focused tests. Expected Not Modified: `apps/api/**`, database, package manifests, lockfiles, auth/RBAC contracts.

## 11. Runtime Behavior

Public login renders TailAdmin-auth composition and uses existing submit/validation/error flow. Authenticated routes render shell and filtered approved navigation. Mobile navigation opens/closes accessibly. Home renders informational empty state when no approved metrics exist.

## 12. Error And Edge Cases

Auth failure keeps safe existing messages; permission denial keeps existing denied state; empty content never becomes fake data; unavailable API state remains contextual; narrow viewports avoid horizontal page overflow.

## 13. Security Requirements

Preserve session/token handling, safe redirects, backend authorization authority, permission vocabulary, and secret handling. Never display tokens or fabricate user data.

## 14. Test Requirements

Cover shell rendering, mobile drawer, sidebar collapse if implemented, theme control, profile/logout behavior, login states, accessible primitives, permission-filtered navigation, denied state, and no fabricated dashboard data.

## 15. Task-Level Expected Results

- Existing CMS pages share TailAdmin visual primitives.
- Auth and RBAC behavior remains unchanged.
- No business module or metric contract is guessed.
- Responsive behavior is implemented and separately browser-verified.

## 16. Acceptance Criteria

- [x] Login visually follows the approved TailAdmin-style authentication composition.
- [x] Existing authenticated routes render through a reusable responsive shell.
- [x] Sidebar, header, breadcrumbs, page container, and shared primitives are present.
- [x] Navigation still uses approved route and permission configuration.
- [x] Home uses an intentional informational state instead of fabricated metrics.
- [x] Desktop/tablet/mobile structure and dark-mode behavior are implemented where applicable.
- [x] Tests, lint, typecheck, build, and diff checks pass.
- [ ] Browser side-by-side review is complete; remains `NOT RUN — browser renderer unavailable`.

## 17. Anti-Slop Requirements

Use `frontend-patterns`, `ui-ux-pro-max`, `ui-styling`, `antislop`, `antislop-ui`, `antislop-human`, `antislop-layoutmobile`, `browser-verification`, and `verification-loop` according to registry routing. Reject copied demo pages, fake metrics, duplicate primitives, arbitrary spacing, inaccessible controls, and unused dependencies.

## 18. Validation Requirements

Static: CMS lint, typecheck, formatting, and `git diff --check`. Automated: focused and full CMS tests. Build: production build. UI: browser comparison at desktop/tablet/mobile when available. Review: scope, generated output, secrets, and changed files.

## 19. Completion Evidence

Evidence: `apps/cms/src/components/ui/`, `apps/cms/src/components/AppShell.vue`, `apps/cms/src/components/AppHeader.vue`, `apps/cms/src/components/AppNavigation.vue`, `apps/cms/src/views/LoginView.vue`, `apps/cms/src/views/HomeView.vue`, and `apps/cms/tests/ui-primitives.test.ts`. `bun run --cwd apps/cms test` passes 54 tests; typecheck, lint, build, and `git diff --check` pass. Browser comparison remains `NOT RUN — browser renderer unavailable`.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

- TailAdmin demo comparison requires browser verification.
- Business CRUD and real dashboard metrics remain separate dependency-gated work.

## 22. Definition Of Done

Foundation behavior and automated checks pass; no backend/application contract changes are invented; Anti-Slop checks run; browser fidelity status is truthful; diff and scope review pass; human review completes visual acceptance separately.
