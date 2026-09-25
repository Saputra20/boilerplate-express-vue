# fe/18-tailadmin-visual-rework — TailAdmin Visual Rework

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `fe/18-tailadmin-visual-rework` |
| Batch | N/A |
| Owning Feature | CMS TailAdmin visual implementation |
| Workstream | Frontend |
| Task Category | UI visual rework |
| Repository/App | `apps/cms` |
| Status | Ready for Planning — implementation contract requires visual review |
| Priority | High |
| Suggested Size | Large — shell, auth surface, shared primitives, responsive states, dark mode, and browser verification |
| Depends On | `fe/13-tailadmin-ui-foundation`, `fe/12-frontend-quality-gate` |
| Blocks | `fe/14-category-crud`, `fe/15-role-crud`, `fe/16-user-management`, `fe/17-dashboard-summary` visual integration |
| Execution Order | 18 |

## 2. Outcome

Replace the current CMS presentation with a materially different TailAdmin-inspired visual system in rendered browser output. The rework must visibly update shell navigation, header, login, home shell, shared primitives, responsive mobile navigation, and supported dark mode without changing authentication, API, Router, Pinia, or RBAC behavior.

## 3. Context

- `fe/13-tailadmin-ui-foundation` created reusable primitives and shell pieces but records browser comparison as `NOT RUN — browser renderer unavailable`.
- Existing CMS source is under `apps/cms/src/`; current primitives live under `apps/cms/src/components/ui/`.
- `apps/cms/src/styles.css` owns current CSS variables, Tailwind theme mappings, base styles, and light/dark tokens.
- Existing auth behavior lives in `apps/cms/src/views/LoginView.vue`, `apps/cms/src/stores/auth.ts`, and API client modules. It must remain behaviorally unchanged.
- Existing navigation and permission filtering live in `apps/cms/src/navigation.ts`, `AppNavigation.vue`, and auth state. Frontend permission state remains UX-only; backend remains authorization authority.
- Existing tests use Vitest and Vue Test Utils. Existing scripts provide test, lint, typecheck, format, and production build checks.
- TailAdmin Vue remains the primary visual direction. This task adapts visual patterns, not TailAdmin architecture or copied demo behavior.

## 4. Dependencies

- `fe/13-tailadmin-ui-foundation` supplies the shared component inventory and current shell baseline.
- `fe/12-frontend-quality-gate` supplies frontend static/test/build conventions.
- No backend or API dependency is required; no business CRUD or dashboard metric contract may be invented.
- Browser capability is required for final visual acceptance. If unavailable, completion must report visual verification `NOT RUN` and remain incomplete until human resolves the gate.

## 5. In Scope

- Visibly rework CMS sidebar, header, page container, page title/breadcrumb, login, and home/dashboard shell.
- Update actual presentation of `CmsCard`, `CmsButton`, `CmsInput`, `CmsPasswordInput`, `CmsSelect`, `CmsCheckbox`, `CmsBadge`, `CmsTable`, `CmsPagination`, `CmsDropdown`, `CmsModal`, `CmsLoadingState`, `CmsEmptyState`, and `CmsErrorState`.
- Establish consistent neutral palette, spacing, typography hierarchy, borders, radius, restrained shadows, focus states, hover states, disabled states, and dark-mode treatment.
- Implement usable mobile off-canvas/drawer navigation with overlay, close behavior, keyboard access, and no horizontal overflow.
- Preserve existing navigation configuration, permission filtering, auth submit/restore/logout behavior, routes, API contracts, and no-fake-data home behavior.
- Verify desktop, tablet, mobile, and supported dark-mode rendered output in browser.
- Add/update focused component and interaction tests without replacing browser evidence.

## 6. Out of Scope

- Backend/API/database changes, auth contract changes, permission additions, RBAC redesign, or business CRUD features.
- Category, role, user, or dashboard data screens.
- Fake metrics, fabricated charts, demo data, placeholder interactions presented as real behavior, or copied TailAdmin architecture.
- New UI dependencies, component-library replacement, generic CRUD abstraction, or alternative local primitives that duplicate existing components.
- New navigation items without approved routes and permissions.

## 7. Existing Implementation

