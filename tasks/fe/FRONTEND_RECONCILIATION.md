# CMS Auth + RBAC Frontend Task Update

## Approved Initial FE Scope

Initial CMS frontend scope is **authentication-complete and RBAC-ready**, not business-module-complete:

- CMS shell/template with `/login`, `/`, and catch-all Not Found.
- API client aligned to existing auth contracts.
- Pinia authentication/session state with approved browser storage policy.
- Authentication route guard with safe `returnTo`.
- RBAC UX boundary prepared for backend user → role → permission → action data.
- Permission-aware navigation/action foundation without client authorization authority.
- Minimal loading/error/Not Found/denied/unavailable states.
- Focused tests and final quality gate.

No future business modules or permission keys are invented.

## Task Status

| Task | Contract Status | Execution Status | Depends On | Purpose | Remaining Blocker |
| --- | --- | --- | --- | --- | --- |
| `fe/01` | Complete | Complete — verified | None | Initial CMS foundation | None |
| `fe/02` | Complete | Complete — verified | `fe/01` | Zod env validation before mount | None |
| `fe/03` | Ready | Implemented — verification incomplete | `fe/02` | Neutral shell/router/navigation | Browser verification and human visual review |
| `fe/04` | Ready | Waiting dependency | `fe/03` | Minimal UI foundation | `fe/03` evidence |
| `fe/05` | Ready | Ready | `fe/02` | Axios API boundary | None |
| `fe/06` | Ready | Waiting dependency | `fe/05` | Pinia auth/session lifecycle | `fe/05` implementation |
| `fe/07` | Ready | Waiting dependencies | `fe/04`, `fe/06` | Login form/flow | `fe/04`, `fe/06` |
| `fe/08` | Ready | Waiting dependencies | `fe/06`, `fe/07` | Authentication route guard | `fe/06`, `fe/07` |
| `fe/09` | Partially Ready | Backend-blocked | `fe/06`, `fe/08` | RBAC UX/permission boundary | Frontend-consumable user/roles/effective-permissions source |
| `fe/10` | Ready | Waiting dependencies | `fe/04`, `fe/09` | Minimal shared initial-flow states | `fe/04`, `fe/09` |
| `fe/11` | Ready | Waiting dependency | `fe/10` | Initial-scope focused tests | `fe/10` |
| `fe/12` | Ready | Waiting dependency | `fe/11` | Final initial-scope quality gate | `fe/11` |

## Auth/API Alignment

Verified current backend/OpenAPI contracts:

- `POST /api/v1/auth/login` accepts `{ email, password }`.
- `POST /api/v1/auth/refresh` accepts `{ refreshToken }`.
- Login and refresh return `{ accessToken, refreshToken, tokenType: "Bearer", expiresIn }`.
- `POST /api/v1/auth/logout` revokes current session and returns `204`.
- `POST /api/v1/auth/logout-all` revokes all user sessions and returns `204`.
- Protected logout routes require `Authorization: Bearer <accessToken>`.
- Auth errors include documented `400`, `401`, `413`, `429`, and `500` responses with safe message envelopes.
- Backend permission middleware distinguishes `401` authentication failure from `403` authorization denial.
- No documented request/correlation ID response header exists; frontend does not invent a required propagation protocol.

Frontend contract decisions now recorded:

- API client timeout: 10 seconds.
- No generic automatic retries, especially not for mutations.
- Access token: memory-only.
- Refresh token: current JSON backend transport, stored in `sessionStorage`; not equivalent to Secure HttpOnly cookie security.
- 401 orchestration belongs to auth/session state, not generic client.
- 403 remains authorization failure, not authentication failure.

## RBAC Alignment

### Backend RBAC capabilities found

- Database schema contains `users`, `roles`, `permissions`, `user_roles`, and `role_permissions`.
- Relationships implement user → role → permission resolution.
- Permission codes are backend-validated by format and stored uniquely.
- Permission middleware resolves a required permission and returns `403` when denied.
- Backend remains authorization authority.

### Frontend responsibilities

- Hold typed roles/effective-permission state only when backend supplies it.
- Provide one `can(permission)`-equivalent UX boundary.
- Support optional permission route metadata.
- Hide unavailable navigation/actions by default.
- Render authenticated denied/403-style state.

