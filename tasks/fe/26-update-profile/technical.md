# fe/26-update-profile - Update Profile

## 1. Metadata

| Field           | Value                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID         | `fe/26-update-profile`                                                                                                                                                           |
| Batch           | Account self-service                                                                                                                                                             |
| Owning Feature  | CMS account management                                                                                                                                                           |
| Workstream      | Frontend                                                                                                                                                                         |
| Task Category   | Authenticated profile/API integration                                                                                                                                            |
| Repository/App  | `apps/cms`                                                                                                                                                                       |
| Status          | BLOCKED - waiting for BE-40 authenticated self-profile implementation                                                                                                            |
| Priority        | Normal                                                                                                                                                                           |
| Suggested Size  | Medium                                                                                                                                                                           |
| Depends On      | `fe/04-theme-design-system`, `fe/06-auth-state`, `fe/11-frontend-testing`, `fe/13-tailadmin-ui-foundation`, `be/40-authenticated-self-profile` (implementation must be complete) |
| Blocks          | None                                                                                                                                                                             |
| Execution Order | 26                                                                                                                                                                               |

## 2. Outcome

An authenticated CMS user can view their backend-approved profile attributes and update only the fields an approved self-service API contract declares editable. After a successful update, canonical identity state is reloaded through `/api/v1/me` where the backend contract makes that endpoint authoritative for the updated data.

## 3. Context

- `apps/api/src/modules/me/v1/me.openapi.yaml` currently defines `GET /api/v1/me` with `user.id`, `user.email`, `user.mustChangePassword`, `roles`, and `permissions`. It contains no name, display name, phone, avatar, or profile update operation.
- `apps/api/src/modules/user/v1/user.openapi.yaml` and `user.router.ts` define user-management operations by user ID; they are not a self-service current-user profile contract and must not be repurposed as one.
- `apps/cms/src/stores/auth.ts` hydrates current identity from `/api/v1/me`. `apps/cms/src/api/{client.ts,types.ts}` own typed API boundaries.
- `apps/cms/src/router/index.ts` currently has no `/profile` route. `apps/cms/src/components/CmsProfileMenu.vue` provides the user menu but has no account navigation contract.
- Existing shell and visual conventions live in `apps/cms/src/components/`, `apps/cms/src/components/ui/`, `tasks/fe/13-tailadmin-ui-foundation/technical.md`, and `docs/DESIGN.md`.
- `docs/PRD.md`, `docs/PRODUCT.md`, and `docs/DOMAIN.md` still contain requirement-needed placeholders; do not infer editable business profile fields from schema or UI examples.

## 4. Dependencies

- **Blocking backend dependency:** [`be/40-authenticated-self-profile`](../../be/40-authenticated-self-profile/technical.md) defines the approved self-profile contract and is ready for implementation. FE-26 remains blocked until its API, migration, audit behavior, tests, and OpenAPI are implemented and validated.
- `GET /api/v1/me` exists and may populate current identity only for fields it actually returns. Current roles and permissions are read-only authorization context.
- FE-04, FE-06, FE-11, and FE-13 are implementation foundations to inspect; there is no required dependency on FE-24.
- No new infrastructure or external service is in scope.

## 5. In Scope

- Add an authenticated `/profile` route only after the backend contract identifies which fields the page can present and update.
- Display authenticated identity values actually returned by approved API contracts.
- Render editable controls only for fields explicitly approved as editable by the self-profile backend contract.
- Keep email, role, and permission data read-only unless an explicit backend lifecycle grants editability; do not invent an email-change flow.
- Submit only the approved update schema and refresh auth/profile state from the canonical endpoint specified by backend contract (prefer `/api/v1/me` if it returns updated values).
- Use the existing CMS menu and navigation patterns to expose `/profile` only when the page and its API dependency are implemented.
- Add focused tests for loading, population, editable/read-only fields, validation, update outcomes, identity refresh, and safe failures.

## 6. Out of Scope