- `apps/cms/src/components/AppShell.vue`: authenticated layout composition and responsive shell.
- `apps/cms/src/components/AppNavigation.vue`: navigation groups, active links, collapse/mobile behavior.
- `apps/cms/src/components/AppHeader.vue`: toggle, theme control, and profile menu composition.
- `apps/cms/src/components/CmsPageHeader.vue`: page title/breadcrumb presentation.
- `apps/cms/src/components/CmsProfileMenu.vue`: account dropdown/logout behavior.
- `apps/cms/src/views/LoginView.vue`: login form and existing auth flow.
- `apps/cms/src/views/HomeView.vue`: current home/dashboard shell and informational state.
- `apps/cms/src/components/ui/`: required shared primitives.
- `apps/cms/src/styles.css`: design tokens, Tailwind mappings, base/light/dark styles.
- `apps/cms/src/composables/useTheme.ts`: existing theme behavior.
- `apps/cms/tests/`: shell, login, auth, navigation, feedback, and primitive tests.
- `tasks/fe/13-tailadmin-ui-foundation/technical.md`: previous foundation contract and incomplete browser evidence.

## 8. Implementation Requirements

### 8.1 Visual direction

- Make rendered output visibly distinguishable from the current CMS, not only internally refactored.
- Use TailAdmin-inspired admin hierarchy: compact structured sidebar, clear active navigation, bordered/sticky header, spacious page container, restrained card elevation, polished controls, and consistent form/table states.
- Keep visual decisions coherent across login, shell, home, overlays, forms, and feedback states.
- Avoid gradients, excessive shadows, decorative badges, fake charts, arbitrary icons, visual noise, and copied demo sections without product purpose.

### 8.2 Shared primitives

- Reuse existing primitives in consuming views/components.
- Update their actual rendered classes/styles; tests alone do not prove visual completion.
- `CmsButton` must provide meaningful primary, secondary, danger, ghost, and any existing icon/loading variants with hover/focus/disabled states.
- `CmsInput` and password input must visibly distinguish default, focus, error, disabled, and password-reveal affordance states where existing behavior supports it.
- `CmsCard` must establish consistent padding, border, radius, surface, header/action layout, and light/dark treatment.
- `CmsTable` must define header, body, hover, borders, overflow, and empty-state presentation without forcing fake rows.
- `CmsDropdown` and `CmsModal` must have visible surface, border, shadow, overlay, focus, close, and dark-mode states.
- Loading, empty, and error primitives must look intentional and remain semantically accessible.
- Do not create replacement primitives for capabilities already covered by required components.

### 8.3 Shell and navigation

- Sidebar has visually distinct brand/header area, structured navigation groups, aligned icons, active state, hover state, collapse behavior where existing shell supports it, and mobile drawer behavior.
- Header has consistent border/surface treatment, sidebar toggle, theme toggle if supported, profile dropdown, and responsive spacing.
- Page container, page title, and breadcrumbs establish clear hierarchy and consistent max-width/padding.
- Mobile drawer must close on explicit close action and navigation selection; preserve focus visibility and avoid inaccessible hidden content.

### 8.4 Login and home

- Login becomes a centered, polished TailAdmin-inspired authentication composition with clear hierarchy, input states, password control, submit loading/disabled state, error/unavailable state, and dark-mode treatment.
- Preserve all existing login validation, restore, redirect, error mapping, and auth store behavior.
- Home becomes a deliberate dashboard shell using real available identity/context only. When metrics do not exist, show neutral informational/empty content; never fabricate metrics.

### 8.5 Responsive and dark mode

- Verify desktop, tablet, and mobile layouts at explicit viewport sizes selected in the browser evidence.
- Mobile sidebar is an actual usable off-canvas/drawer experience, not a desktop sidebar squeezed into a narrow viewport.
- Prevent page-level horizontal overflow; tables may use intentional bounded horizontal scrolling where required.
- Apply dark-mode tokens to all reworked surfaces, borders, text, controls, overlays, tables, and feedback states. No mixed light/dark component remnants.

### 8.6 Behavior preservation

- Do not change auth contracts, API calls, route names, Pinia state shape, permission vocabulary, or backend authorization assumptions.
- Frontend permission filtering may hide navigation only; it must not become security authority.
- Preserve keyboard navigation, labels, visible focus, semantic controls, dialog semantics, and accessible error messaging.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no new environment variable or dependency is approved.

### API Contract

Not applicable — existing login, session, identity-context, logout, and route contracts remain unchanged.

### UI Contract

| Surface | Required result |
| --- | --- |
| Sidebar | TailAdmin-inspired structured nav, active/hover/focus states, collapse/mobile drawer |
| Header | Border/surface hierarchy, toggle, theme control, profile dropdown |
| Page shell | Consistent container, spacing, title, breadcrumb, responsive behavior |
| Login | Centered auth card/layout, polished controls, unchanged auth behavior |
| Home | New shell with neutral real-content/empty state; no fake metrics |
| Primitives | Actual visual updates for all required components and states |
| Dark mode | Complete supported-theme treatment across reworked surfaces |
| Accessibility | Semantic controls, labels, keyboard/focus, dialog/drawer behavior, contrast |

