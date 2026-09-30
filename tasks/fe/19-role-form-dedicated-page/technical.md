# fe/19-role-form-dedicated-page — Role Form Dedicated Page

## 1. Metadata

| Field           | Value                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Task ID         | `fe/19-role-form-dedicated-page`                                                                      |
| Batch           | N/A                                                                                                   |
| Owning Feature  | Role management UI                                                                                    |
| Workstream      | Frontend                                                                                              |
| Task Category   | UI navigation and form refactor                                                                       |
| Repository/App  | `apps/cms`                                                                                            |
| Status          | IMPLEMENTED — VISUAL VALIDATION BLOCKED BY ENVIRONMENT                                                |
| Priority        | N/A                                                                                                   |
| Suggested Size  | Medium                                                                                                |
| Depends On      | `fe/13-tailadmin-ui-foundation`, `fe/15-role-crud`, approved existing Role API/catalog implementation |
| Blocks          | N/A                                                                                                   |
| Execution Order | 19                                                                                                    |

## 2. Outcome

Role creation and editing are full-page workflows at `/roles/create` and `/roles/:id/edit`, while the existing Role list and delete-confirmation modal remain available. Existing Role API payloads, permission identifiers, and authorization behavior stay unchanged.

## 3. Context

- `AGENTS.md` requires an approved task contract before implementation, scope isolation, Anti-Slop, and rendered browser verification for meaningful UI work.
- `docs/ARCHITECTURE.md` assigns API authorization to the backend; the CMS permission store controls visible UX only.
- `docs/DESIGN.md` delegates UI direction to the existing CMS design and primitives; it contains no separate Role-form design contract.
- `tasks/fe/15-role-crud/technical.md` records the frontend Role API contract. Its status is currently blocked, while current source already consumes the role APIs; verify the active implementation and tests before changes.
- `tasks/be/28-role-crud-implementation/technical.md` documents the current Role CRUD contract. Do not alter it.
- Current source evidence: `RoleView.vue` combines list and create/edit/delete modal state; router registers only `/roles`; the API client has list/detail/create/update/delete and permission-catalog methods; role guards use existing `role.read` and action permissions.
- Current seeded catalog has 14 codes in `apps/api/scripts/seed/permissions.seed.ts`. Derive UI groups from returned permission codes; this list is evidence, not a hardcoded frontend catalog.

## 4. Dependencies

- `fe/13-tailadmin-ui-foundation` supplies CMS shell and shared primitives.
- `fe/15-role-crud` and the active Role API client/backend implementation supply the existing Role and permission-catalog contracts. If any needed existing operation is absent at implementation time, stop and report it; do not add a backend endpoint.
- Existing auth store, router guard, and role permission codes are required and must remain authoritative for frontend access UX.
- No new infrastructure, environment configuration, or external service is required.

## 5. In Scope

- Register `/roles/create` and `/roles/:id/edit` inside the authenticated CMS shell.
- Navigate Add Role and Edit actions from `/roles` to their dedicated routes.
- Reuse one Role form implementation for create and update where appropriate.
- Keep existing Role fields and payloads, detail loading, permission catalog source, and permission codes.
- Derive permission groups from each catalog code's resource portion and provide per-group select-all behavior.
- Keep delete confirmation modal on `/roles` and preserve list search, sort, pagination, and UI states.
- Add focused route, form, API payload, failure/success navigation, grouping, and RBAC tests.
- Verify desktop and mobile browser rendering and the existing TailAdmin-compatible design language.

## 6. Out of Scope

- Backend/API, OpenAPI, database/schema/migration, seed, permission-code, or RBAC changes.
- Role form fields, validation rules, request/response shapes, or endpoint changes.
- Delete flow redesign or a delete route.
- Changes to Category, User, Dashboard, global shell, or TailAdmin foundation.
- New frontend dependencies, form libraries, state-management libraries, generic CRUD abstractions, or second notification system.
- Permission search for the current small catalog; revisit only in a separately approved task if catalog scale warrants it.
- Broad redesign of the Role list or unrelated cleanup.

## 7. Existing Implementation

Verify current contents before implementation. Known files:

