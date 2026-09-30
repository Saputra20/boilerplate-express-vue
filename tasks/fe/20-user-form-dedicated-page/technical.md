# fe/20-user-form-dedicated-page — User Form Dedicated Pages

## 1. Metadata

| Field           | Value                                                                             |
| --------------- | --------------------------------------------------------------------------------- |
| Task ID         | `fe/20-user-form-dedicated-page`                                                  |
| Batch           | N/A                                                                               |
| Owning Feature  | User management UI                                                                |
| Workstream      | Frontend                                                                          |
| Task Category   | UI navigation and form refactor                                                   |
| Repository/App  | `apps/cms`                                                                        |
| Status          | IMPLEMENTED — VISUAL VALIDATION BLOCKED BY ENVIRONMENT                            |
| Priority        | N/A                                                                               |
| Suggested Size  | Medium                                                                            |
| Depends On      | `fe/13-tailadmin-ui-foundation`, `fe/16-user-management`, `be/28-user-management` |
| Blocks          | N/A                                                                               |
| Execution Order | 20                                                                                |

## 2. Outcome

User creation and editing are dedicated authenticated CMS pages at `/users/create` and `/users/:id/edit`. The Users list, detail view, and delete confirmation remain available; the existing user API and authentication behavior are preserved.

## 3. Context

- `AGENTS.md` requires one approved task at a time, backend-owned authorization, Anti-Slop, and browser verification for meaningful UI work.
- `docs/ARCHITECTURE.md` assigns authorization to backend persisted RBAC; CMS permissions only control navigation and visible actions.
- `docs/DESIGN.md` directs the CMS to Vue/Tailwind and accessible shared primitives. FE/19 provides the current dedicated form-page precedent and full available content-width treatment.
- `tasks/fe/16-user-management/technical.md` still says the backend contract is blocked. This conflicts with active CMS/API source and `be/28-user-management`'s implementation addendum; current source is the implementation evidence, while its integration/database validation status must remain explicit.
- `apps/cms/src/views/UserView.vue` currently contains user list, details, delete, and Create/Edit modal flows. Existing API client methods and backend routes implement list/detail/create/update/delete.
- Existing behavior uses one assigned Role, `active`/`disabled` status, a configured default password for new accounts, and a first-login password-change flag. This task does not redesign those rules.

## 4. Dependencies

- `fe/13-tailadmin-ui-foundation` provides the authenticated shell and UI primitives.
- `fe/16-user-management` provides the current Users list and API integration; inspect source rather than relying on its stale blocked status.
- `be/28-user-management` provides the current user API and lifecycle contract. Its implementation is present, but this task must not claim its remaining validation is complete.
- `fe/19-role-form-dedicated-page` is a visual/interaction precedent, not a runtime dependency.
- Existing role list API is used to populate the single-role selector. It requires `role.read`; preserve its safe failure behavior rather than changing RBAC.

## 5. In Scope

- Add `/users/create` and `/users/:id/edit` pages beneath the authenticated CMS shell.
- Guard Create with `user.create` and Edit with `user.update` using the existing router guard.
- Navigate Add User and Edit actions from `/users` to the corresponding page.
- Reuse one User form implementation for Create and Edit.
- Keep the form sections full width within the available CMS content area, following FE/19's page layout and existing CMS design primitives.
- Preserve current user fields, single-role selection, status behavior, API payloads, list behavior, details modal, and delete-confirmation modal.
- Cover routing, loading/errors, values, payloads, permission visibility, navigation, and form regression with focused tests.
- Verify the rendered form on desktop and mobile when the authenticated local application is available.

## 6. Out of Scope

- Backend/API, OpenAPI, database, audit, auth/session, password policy, status semantics, seed, permission, or RBAC changes.
- New invitation, verification, password-reset, or notification flow; no password input on the administrative user form.
- New search/filter/sort behavior or a User list redesign.
- Bulk user actions, user restoration, hard deletion, or changes to the existing delete confirmation.
- New UI framework/dependencies, generic CRUD abstraction, second notification system, or changes to Role/Category/Dashboard pages.
- Changing a user’s email verification status or claiming that an email verification message was sent.