### Backend responsibilities

- Authenticate bearer tokens.
- Resolve persisted user-role-permission relations.
- Enforce route permissions and return `401`/`403`.
- Remain authoritative regardless of client visibility or Pinia/JWT state.

### Permission source discovered

No frontend-consumable authenticated-user, roles, or effective-permissions endpoint exists in current OpenAPI or backend routes. Internal RBAC service/repository is not a frontend API contract.

### Missing backend contract

`fe/09` has a localized backend follow-up requirement: expose an approved bearer-authenticated source for CMS user identity, assigned/effective roles if needed for display, and effective permission keys needed for UX filtering. No endpoint name or payload is invented. Authorization remains backend-enforced; raw internal persistence details remain private.

## Ready to Implement

- `fe/05` API client: predecessor `fe/02` complete; contract ready.

## Ready Contract / Waiting Dependency

- `fe/04`: ready contract, waiting for `fe/03` browser/human evidence.
- `fe/06`: ready contract, waiting for `fe/05`.
- `fe/07`: ready contract, waiting for `fe/04` and `fe/06`.
- `fe/08`: ready contract, waiting for `fe/06` and `fe/07`.
- `fe/10`: ready contract, waiting for `fe/04` and `fe/09`.
- `fe/11`: ready contract, waiting for `fe/10`.
- `fe/12`: ready contract, waiting for `fe/11`.

## Backend-Blocked

- `fe/09` only: missing frontend-consumable authenticated user/roles/effective-permissions contract.

This does not block shell, API client, login, auth state, or authentication routing contracts from being prepared or implemented by dependency order.

## Deferred Business Features

Users management, role management, permission management, products, orders, reports, settings, analytics, and all other business modules/routes remain future approved tasks.

## Skill Routing

- `frontend-patterns`: Vue architecture and implementation.
- `ui-ux-pro-max`: UI decisions only when needed.
- `design-system`: minimal tokens/specs for `fe/04` only.
- `ui-styling`: Vue/Tailwind styling.
- `tdd-workflow`: behavior-focused tests.
- `security-review`: auth/RBAC-sensitive work.
- `antislop`: every task; specialists only when applicable.
- `antislop-ui`, `antislop-human`, `antislop-layoutmobile`: rendered UI scope only.
- `browser-verification`: meaningful rendered UI/critical auth flows.
- `verification-loop`: final evidence.

Creative skills remain out of scope.

## Dependency Graph

```text
fe/01 → fe/02

fe/03 → fe/04 ───────────────┐
  │                          │
  └──────────────┐           │
                 ├→ fe/07 → fe/08 → fe/09 → fe/10 → fe/11 → fe/12
fe/02 → fe/05 → fe/06 ───────┘
```

`fe/09` keeps a ready frontend architecture contract but remains blocked by the missing backend data source. No dependency cycle found.

## Files Changed

- `tasks/fe/01-initial-project/**`
- `tasks/fe/02-environment-validation/**`
- `tasks/fe/03-cms-layout/**`
- `tasks/fe/04-theme-design-system/**`
- `tasks/fe/05-api-client/**`
- `tasks/fe/06-auth-state/**`
- `tasks/fe/07-login-page/**`
- `tasks/fe/08-route-guard/**`
- `tasks/fe/09-permission-guard/**`
- `tasks/fe/10-ux-states/**`
- `tasks/fe/11-frontend-testing/**`
- `tasks/fe/12-frontend-quality-gate/**`
- `tasks/fe/FRONTEND_RECONCILIATION.md`

## Verification

- All `fe/01`–`fe/12` contracts and explanations inspected.
- Current CMS source, tests, backend auth/RBAC source, schema, OpenAPI, docs, and skill registry inspected.
- Backend permission/profile API availability verified absent.
- No stale auth API TODO remains where OpenAPI resolves the contract.
- `git diff --check` — PASS.
- This operation modified task documentation only.
- Existing application-source changes from prior implementation remain untouched.
- No dependencies, manifests, lockfiles, backend files, migrations, or skills changed.

## Application Source Changes

None

CMS AUTH + RBAC FRONTEND CONTRACT PASS — implementation may proceed by dependency order

## RBAC Contract Resolution