- `apps/cms/src/views/RoleView.vue` — list, current create/edit modal, and delete modal.
- `apps/cms/src/router/index.ts` — authenticated child routes and permission guard metadata.
- `apps/cms/src/api/client.ts` and `apps/cms/src/api/types.ts` — Role APIs, Zod contracts, and permission-catalog response.
- `apps/cms/src/stores/auth.ts` — authenticated identity and `can(permission)` UX check.
- `apps/cms/src/components/CmsPageHeader.vue`, `AppShell.vue`, and `components/ui/` — page shell and existing primitives.
- `apps/cms/src/components/FeedbackState.vue` — existing API failure state.
- `apps/cms/tests/router-guard.test.ts`, `api-client.test.ts`, `ui-primitives.test.ts`, and test helpers — current routing/API/test conventions. There is no dedicated Role view test in the current test directory.
- `apps/api/src/modules/role/` and `apps/api/src/modules/rbac/` — read-only references for existing API behavior when needed; do not modify.
- `apps/api/scripts/seed/permissions.seed.ts` — current persisted permission-code evidence; frontend must still load the runtime catalog.

## 8. Implementation Requirements

### Routing and access

- Keep `/roles` as the list route and preserve its `role.read` requirement.
- Add `/roles/create` with `role.create` and `/roles/:id/edit` with `role.update` route metadata. Route guards must use the existing authenticated guard; no bypass or client-side permission semantics are added.
- Ensure static `/roles/create` is matched as Create, not as an `id` edit route.
- Add and Edit list actions remain hidden unless `auth.can('role.create')` and `auth.can('role.update')`, respectively.
- Direct URL, refresh, back, and forward behavior must work under normal router guards.
- The Edit page route checks `role.update`; its existing role-detail API request remains protected by backend `role.read`. If an update-only identity receives the existing API `403`, show the safe load error. Do not broaden frontend or backend permissions.

### Role list and deletion

- Preserve current list API, filtering/search, sorting, pagination, loading, empty, and error behavior.
- Add Role navigates to `/roles/create`; Edit navigates to `/roles/:id/edit`.
- Remove create/edit dialog state and form markup from the list. Retain its delete confirmation modal and existing deletion behavior.

### Shared create/edit form

- Create and Edit reuse the same form UI and validation behavior without duplicating form markup or API state.
- Keep fields: code, name, description, permissions. Code is required on create and immutable during edit; display it as read-only on edit if the existing UI form needs to show it. Never include code in the update payload.
- Use existing CMS primitives and TailAdmin-compatible styles. Use normal document scrolling, a consistent page heading/breadcrumb, role-information section, permissions section, and accessible page actions. Avoid fixed-height/nested scroll regions and excessive card framing.
- On Edit, do not render an empty editable form before role detail loads. Render loading, safe load error with retry if existing patterns support it, and not-found behavior using existing API error conventions. Load the permission catalog from the existing catalog method.
- Keep form values after failed create/update. Show errors through existing safe API/feedback conventions and remain on the current form route.
- Cancel from either page navigates to `/roles`, including direct-entry cases; do not rely only on browser history.
- Successful create/update calls the existing API and navigates to `/roles`, preserving existing success feedback conventions. Do not introduce a new toast system.

### Permission presentation and submission

- The API permission catalog remains the only runtime source. Never hardcode or rename permission codes.
- Safely group codes by the resource portion before the first `.`; render the action portion as readable presentation while preserving the exact original code as submitted value. Catalog entries that cannot be grouped safely must remain visible under a neutral group using their original identifiers; do not drop catalog values.
- Provide select-all per group. Selecting or clearing a group affects only its codes. Permission updates remain a set of original codes; filtering/presentation must not lose selected values.
- Do not add a fixed-height permission panel. Use normal page scrolling.
- Do not implement search for the current 14-code catalog; it is intentionally omitted as unnecessary complexity. No backend catalog behavior changes.

### Existing API payloads

- Create uses existing `POST /api/v1/roles` and payload `{ code, name, description, permissionCodes }` as permitted by current client schema.
- Edit loads through existing `GET /api/v1/roles/:id` and updates through existing `PATCH /api/v1/roles/:id` with `{ name, description, permissionCodes }`; code is not sent.
- The existing bearer-authenticated `GET /api/v1/misc/permissions` supplies catalog entries.
- Do not change API client contracts unless implementation discovers the current frontend contract is inconsistent with approved backend behavior; stop and report such a conflict instead of altering API semantics.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no configuration changes.