- Backend/API/OpenAPI/database/profile-field changes; these require an approved backend task.
- Guessing fields from database columns, user-management forms, generic examples, or TailAdmin screenshots.
- Self-service role/permission changes or admin user CRUD.
- Direct email update, email verification/reverification, reauthentication, session policy, or “current email stays active” semantics without an approved lifecycle.
- Avatar upload/storage or fabricated upload endpoints. A static identity representation may be used only if consistent with existing CMS primitives.
- FE-24 mandatory password-change behavior, forgot/reset password, and voluntary change-password feature FE-25.
- New notification framework or dependency.

## 7. Existing Implementation

- `apps/api/src/modules/me/v1/me.openapi.yaml`, `apps/api/src/modules/auth/services/context.service.ts`, and `context.repository.ts`: current-user context contract and implementation.
- `apps/api/src/modules/user/v1/{user.router.ts,user.openapi.yaml,controllers/user.controller.ts}`: administrative user operations; not self-service.
- `apps/api/src/config/drizzle/schema/users.schema.ts`: database structure is not evidence that fields may be exposed or edited.
- `apps/cms/src/stores/auth.ts`: canonical auth identity state and `/me` hydration.
- `apps/cms/src/api/{client.ts,types.ts}`: authenticated API client and schemas.
- `apps/cms/src/router/index.ts`, `navigation.ts`, `components/CmsProfileMenu.vue`, `AppShell.vue`, and `components/ui/`: current routing/menu/shell patterns.
- No self-profile route or frontend self-profile API operation exists. Current `/me` exposes ID, email, and mandatory password flag; roles and permissions are top-level read-only context.

## 8. Implementation Requirements

1. Do not implement until BE-40 is complete and its runtime/OpenAPI contract matches the approved readable/editable fields and full read/update behavior.
2. Add `/profile` as an authenticated route. It does not imply that `/api/v1/users/{id}` can be used for the current user.
3. Use `/api/v1/me` only for fields it currently returns. Do not infer profile attributes or editability from database schema or administrator forms.
4. For each field, follow the backend contract's classification: readable, editable, immutable, or system-managed. Only editable fields get inputs; identity/authorization fields remain display-only unless backend explicitly supports otherwise.
5. If email is editable in the approved contract, implement only its explicitly defined verification, activation, session, and error lifecycle. If any lifecycle decision remains open, email stays read-only and the dependency is not complete.
6. If backend does not support avatars, do not add upload controls. Use only existing static/initials identity presentation where available.
7. Validate with frontend schemas consistent with backend rules; backend remains authoritative. Do not create stricter business constraints or contradictory normalization.
8. After a successful update, reload identity/profile data through the canonical endpoint specified by backend contract and update the existing store through established actions. Do not manually mutate role/permission state.
9. Map documented backend errors to safe form feedback; preserve existing auth-client behavior for `401`; never render raw exception details.
10. Use TailAdmin-derived CMS primitives, semantic labels, error associations, keyboard focus, pending/disabled states, and current responsive conventions. Do not add a new notification library.
11. Add account menu navigation only for the implemented route. Do not add a Change Password link in this task; FE-25 owns that independent feature and is itself backend-blocked.

## 9. Applicable Contracts

**Current API Contract**