## 10. File Impact

**Expected Create**

- New focused UI test files only if existing test files cannot cover changed visual/interactions.

**Expected Modify**

- `apps/cms/src/styles.css`.
- Existing shell/header/navigation/page-header/profile/login/home components.
- Existing required shared primitives under `apps/cms/src/components/ui/`.
- Relevant focused tests under `apps/cms/tests/`.

**Expected Not Modified**

- `apps/api/**`, database/migrations, auth/API contracts, backend RBAC, package manifests/lockfiles, and business feature views.

Expected paths are guidance; agent must inspect repository before finalizing changes.

## 11. Runtime Behavior

### Desktop/tablet

Authenticated routes render through reworked shell with visible hierarchy, stable sidebar/header behavior, and responsive container spacing. Existing route content and permission filtering remain intact.

### Mobile

Header toggle opens accessible drawer → overlay and drawer render above content → navigation selection or explicit close closes drawer → focus remains usable → route content remains readable without page overflow.

### Login

Existing login validation/submit/restore/error flow remains unchanged while visual composition changes materially.

### Theme

Existing theme toggle changes all reworked surfaces coherently between light and dark token sets.

### State surfaces

Loading, empty, error, disabled, hover, focus, and success/content states render through shared primitives where applicable without fabricated data.

## 12. Error And Edge Cases

| Scenario | Expected Result | Accessibility / Recovery |
| --- | --- | --- |
| Narrow mobile viewport | Drawer layout, no page overflow | Focusable controls remain reachable |
| Drawer open | Overlay and visible close control | Escape/close behavior follows existing implementation or approved enhancement |
| Permission-filtered nav | Only approved visible items render | Backend remains authority |
| Login validation error | Inline field/form error with visible focus | Screen reader-compatible association |
| Login network error | Existing unavailable state with new visual treatment | No raw error leakage |
| Loading state | Intentional skeleton/spinner/state primitive | No layout collapse where avoidable |
| Empty state | Neutral contextual message/action only | No fake metrics/content |
| Error state | Safe contextual message and retry/recovery if existing contract supports it | No stack/token exposure |
| Dark mode | All surfaces remain readable and coherent | Contrast/focus remain visible |
| Long table content | Bounded intentional overflow | No viewport-wide horizontal break |

## 13. Security Requirements

- Preserve login/session/token handling and never display credentials or tokens.
- Preserve backend authorization authority and existing permission filtering.
- Do not add auth bypasses, fake permissions, or navigation claims that imply authorization.
- Keep safe existing error messages and avoid rendering raw API errors containing sensitive data.

## 14. Test Requirements

### Happy Path

- Reworked shell renders authenticated content.
- Login renders and submits through existing auth behavior.
- Header theme/profile controls preserve existing behavior.
- Required primitives render updated variants/states.

### Validation

- Existing login validation states remain correct and visually associated.
- Disabled/loading control states render correctly.

### Negative / Failure

- Existing login error/unavailable state remains safe.
- Existing denied/empty/error/loading states remain rendered and styled.

### Security

- Existing auth and permission tests remain passing.
- No token/password/secret appears in rendered output or test fixtures.

### Regression

- Existing CMS test suite passes.
- Navigation filtering, router guards, auth store, API client, and logout behavior remain unchanged.

### Isolation

- Component tests use deterministic mounts/mocks and do not depend on browser state or test order.
- Browser evidence records exact viewport/theme/state and observed result.

## 15. Task-Level Expected Results

- Browser screenshots/inspection show material visual difference from pre-rework CMS.
- Sidebar, header, login, home, controls, tables, overlays, and feedback states share one coherent TailAdmin-inspired treatment.
- Mobile drawer works as an actual off-canvas interaction.
- Dark mode has no visibly unthemed reworked component.
- Existing auth/RBAC behavior remains intact.
- Automated checks and browser verification both provide evidence.

## 16. Acceptance Criteria