### API Contract

| Method | Path                       | Auth / permission                | Frontend use                                  |
| ------ | -------------------------- | -------------------------------- | --------------------------------------------- |
| GET    | `/api/v1/roles`            | Bearer / `role.read`             | Existing paginated list                       |
| GET    | `/api/v1/roles/:id`        | Bearer / `role.read`             | Load Edit role; API may deny update-only user |
| POST   | `/api/v1/roles`            | Bearer / `role.create`           | Existing Create payload                       |
| PATCH  | `/api/v1/roles/:id`        | Bearer / `role.update`           | Existing Edit payload; immutable code omitted |
| DELETE | `/api/v1/roles/:id`        | Bearer / `role.delete`           | Existing list confirmation only               |
| GET    | `/api/v1/misc/permissions` | Bearer only, per current backend | Existing permission catalog                   |

No API method, path, payload, response, status, error, or permission code changes are in scope.

### Database Contract

Not applicable — frontend-only work; no schema or migration changes.

### UI Contract

| Surface                  | Required behavior                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `/roles`                 | Existing list; Add/Edit navigate; Delete confirmation remains modal                                                   |
| `/roles/create`          | Shared form; Create permission; direct URL and refresh supported                                                      |
| `/roles/:id/edit`        | Shared form populated from detail; Update permission; loading/error/not-found states                                  |
| Permissions              | Runtime catalog, data-derived groups, group select-all, original submitted codes, normal page scroll                  |
| Actions                  | Cancel/success navigate to `/roles`; failure stays in form with values retained                                       |
| Responsive/accessibility | Desktop/mobile; no horizontal overflow or nested form scrolling; semantic headings/labels, keyboard and visible focus |

## 10. File Impact

### Expected Create

- One focused Role form or permission-selector component only where separation is justified by reuse/complexity.
- Focused Role view/form/router tests where existing tests cannot cover behavior.

### Expected Modify

- `apps/cms/src/router/index.ts`.
- `apps/cms/src/views/RoleView.vue` and/or new Create/Edit page views following actual local architecture.
- `apps/cms/tests/router-guard.test.ts` and focused new Role tests as needed.

### Expected Not Modified

- `apps/api/**`, `docs/**`, `apps/cms/src/api/**` unless a verified existing frontend contract defect is found (then stop for contract resolution), permissions, global auth/RBAC semantics, Category/User/Dashboard, package manifests, and lockfiles.

Expected paths are guidance; implementation must inspect repository before finalizing changes.

## 11. Runtime Behavior

- From `/roles`, authorized Add navigates to `/roles/create`; authorized Edit navigates to the selected role’s `/roles/:id/edit`.
- Router restoration/authentication and permission guard execute on direct navigation and refresh. Unauthorized requests follow the existing login/denied behavior.
- Create loads the permission catalog, renders the blank create form, selects and deselects catalog values, submits the existing payload, stays on the page with values/error after failure, and returns to the list after success.
- Edit loads role detail and catalog before presenting an editable form; existing values and permission codes are selected. Load failure/not-found renders an existing safe state. Update sends only editable existing fields; on failure it retains the form; on success it returns to the list.
- Cancel returns to `/roles` independent of browser history.
- Delete continues through the current list confirmation modal and API operation.

## 12. Error And Edge Cases

| Scenario                                       | Expected Result                                                                           | Security / Recovery                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Unauthenticated direct Create/Edit URL         | Existing guard redirects to login with safe return target                                 | No guard bypass                                   |
| Authenticated without create/update permission | Existing denied route                                                                     | UI check is not backend authority                 |
| Edit detail still loading                      | Loading state; no blank editable form                                                     | Prevent accidental empty overwrite                |
| Edit role not found or load error              | Safe not-found/error state and list navigation/retry where supported                      | Do not expose raw server details                  |
| Catalog load fails                             | Existing safe error state; no fabricated catalog                                          | Retry where existing feedback pattern supports it |
| Create/update validation or API error          | Stay on route, retain entered values, show safe error                                     | Correct and retry                                 |
| Empty permission catalog                       | Explain no permissions available; form remains usable according to current API validation | Do not invent codes                               |
| Partial group selection                        | Select-all state reflects selected codes without complex custom checkbox behavior         | Group updates affect only group                   |
| Permission code without expected delimiter     | Keep visible and submit unchanged under a neutral grouping                                | Never drop authorization identifiers              |
| Direct create URL with no history              | Cancel navigates to `/roles`                                                              | No reliance on `router.back()`                    |