### Backend RBAC Already Available

- `apps/api/src/config/drizzle/schema.ts` contains persistent `users`, `roles`, `permissions`, `userRoles`, and `rolePermissions` relations.
- `apps/api/src/modules/rbac/repositories/permission.repository.ts` resolves one permission through persisted role assignments.
- `apps/api/src/modules/rbac/services/permission.service.ts` validates permission-code format and delegates resolution.
- `apps/api/src/middleware/permission.middleware.ts` enforces authenticated permission checks and returns safe `401` or `403` responses.
- `apps/api/src/middleware/authentication.middleware.ts` exposes verified access principal identity to backend middleware.
- `docs/ARCHITECTURE.md` and `docs/SECURITY.md` keep backend as authorization authority.

Internal resolution is not a frontend API contract. Current implementation supports server-side authorization only.

### Frontend-Consumable Permission Source

**MISSING**

Evidence:

- `apps/api/src/app.ts` mounts only auth routes under `/api/v1/auth`.
- `apps/api/src/modules/auth/v1/auth.router.ts` exposes login, refresh, logout, and logout-all only.
- `apps/api/src/config/openapi/openapi.ts` and `apps/api/src/modules/auth/v1/auth.openapi.yaml` document no current-user, profile, session-context, or effective-permissions operation.
- `apps/cms/src/stores/auth.ts` has a typed identity shape but no permission hydration source or `can()` boundary.

No endpoint, role name, or permission key was inferred or invented.

### fe/09 Contract

- **Responsibility:** frontend-only RBAC UX after backend context exists; backend remains authorization authority.
- **Permission representation:** exact stable backend `permissions.code` values returned by backend; no aliases or role-label checks.
- **`can()` boundary:** one typed helper/composable; allow only when hydrated permission key exists; deny when absent or unresolved.
- **Navigation policy:** ungated items visible; gated items visible only when `can()` allows; denied items hidden by default.
- **Action policy:** centralized permission boundary; hide unavailable actions by default; disable only with approved accessible feature UX.
- **Route policy:** `fe/08` handles unauthenticated redirects; authenticated missing permission renders denied/403 state, never login.
- **Denied UX:** neutral accessible state with safe return route and no permission/debug details.
- **Hydration policy:** backend computes current context; frontend hydrates per authenticated session; logout and failed restoration clear context; stale client state never authorizes API access.

### Backend Follow-Up

**Proposed task:** `tasks/be/25-authenticated-rbac-context/`

- **Task name:** Authenticated RBAC Context.
- **Owning module:** Auth-owned authenticated context, reusing existing RBAC resolution boundary.
- **Capability:** bearer-authenticated current-user context containing minimum CMS identity data and effective permission keys.
- **Contract rule:** exact endpoint method/path and optional role fields require approval during backend implementation; this report does not claim a live endpoint.
- **Required behavior:** current user from verified auth principal, server-side effective permission resolution, safe generic `401`, empty permissions when applicable, multi-role union, no sensitive fields, focused tests, and OpenAPI coverage.
- **Must not expose:** passwords, hashes, access/refresh tokens, token hashes, session secrets, audit metadata, raw join rows, or unnecessary database fields.
- **Why required:** `fe/09` cannot safely implement frontend hydration or permission tests against internal services.

### fe/11 Remaining Verification

After `be/25` and `fe/09` complete, add only these missing tests:

- permission helper: allowed, missing, and unresolved deny-by-default behavior;
- permission-aware navigation: ungated, permitted, and denied visibility;
- authenticated permission route denial versus unauthenticated login redirect;
- backend context hydration into frontend state;
- logout and failed-restoration permission cleanup.

These must remain fixture-based frontend tests unless an actual backend integration is executed. Existing 47 tests and current lint/typecheck/build evidence remain unchanged.

### Updated Dependency Chain

```text
be/25-authenticated-rbac-context
        ↓
fe/09-permission-guard
        ↓
fe/10-ux-states → fe/11-frontend-testing → fe/12-frontend-quality-gate
```

`fe/03` through `fe/08` do not wait on `fe/09` except where their own contracts explicitly reference later UX integration. No application source, backend source, package, lockfile, migration, or OpenAPI file changed in this resolution.