- [ ] Rendered CMS appearance is materially different from the previous UI.
- [ ] Sidebar visibly follows approved TailAdmin-inspired direction.
- [ ] Header visibly follows approved TailAdmin-inspired direction.
- [ ] Login page is visibly redesigned without auth behavior changes.
- [ ] Home/dashboard shell uses the reworked visual system without fake metrics.
- [ ] All required shared primitives have actual presentation updates where applicable.
- [ ] Table, form controls, modal, dropdown, pagination, badge, and feedback states visibly change.
- [ ] Desktop layout verified in browser.
- [ ] Tablet layout verified in browser.
- [ ] Mobile drawer/layout verified in browser.
- [ ] Dark mode verified where supported.
- [ ] Existing auth and RBAC behavior preserved by tests.
- [ ] CMS tests pass.
- [ ] CMS lint passes.
- [ ] CMS typecheck passes.
- [ ] CMS production build passes.
- [ ] Code Anti-Slop, UI Anti-Slop, human/accessibility, responsive, and browser verification gates pass.
- [ ] No unrelated files or dependencies change.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Reject duplicate primitives, dead styles, unused classes/dependencies, fake content, hidden TODO/FIXME/HACK, unjustified assertions/`any`, copied demo architecture, and behavior regressions hidden behind visual changes.

UI Anti-Slop: required. Inspect source and rendered output for generic dashboard composition, visual noise, arbitrary decoration, excessive cards/rounding/shadows, inconsistent hierarchy, repeated template sections, fake metrics, weak states, and unchanged-looking surfaces.

Human/accessibility audit: required. Check semantic HTML, labels, focus visibility, keyboard drawer/dropdown/modal use, contrast, error association, and touch target usability.

Responsive/mobile audit: required. Check desktop/tablet/mobile reflow, drawer usability, overflow, table containment, and touch targets.

Visual verification: required. Browser inspection must compare pre-rework and post-rework rendered CMS at desktop/tablet/mobile and supported light/dark states. Automated tests cannot substitute for this gate.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/cms format:check`
- `bun run --cwd apps/cms lint`
- `bun run --cwd apps/cms typecheck`
- `git diff --check`

### Automated Tests

- Focused shell/login/primitives/responsive interaction tests.
- `bun run --cwd apps/cms test`

### Build

- `bun run --cwd apps/cms build`

### Database/API

Not applicable — no backend or API contract changes.

### UI

- Browser inspection at documented desktop, tablet, and mobile viewport sizes.
- Light and dark theme inspection where supported.
- Drawer, dropdown, modal, login error/loading, and feedback-state interactions.

### Anti-Slop

- Run Code Anti-Slop, UI Anti-Slop, accessibility audit, responsive audit, and browser verification after implementation and after fixes.

## 19. Completion Evidence

- Material visual difference → before/after browser screenshots or inspection notes for shell, login, and home.
- Responsive behavior → desktop/tablet/mobile browser evidence with viewport dimensions.
- Dark mode → browser evidence for all reworked surfaces in supported theme.
- Interaction states → browser evidence for drawer, dropdown, modal, form focus/error/disabled, loading, empty, and error states.
- Behavior preservation → focused/full CMS tests and existing auth/navigation/RBAC test output.
- Static/build quality → format, lint, typecheck, build, Code Anti-Slop, UI Anti-Slop, and `git diff --check` output.
- Scope → final `git status --short` and `git diff` review.

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture | `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md` |
| UI foundation | `tasks/fe/13-tailadmin-ui-foundation/technical.md` |
| Frontend quality | `tasks/fe/12-frontend-quality-gate/technical.md` |
| Auth/RBAC | Existing CMS auth store, router guards, navigation, and backend contracts |
| Visual reference | TailAdmin Vue visual direction stated in task and foundation contract |
| Approved requirements | Current human instruction |

## 21. Open Points

- Browser renderer availability and exact evidence format.
- Exact TailAdmin Vue reference views to compare if a human-supplied screenshot/source is required.
- Whether sidebar collapse persists across reloads or remains session-local.
- Whether Escape-to-close is required for drawer/dropdown/modal beyond current implementation.
- Supported dark-mode default and persistence behavior if current foundation does not fully specify it.
- Exact viewport dimensions for human acceptance; implementation must still cover desktop/tablet/mobile.

## 22. Definition Of Done

- [ ] Visual contract and reference are approved.
- [ ] Material rendered difference is demonstrated.
- [ ] Shell, login, home, primitives, states, responsive behavior, and dark mode are reworked.
- [ ] Existing auth, API, Router, Pinia, and RBAC behavior remains intact.
- [ ] Code Anti-Slop, UI Anti-Slop, accessibility, responsive, and browser gates pass.
- [ ] Tests, lint, typecheck, and build pass.
- [ ] `git diff --check` passes.
- [ ] Changed files, generated output, secrets, and scope reviewed.
- [ ] No unrelated changes remain.