## 13. Security Requirements

- Preserve authenticated routes and existing `role.read/create/update/delete` route/action checks.
- Frontend route metadata and hidden controls are UX only; backend persisted RBAC remains authoritative.
- Send only approved existing Role payload fields and exact permission codes returned by the catalog.
- Use current API error normalization and safe feedback. Never log/display tokens or raw sensitive provider/database errors.

## 14. Test Requirements

### Happy Path

- Add/Edit list controls navigate to their dedicated routes; Delete still opens its confirmation modal.
- Create and Edit pages render shared fields and catalog-derived permissions.
- Edit hydrates code/name/description and selected permissions before showing the form.
- Permission selection and group select-all update only expected codes.
- Create and update submit existing payloads and navigate to `/roles` after success.

### Validation

- Existing HTML/API validation remains intact; field-level errors and safe API error display remain usable.
- Unknown/unrecognized catalog codes remain present and unchanged.

### Negative / Failure

- Failed Create/Update remain on the page with entered values and a visible error.
- Edit loading, not-found, detail failure, and catalog failure states render intentionally.
- Cancel navigates to `/roles` from direct route entry.

### Security

- Create and Edit routes use `role.create` and `role.update`; denial and visibility checks are tested where supported by existing guard/store contracts.
- No permission catalog is hardcoded and no extra permission/API semantics are introduced.

### Regression

- Role list search/sort/pagination and Delete confirmation behavior remain.
- API client payload/route contract tests remain passing; auth guard and navigation behavior remain intact.

### Isolation

- Tests use deterministic API/auth fixtures, not live external services; each test resets router/store/API mocks and does not depend on test order.

## 15. Task-Level Expected Results

- Role list, Create, and Edit are distinct router pages with appropriate existing guards.
- One form implementation supports both Create and Edit without duplicating validation/API state.
- Existing API contracts and permission identifiers remain unchanged.
- Catalog-derived resource groups and group select-all work with no nested permission scroller.
- Delete remains modal-based, and route/form behavior is covered by focused tests and browser evidence.

## 16. Acceptance Criteria

- [x] `/roles/create` and `/roles/:id/edit` are registered under the authenticated shell.
- [x] Direct navigation to each new route respects existing authentication and permission guards in router tests.
- [x] Add Role navigates to Create; Edit navigates to the selected role’s Edit page.
- [x] Create/Edit use shared form logic; fields preserve existing contract and code is not editable/sent on update.
- [x] Edit displays loading and does not show a blank editable form before loading completes.
- [x] Detail values and assigned permission codes load correctly.
- [x] Permission catalog remains API-backed; groups derive from codes; group select-all changes only that group.
- [x] Existing API paths, methods, payload/response schemas, permission codes, and RBAC semantics are unchanged.
- [x] Successful Create/Update navigate to `/roles`; failed submission remains on the form with values retained.
- [x] Cancel navigates to `/roles` even with no prior history entry.
- [x] List search/sort/pagination remain and Delete confirmation modal continues working.
- [ ] Permission layout uses normal page scrolling with no horizontal overflow or nested fixed-height scroll area.
- [ ] Desktop and mobile layouts are browser-verified; applicable accessibility and UI states are reviewed.
- [ ] Focused Role tests, full CMS tests, lint, typecheck, build, formatting, Code Anti-Slop, UI Anti-Slop, and `git diff --check` pass.

## 17. Anti-Slop Requirements

- Code Anti-Slop: inspect changed code for duplicated forms/validation/API state, unnecessary wrappers/composables, unused code, fake permission values, hidden TODOs, unjustified assertions/`any`, and unrelated edits.
- UI Anti-Slop: inspect rendered Role list/Create/Edit for excess cards/borders, inconsistent hierarchy/spacing, generic CRUD treatment, inaccessible controls, fake catalog values, nested scrolling, and missing loading/error/empty/focus states.
- Responsive audit: verify mobile stacking, readable permission groups, reachable actions, and no horizontal overflow.
- Visual verification is required for desktop and mobile; source inspection/tests do not substitute.

## 18. Validation Requirements

### Static