## 7. Existing Implementation

Verify current source before implementation. Known files:

- `apps/cms/src/views/UserView.vue` — list, create/edit modal, detail modal, and delete confirmation.
- `apps/cms/src/router/index.ts` — authenticated child routes and permission metadata; currently only `/users` exists.
- `apps/cms/src/api/client.ts` and `apps/cms/src/api/types.ts` — typed user and role client operations and schemas.
- `apps/cms/src/stores/auth.ts` — authenticated identity and `can(permission)` UX check.
- `apps/cms/src/components/ui/`, `CmsPageHeader.vue`, `AppShell.vue`, and `FeedbackState.vue` — current form/page primitives and states.
- `apps/cms/tests/router-guard.test.ts`, `api-client.test.ts`, and current user-related tests — routing, API, and component conventions.
- `apps/api/src/modules/user/v1/user.router.ts`, user controller/service/repository, and `user.openapi.yaml` — current backend paths, permissions, fields, and API behavior; read only for this task.
- `apps/api/src/config/env.ts` and the user module — configured default password and first-login password-change behavior; do not display the configured secret.

## 8. Implementation Requirements

### Routing and access

- Keep `/users` as the list route with its existing `user.read` metadata.
- Add static `/users/create` with `user.create` and dynamic `/users/:id/edit` with `user.update` metadata under the existing authenticated shell and guard.
- Add/Edit actions are visible only when `auth.can('user.create')` / `auth.can('user.update')` respectively. Backend middleware remains authoritative.
- Direct navigation, refresh, back, and forward use the existing guard. Do not bypass authentication or introduce a development auth path.
- Edit detail loading calls the existing `GET /api/v1/users/:id`, which requires `user.read`. If an update-only identity is denied by that API, show its existing safe error; do not expand route permissions.

### Users list and retained actions

- Preserve current list query behavior, status filter, search, sorting, pagination, loading, empty, error, details, and deletion behavior.
- Add User navigates to `/users/create`; Edit navigates to `/users/:id/edit`.
- Remove Create/Edit modal state and markup from the list. Keep User details and delete-confirmation modals on `/users`.

### Shared Create/Edit form

- Use a shared page/form implementation without duplicated API or validation state.
- Use the existing CMS field labels and primitives. Create fields are email and a required single Role selector. Edit fields are email, one Role selector, and status (`active` or `disabled`). Do not add a multi-role selector or a role-clear action.
- Create does not accept a password or status in its request. The backend assigns the configured default password, creates the user as `active`, and sets `mustChangePassword`; show concise existing explanatory copy without revealing the environment value.
- Edit loads detail before rendering editable fields. Show loading, safe detail/catalog errors, and not-found states; do not show a blank form while detail is pending.
- Load selectable roles through the existing role-list API. It requires `role.read`; on denial/failure show safe feedback and keep submit unavailable until a Role can be selected. Do not invent permissions or bypass the route guard.
- On validation/API failure, retain field values and remain on the current route with safe feedback.
- Cancel from either page navigates to `/users`, even after direct entry. Successful create/update navigates to `/users` and refreshes the list through existing behavior; do not add a toast system.
- Keep forms/cards full width inside the available main content area, without an arbitrary `max-w-*` cap or nested fixed-height scrolling. Preserve responsive stacking and normal document scroll.
- Do not expose or render password hashes, configured passwords, tokens, session data, or audit metadata.

### Existing API behavior

- Create: `POST /api/v1/users`, permission `user.create`, payload `{ email, roleId }`; response `201` with existing safe user shape.
- Edit load: `GET /api/v1/users/:id`, permission `user.read`; existing safe detail response.
- Update: `PUT /api/v1/users/:id`, permission `user.update`, payload `{ email, roleId, status }` from the current form; response `200`.
- Role selector: `GET /api/v1/roles`, permission `role.read`; consume existing role `id` and display `name` values.
- Email uniqueness conflicts use the existing safe `409` response. Current backend clears `emailVerifiedAt` when the email changes but does not initiate verification delivery. Do not imply that email delivery occurred or change this behavior in this frontend task; see Open Points.
- Do not change API client, OpenAPI, endpoint, method, payload, response, or permission semantics.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — this task adds no configuration. The default user password remains server-side configuration and is never rendered or copied into CMS state.