| Method | Path         | Auth   | Request | Response / limits                                                                                               |
| ------ | ------------ | ------ | ------- | --------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/me` | Bearer | None    | `user: { id, email, mustChangePassword }`, `roles: string[]`, `permissions: string[]`; no profile update fields |

**Profile Update API:** Runtime implementation remains blocked. BE-40 defines `GET /api/v1/me` with `user.displayName: string | null` and strict `PATCH /api/v1/me` accepting `{ displayName: string }`; display names are trimmed and limited to 1–80 Unicode code points. Email remains read-only; roles, permissions, status, password, and avatar are not editable. Implement against runtime only after BE-40 completion and OpenAPI validation.

**UI Contract:** Authenticated `/profile`; fields and editable controls are limited to the completed backend contract. Roles/permissions are read-only. Email is read-only unless its complete lifecycle is approved. No avatar upload without backend support.

**Database Contract:** Not applicable - frontend task; existing DB columns do not grant API visibility/editability.

**Configuration Contract:** Not applicable - no new configuration.

## 10. File Impact

**Expected Create:** profile view and focused CMS tests after backend dependency completion.

**Expected Modify:** `apps/cms/src/router/index.ts`, `api/client.ts`, `api/types.ts`, and `CmsProfileMenu.vue` or `navigation.ts` only as required by the approved route/API contract; relevant store code only if the canonical response requires a supported identity update.

**Expected Not Modified:** `apps/api/**`, database schema/migrations, admin user CRUD semantics, RBAC role/permission editing, email verification lifecycle, avatar infrastructure, dependencies, environment files, and unrelated CMS modules.

Expected paths are guidance; agent must inspect repository before finalizing changes.

## 11. Runtime Behavior

After auth restoration, an authenticated user opens `/profile`. The page loads the approved self-profile source and renders only returned, contract-approved fields. Editable controls exist only for fields classified editable by the backend. On submit, the page validates against backend-compatible rules and sends only the approved request. Pending state prevents duplicate submit. A success response triggers the contract's canonical identity/profile reload and updates the auth store through its existing action. Documented validation/conflict errors render safely; expired sessions follow current auth handling; network/unknown server errors use generic CMS feedback. Authorization fields remain read-only throughout.

## 12. Error And Edge Cases

| Scenario                             | Expected Result                                                                                                                                  | Security / Recovery                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Backend self-profile contract absent | Do not implement; task remains blocked                                                                                                           | No guessed endpoint/fields             |
| `/me` loading                        | Show existing loading state; do not prepopulate invented data                                                                                    | Authenticated request only             |
| Backend returns only current fields  | Display only approved identity values; no editable controls without contract                                                                     | Schema does not imply editability      |
| Validation failure                   | Map exact documented field/form errors                                                                                                           | No raw backend details                 |
| Conflict response                    | Handle only if contract defines status and recovery                                                                                              | Do not invent concurrency semantics    |
| Session expires                      | Existing auth client restores or redirects according to current behavior                                                                         | No stale identity mutation             |
| Successful update                    | Reload canonical identity/profile source before showing refreshed values                                                                         | Avoid stale Pinia context              |
| Email lifecycle unspecified          | Keep email read-only                                                                                                                             | No direct update or verification guess |
| Avatar endpoint absent               | No upload interaction                                                                                                                            | No fake endpoint or false success      |
| Unchanged form                       | Follow backend/UI behavior only if contract defines it; otherwise do not send a mutation when existing form conventions establish no-op handling | No invented success response           |

## 13. Security Requirements

Use the authenticated API client and existing CSRF/session protections. Treat all profile values as untrusted input and use Zod/API response schemas. Backend remains authority for editable fields and authorization. Never allow the form to mutate roles or permissions absent explicit backend support. Do not expose raw errors, tokens, or sensitive user data in logs/URLs. Email and avatar lifecycle are not inferred. Do not use admin user CRUD as a self-service security boundary.

## 14. Test Requirements

| Category           | Required proof                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Happy Path         | Approved read contract populates actual fields; approved update sends exact body; success reloads canonical identity/profile and updates store |
| Validation         | Required, length, format, and normalization behavior exactly matches approved backend contract; no invented stricter rules                     |
| Negative / Failure | Documented validation/conflict errors, `401`, network, and safe server failure render expected feedback                                        |
| Security           | Role/permission fields are not editable; email is read-only absent lifecycle contract; no fabricated avatar API; authenticated client only     |
| Regression         | Login, `/me` bootstrap, refresh, permission guards, FE-24, and user administration retain existing behavior                                    |
| Isolation          | Vitest/jsdom/Vue Test Utils tests use isolated API fixtures/mocks, deterministic cleanup, and are execution-order independent                  |

## 15. Task-Level Expected Results

- An authenticated `/profile` page uses a real self-profile backend contract.
- It presents only fields returned and classified for display/editing by that contract.
- Successful changes refresh canonical identity state instead of mutating arbitrary auth data.
- Role/permission, email lifecycle, and avatar behavior remain within explicit backend approvals.
- Tests prove field classification, update flow, error behavior, and store synchronization.

## 16. Acceptance Criteria

- [ ] Backend self-profile contract is approved, implemented, and linked by task ID before frontend implementation begins.
- [ ] Authenticated `/profile` reads from the approved current-user API; no admin user endpoint is used as self-service.
- [ ] Only backend-classified editable fields render as editable controls; roles and permissions remain read-only.
- [ ] Email remains read-only unless its complete approved lifecycle is implemented.
- [ ] No avatar upload is shown without a supported backend contract.
- [ ] Successful update reloads the canonical identity/profile source and synchronizes the auth store.
- [ ] Validation, pending, success, session-expiry, and documented error states are accessible and tested.
- [ ] Focused/full CMS tests, lint, typecheck, build, Anti-Slop, and applicable visual review pass.
- [ ] `git diff --check` and scope review pass with no backend or unrelated changes.

## 17. Anti-Slop Requirements

- **Code Anti-Slop:** required; check for guessed fields/endpoints, duplicated schemas, unnecessary state wrappers, dead code/dependencies, fake save/upload behavior, hidden TODO/FIXME/HACK, unjustified `any`/assertions, and unrelated changes.
- **UI Anti-Slop:** required after implementation; avoid generic profile card grids and fake identity data; preserve existing CMS hierarchy and include real loading/success/error/disabled states.
- **Visual Verification:** required for rendered profile at desktop/tablet/mobile where browser capability exists; compare with current CMS patterns. Report `NOT RUN  -  <reason>` if unavailable.
- Apply copy/accessibility/responsive checks for labels, errors, keyboard/focus, status announcements, and mobile overflow. Planning phase Anti-Slop was requested during planning; this document was reviewed for invented contract claims and unnecessary prose.

## 18. Validation Requirements

- **Static:** CMS lint, typecheck, formatting where configured, `git diff --check`.
- **Automated Tests:** focused profile/API/store/router tests and full CMS suite; confirm exact scripts from `apps/cms/package.json` during implementation.
- **Build:** CMS production build.
- **Database:** Not applicable - frontend task.
- **UI:** browser inspection at desktop/tablet/mobile and keyboard/error-state review when available.
- **Anti-Slop:** Code + UI, with copy/accessibility/responsive review; rerun after fixes.

## 19. Completion Evidence

- AC-001/002 → linked backend task/OpenAPI plus route/read tests proving the exact self-profile source.
- AC-003/004/005 → component tests for editable classification, email lifecycle, and absence of unsupported avatar upload.
- AC-006 → API/store integration test proving canonical refresh after update.
- AC-007/008 → focused/full test output, lint/typecheck/build, Anti-Slop results, browser evidence or explicit NOT RUN, and final diff/status review.

## 20. Traceability

| Trace Type          | References                                                                             |
| ------------------- | -------------------------------------------------------------------------------------- |
| PRD                 | Not defined for account self-service                                                   |
| Feature             | `fe/26-update-profile`                                                                 |
| Requirement         | User-provided authenticated Update Profile request                                     |
| Acceptance Criteria | AC-001-AC-008 in this task                                                             |
| API Operation       | `GET/PATCH /api/v1/me` as defined by BE-40; PATCH runtime not yet implemented          |
| Database            | Not applicable to frontend; user schema is not an editability contract                 |
| Test IDs            | Not applicable - project has no test ID registry                                       |
| Design/Figma        | `docs/DESIGN.md`; existing CMS TailAdmin-derived patterns; no dedicated profile design |

## 21. Open Points

- Backend contract is documented in [`be/40-authenticated-self-profile`](../../be/40-authenticated-self-profile/technical.md), but the API implementation, migration, audit, tests, and OpenAPI update remain outstanding. FE-26 stays blocked until BE-40 is complete.
- BE-40 approves email as read-only; no email-change lifecycle is in scope.
- Avatar upload/storage and profile fields other than `displayName` are not approved; do not add them.
- Task remains blocked until the BE-40 runtime contract is implemented and validated. Admin user CRUD does not provide self-service behavior.

## 22. Definition Of Done

- [ ] Backend dependency is approved and complete before implementation.
- [ ] Acceptance criteria and scope are satisfied.
- [ ] Focused tests, CMS suite, lint, typecheck, and build pass.
- [ ] Required Code/UI Anti-Slop and applicable browser verification pass.
- [ ] `git diff --check`, changed-file review, secret/PII review, and no-unrelated-change review pass.