- CMS lint, typecheck, formatting check, and `git diff --check` using configured scripts.

### Automated Tests

- Focused Role page/form/router tests and complete CMS test suite.

### Build

- CMS production build.

### Database

Not applicable — no database change.

### UI

- Browser verification of `/roles`, `/roles/create`, `/roles/:id/edit` on desktop and mobile, including list navigation/delete, loaded form, permission selection, and practical loading/error states.

### Anti-Slop

- Code Anti-Slop and UI Anti-Slop with responsive/accessibility review; rerun after any findings are fixed.

## 19. Completion Evidence

- Route and guard criteria → focused router tests.
- List navigation/delete criteria → Role page component tests and browser interaction.
- Create/Edit field, hydration, selection, payload, success/failure criteria → focused Role form/page tests.
- Existing API and permission contract → unchanged API client/types diff plus existing API-client tests.
- Desktop/mobile/layout/accessibility criteria → browser inspection at recorded viewport sizes.
- Quality gates → exact CMS test/lint/typecheck/build/format command results, Code/UI Anti-Slop reports, `git diff --check`, and changed-file diff review.
- Record exact suite/file/test counts and all unavailable checks as NOT RUN/BLOCKED; do not infer visual PASS from automated checks.

### Execution Evidence — 2026-09-29

| Gate                                    | Result                 | Evidence                                                                                                                                                                                                                      |
| --------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused Role/router tests               | PASS                   | `bun run --cwd apps/cms test -- role-page.test.ts router-guard.test.ts` — 2 files, 25 tests                                                                                                                                   |
| CMS tests                               | PASS                   | `bun run --cwd apps/cms test` — 13 files, 93 tests                                                                                                                                                                            |
| CMS lint                                | PASS                   | `bun run --cwd apps/cms lint`                                                                                                                                                                                                 |
| CMS typecheck                           | PASS                   | `bun run --cwd apps/cms typecheck`                                                                                                                                                                                            |
| CMS formatting                          | PASS                   | `bun run --cwd apps/cms format:check`                                                                                                                                                                                         |
| CMS build                               | PASS                   | `bun run --cwd apps/cms build`; existing dependency annotation warnings from Zod were emitted                                                                                                                                 |
| Code Anti-Slop                          | PASS                   | Changed-code review found no duplicate form logic, hardcoded permission catalog, unnecessary dependency, hidden TODO, or unrelated source change                                                                              |
| Accessibility contrast review           | PASS                   | Token checks with `.codex/skills/antislop-human/contrast-check.py`: light muted 4.97:1, light field border 4.97:1, foreground 14.70:1, white-on-primary 4.84:1, dark muted 6.63:1, dark foreground 15.49:1, dark focus 8.77:1 |
| UI Anti-Slop rendered review            | NOT RUN                | Protected Role page could not be authenticated because configured API at `http://localhost:3000` had no listener                                                                                                              |
| Browser verification                    | BLOCKED BY ENVIRONMENT | CMS dev server started; direct `/roles` navigation redirected to `/login?returnTo=/roles`; no authenticated fixture exists in source and API is unavailable                                                                   |
| Desktop/mobile layout and click-through | NOT RUN                | No authenticated `/roles`, Create, or Edit UI rendered in browser                                                                                                                                                             |
| `git diff --check`                      | PASS                   | Tracked changes pass `git diff --check`; new untracked files were separately checked for trailing whitespace and conflict markers with no findings                                                                            |

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

- Visual validation remains pending because the configured local API is unavailable and no dev-auth fixture exists in the CMS source.
- The Edit route checks `role.update`, while the existing detail endpoint requires `role.read`; an identity without read permission receives the backend's existing `403` as a safe page load error.

## 22. Definition Of Done

- [x] Human approves this task contract before implementation.
- [ ] All acceptance criteria and approved scope are satisfied.
- [ ] Existing Role APIs, permission catalog, auth store, router, and RBAC behavior remain intact.
- [ ] Focused and full CMS tests pass; lint, typecheck, formatting, and build pass.
- [x] Code Anti-Slop passes.
- [ ] UI Anti-Slop and desktop/mobile browser verification pass; blocked because the configured API is unavailable and `/roles` redirects to login.
- [x] `git diff --check` passes; tracked changes and scoped new files are reviewed.
- [ ] No secrets, generated junk, or unrelated changes are included.
