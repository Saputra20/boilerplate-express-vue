# fe/03-cms-layout — CMS Application Shell

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/03-cms-layout` |
| Batch | N/A |
| Owning Feature | CMS Auth + RBAC-ready shell |
| Workstream | Frontend |
| Task Category | UI architecture |
| Repository/App | `apps/cms` |
| Status | Implemented — verification incomplete |
| Priority | Foundation |
| Suggested Size | Medium |
| Depends On | `fe/02-environment-validation` |
| Blocks | `fe/04-theme-design-system`, `fe/07-login-page`, `fe/08-route-guard` |
| Execution Order | 3 |

**Contract Status:** Ready.

**Execution Status:** Implemented; browser verification and human visual review remain pending.

## 2. Outcome
Provide neutral CMS shell/template with `/login`, `/`, catch-all Not Found, configuration-driven navigation, and responsive sidebar/drawer. No future business modules.

## 3. Context
Current CMS already contains router, shell components, Home/Login/NotFound views, and Home navigation from approved implementation. Backend remains authorization authority; `fe/08` owns authentication enforcement and `fe/09` owns permission UX.

## 4. Dependencies
`fe/02` is complete. Use `frontend-patterns`, `ui-styling`, and conditional UI audits. No API or permission endpoint is required by this task.

## 5. In Scope
- Public `/login`, authenticated-intent `/`, and catch-all Not Found.
- `AppShell` with Sidebar, Header, Main, and `RouterView`.
- Persistent sidebar at Tailwind `md+`; temporary mobile drawer below `md`.
- Accessible trigger, Escape close, destination close, focus behavior, no overflow, and background inertness.
- Configuration-driven navigation containing only existing `Home → /`.
- Minimal neutral root content and Not Found state.
- Minimal route metadata for later auth/permission tasks; no enforcement or permission resolution.

## 6. Out of Scope
Future modules/routes, login form, auth/session state, auth guard, permission resolution, permission policy, business permissions, profile/search/notifications, branding, dark mode, custom typography, metrics, fake data, API integration, and UI library additions.

## 7. Existing Implementation
`src/router/index.ts`, `src/components/AppShell.vue`, `AppHeader.vue`, `AppNavigation.vue`, `src/navigation.ts`, neutral views, styles, and shell tests exist. Current navigation has only Home. No auth or RBAC behavior exists.

## 8. Implementation Requirements
Use semantic landmarks, visible focus, logical tab order, active indication beyond color, practical mobile touch targets, reduced-motion consideration, and WCAG 2.2 AA target. Use Tailwind defaults and verify 375px, 768px, 1024px, 1440px. Do not invent product routes or permission keys.

## 9. Applicable Contracts
**Route Contract:** `/login` public; `/` authenticated-intent; catch-all Not Found; future CMS descendants protected by `fe/08`.

**UI Contract:** neutral professional shell; Home-only navigation; responsive sidebar/drawer; minimal header; no future modules.

**API/Database/Configuration Contracts:** No API/database change; existing `VITE_API_BASE_URL` only.

## 10. File Impact
Expected Modify/Create: CMS router, shell/views/navigation/styles/tests only. Expected Not Modified: `apps/api`, database, dependencies, manifests, and future modules.

## 11. Runtime Behavior
Bootstrap installs router → `/login` renders public placeholder → `/` renders shell and neutral Home → unknown URL renders Not Found → auth enforcement waits for `fe/08` → permission filtering waits for `fe/09`.

## 12. Error And Edge Cases
Unknown route never silently redirects to `/`; drawer closes on Escape and destination selection; background main is inert while drawer is open; no internal route/debug details are exposed.

## 13. Security Requirements
Shell visibility is UX only. Do not use navigation visibility as authorization. Do not add admin bypass, role checks, permission keys, or JWT authorization logic.

## 14. Test Requirements
Test routes, shell landmarks, Home navigation, neutral content, Not Found, drawer open/close, Escape, focus, selection close, and inert main. Browser verify responsive layout, keyboard behavior, overflow, and Not Found.

## 15. Task-Level Expected Results
- Neutral shell exists and accepts future modules.
- Navigation is configuration-driven and RBAC-ready without implementing RBAC.
- Auth and permission ownership remains separated.

## 16. Acceptance Criteria
- [x] `/login`, `/`, and catch-all Not Found exist without business routes.
- [x] Shell has Sidebar, Header, Main, and RouterView.
- [x] Navigation contains only Home and is configuration-driven.
- [x] Mobile drawer behavior and keyboard safeguards exist.
- [x] Root content is neutral; no fake business content exists.
- [x] Auth and permission enforcement remain delegated.
- [ ] Browser verification at required viewports is complete.

## 17. Anti-Slop Requirements
Primary `frontend-patterns`; `ui-styling` for Tailwind; final `antislop`, `antislop-ui`, `antislop-human`, `antislop-layoutmobile`, `browser-verification`, `verification-loop`. No `design-system` activation unless `fe/04` changes tokens.

## 18. Validation Requirements
Lint, typecheck, focused/full tests, build, Anti-Slop, `git diff --check`, and browser verification. Browser status must be PASS/NOT RUN truthfully.

## 19. Completion Evidence
Current source and tests satisfy implementation criteria; lint/typecheck/tests/build pass. Browser verification is NOT RUN because browser tooling is unavailable. Human visual review remains pending.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
None. Browser verification is the only remaining execution gate.

## 22. Definition Of Done
Browser evidence at required viewports, Anti-Slop audits, static checks, tests, build, diff/secret/scope review, and human review complete.