### API Contract

| Method | Path                | Auth / permission      | Frontend use                            |
| ------ | ------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/v1/users`     | Bearer / `user.read`   | Existing Users list                     |
| GET    | `/api/v1/users/:id` | Bearer / `user.read`   | Populate Edit page                      |
| POST   | `/api/v1/users`     | Bearer / `user.create` | Create with `{ email, roleId }`         |
| PUT    | `/api/v1/users/:id` | Bearer / `user.update` | Update with `{ email, roleId, status }` |
| DELETE | `/api/v1/users/:id` | Bearer / `user.delete` | Existing list delete confirmation       |
| GET    | `/api/v1/roles`     | Bearer / `role.read`   | Populate the single-role selector       |

No API changes are in scope. Runtime implementation uses `PUT` for user update; do not substitute `PATCH` based on stale proposed text in `be/28-user-management`.

### Database Contract

Not applicable — no schema, migration, or database behavior changes.

### UI Contract

| Surface                  | Required behavior                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `/users`                 | Existing list/details/delete; Add/Edit navigate to dedicated pages                                                |
| `/users/create`          | Email and one required Role; explain default-password/first-login behavior without exposing the configured value  |
| `/users/:id/edit`        | Load user before form; email, one Role, `active`/`disabled` status                                                |
| Actions                  | Cancel/success return to `/users`; failures retain form values                                                    |
| Responsive/accessibility | Available content width, no horizontal overflow/nested form scroll, labeled controls, visible focus, keyboard use |

## 10. File Impact

### Expected Create

- One User Create/Edit page or feature form component if separation from the list is justified by reuse/complexity.
- Focused User page and router tests where existing tests do not cover behavior.

### Expected Modify

- `apps/cms/src/router/index.ts`.
- `apps/cms/src/views/UserView.vue` and, if chosen after inspection, a User form view/component.
- `apps/cms/tests/router-guard.test.ts` and focused User tests.

### Expected Not Modified

- `apps/api/**`, `apps/cms/src/api/**`, `apps/cms/src/stores/auth.ts`, database/migrations, OpenAPI, auth/session behavior, permission catalog, Role/Category/Dashboard modules, manifests, and lockfiles.

Expected paths are guidance; implementation must inspect current repository before finalizing changes.

## 11. Runtime Behavior

- From `/users`, authorized Add navigates to `/users/create`, and authorized Edit navigates to the selected user’s `/users/:id/edit` route.
- Existing authentication and permission guards run on navigation and refresh. Unauthorized callers follow existing login/denied behavior.
- Create loads the role choices, renders an empty email/single-role form, displays the approved default-password explanation without its value, submits `{ email, roleId }`, retains values on failure, and returns to `/users` on success.
- Edit loads the safe user detail and role choices before rendering the form. It submits `{ email, roleId, status }` via the existing `PUT` operation; it retains values on failure and returns to `/users` on success.
- Cancel navigates to `/users` independent of browser history. List details and delete continue to use their existing modals.

## 12. Error And Edge Cases

| Scenario                                     | Expected Result                                                     | Security / Recovery                                    |
| -------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| Unauthenticated direct Create/Edit URL       | Existing guard sends user to login with safe return target          | No authentication bypass                               |
| Missing `user.create` / `user.update`        | Existing denied route; action hidden on list                        | UI visibility is not backend authorization             |
| Edit identity lacks `user.read`              | Safe detail error; no editable form                                 | Preserve existing permission model                     |
| Role list denied/fails or returns no choices | Safe feedback; submit unavailable until one valid Role is available | Do not fabricate Role data or permission semantics     |
| User detail is loading                       | Loading state; no blank editable form                               | Prevent accidental empty update                        |
| User detail is not found                     | Safe not-found state and navigation back to list                    | Do not expose raw server details                       |
| Duplicate email or invalid request           | Existing normalized API error; preserve values and route            | No raw provider/database details                       |
| Role/status/update request fails             | Stay on page, retain entered values, show safe error                | Correct and retry                                      |
| Email changes                                | Follow existing API response; do not claim verification delivery    | Current API clears verification timestamp without send |
| Direct Create route has no browser history   | Cancel navigates to `/users`                                        | Do not rely on `router.back()`                         |

## 13. Security Requirements

- Preserve existing authenticated routes and `user.read/create/update/delete` plus `role.read` API enforcement.
- Frontend route metadata and hidden buttons are UX only; backend persisted RBAC remains authoritative.
- Never request, store, display, log, or return the default password, password hashes, tokens, session data, or audit metadata.
- Use only existing safe API error normalization. Do not expose raw backend/provider errors.
- Send only existing approved user fields and a single role ID; do not add profile or authorization fields.

## 14. Test Requirements

### Happy Path

- Add/Edit list actions navigate to the dedicated pages; detail and delete actions still open their existing modals.
- Create loads roles and submits `{ email, roleId }`; Edit hydrates existing values and submits `{ email, roleId, status }` through `PUT`.
- Successful actions navigate to `/users`; forms use full available width.

### Validation

- Required email and Role controls prevent invalid form submission; status options are only `active` and `disabled`.
- Existing backend/client Zod validation remains unchanged.

### Negative / Failure

- Failed Create/Edit retain values and show safe feedback.
- Edit loading, 404, detail error, and role-list error states render without exposing an empty editable form.
- Direct-route Cancel returns to `/users`.

### Security

- Create/Edit routes use `user.create`/`user.update`; Add/Edit controls respect the same permissions.
- Tests prove no password input/value is sent; Create payload contains no password or status.
- Role dropdown uses existing API data; no role or permission is hardcoded as authorization data.

### Regression

- User list search/status filter/sort/pagination, details, and delete confirmation behavior remain intact.
- API client request methods and payload shapes remain unchanged.

### Isolation

- Tests use deterministic API/auth fixtures, reset router/store/API mocks, avoid live services, and do not rely on test order.

## 15. Task-Level Expected Results

- Users list, Create, and Edit are distinct routes with existing guard behavior.
- One form implementation supports Create and Edit while keeping a single Role assignment.
- The existing backend default-password/first-login requirement is described without exposing its value.
- Existing user list/detail/delete flows and API contracts remain unchanged.
- Automated coverage and rendered desktop/mobile review provide evidence for the form pages.

## 16. Acceptance Criteria

- [x] `/users/create` and `/users/:id/edit` are nested under the authenticated shell and use the existing route guard.
- [x] Add and Edit actions navigate to their routes and remain hidden without matching permissions.
- [x] Create submits only `{ email, roleId }`; no password or status is sent.
- [x] Edit loads detail before rendering fields and updates via existing `PUT` with current editable values.
- [x] Both pages use one required Role selection and only approved status values; no multi-role behavior is introduced.
- [x] Role/detail errors, validation errors, loading, and not-found states are safe and recoverable; failed submissions retain values.
- [x] Cancel and successful save return to `/users`; existing list, details, and delete flows remain.
- [ ] Forms fill the available main content width and remain usable at desktop/mobile widths.
- [ ] Tests, lint, typecheck, formatting, build, applicable Anti-Slop, browser review, and diff/scope checks pass.

## 17. Anti-Slop Requirements

- Code Anti-Slop: check for duplicate form/API state, unnecessary wrappers, hardcoded account/role data, unused code, hidden TODOs, unjustified assertions/`any`, and unrelated edits.
- UI Anti-Slop: review list and form hierarchy, spacing, full-width card behavior, excess framing, loading/error/empty states, and consistency with the CMS identity.
- Human/accessibility review: labels, keyboard operation, visible focus, contrast, safe error announcements, and practical touch targets.
- Layout/mobile review: form reflow, role selector usability, page scroll, and no horizontal overflow at narrow and intermediate widths.
- Browser verification is required for authenticated Create/Edit pages on desktop and mobile. Automated component tests do not replace it.

## 18. Validation Requirements

### Static

- CMS ESLint, TypeScript typecheck, Prettier check, `git diff --check`, changed-file and secret review.

### Automated Tests

- Focused User page/router tests and full CMS test suite.

### Build

- CMS production build.

### Database

- Not applicable — no database changes.

### UI

- Browser review of `/users`, `/users/create`, and `/users/:id/edit` at desktop/mobile sizes with authenticated state; check loading/error, focus, overflow, and success/failure navigation where feasible.

### Anti-Slop

- Code Anti-Slop, UI Anti-Slop, accessibility and layout/mobile checks; fix relevant findings and rerun. Report any unavailable rendered review as NOT RUN with its reason.

## 19. Completion Evidence

- Route/permission behavior → focused router guard tests.
- Form fields, request bodies, role selection, loading/errors, retain-on-failure, and navigation → focused User page tests.
- Existing list/detail/delete behavior → focused regression tests and CMS suite.
- Focused tests → PASS: 29 tests across `user-form-page.test.ts`, `user-page.test.ts`, and `router-guard.test.ts`.
- Full CMS suite → PASS: 103 tests across 14 files.
- Static/build requirements → PASS: CMS ESLint, TypeScript typecheck, Prettier check, and production build.
- Code Anti-Slop → PASS: reviewed changed implementation for duplicated form state, dead code, placeholder behavior, unnecessary abstractions, assertions, hidden TODOs, and secret exposure.
- UI Anti-Slop source review → PASS for full-width page structure, existing CMS primitives, form states, and single-role presentation. Rendered visual review → NOT RUN: the frontend was reachable after starting Vite with local socket permission, but direct navigation redirected to `/login`; the local API at `127.0.0.1:3000` is unavailable and no existing dev-auth fixture was found.
- Human/accessibility and layout/mobile source review → PASS for labels, semantic form controls, alert/status announcements, keyboard-operable native controls, responsive width, and normal document scrolling. Rendered contrast, focus appearance, touch-target, and viewport checks → NOT RUN for the same browser environment blocker.
- Security/scope requirements → PASS: request payload tests confirm no password/status in Create; existing API/auth contracts remain unchanged; `git diff --check` passes.
- Do not infer browser, rendered Anti-Slop, API/database, or email-verification behavior from static checks.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

- **Rendered UI verification remains blocked:** direct navigation to `/users/create` redirected to `/login`; the local API at `127.0.0.1:3000` refused the connection, and no existing dev-auth fixture was found. Keep this task status pending until authenticated desktop/mobile inspection can be completed. Do not bypass route guards or add a new auth mechanism as part of this task.
- **Email-change verification delivery:** prior product direction expects duplicate-email rejection and verification before treating a changed address as complete. Current user update code returns after changing email and clears `emailVerifiedAt`, but does not create/send an email-verification challenge. This page-only task must not invent that flow or claim mail was sent. Before implementation is treated as satisfying the broader email-change expectation, reconcile whether a separate backend task owns verification delivery and pending-email semantics. This does not prevent moving the existing Create/Edit forms to separate pages while preserving current API behavior.
- `fe/16-user-management` metadata remains stale (`Blocked — backend contract`) despite current User UI/API source; update that historical task only in its own authorized reconciliation work.

## 22. Definition Of Done

- [ ] Approved task scope and API contract are satisfied without unrelated changes.
- [ ] Acceptance criteria have implementation and test evidence.
- [ ] Focused/full tests, lint, typecheck, formatting, build, and applicable migration/OpenAPI checks pass.
- [x] Code Anti-Slop and source-level UI/accessibility/layout-mobile reviews pass; rendered UI review remains pending as recorded above.
- [ ] Authenticated desktop/mobile browser verification passes; current environment blocker keeps visual validation pending.
- [x] `git diff --check` passes; changed files and secret exposure are reviewed.
- [ ] No passwords, tokens, unrelated generated files, or out-of-scope changes are included.
