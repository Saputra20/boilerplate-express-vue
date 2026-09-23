# be/13-rbac-permissions — RBAC And Permissions

## 1. Metadata

| Field           | Value                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| Task ID         | `be/13-rbac-permissions`                                                  |
| Batch           | N/A                                                                       |
| Owning Feature  | N/A                                                                       |
| Workstream      | Backend                                                                   |
| Task Category   | RBAC foundation                                                           |
| Repository/App  | `apps/api`                                                                |
| Status          | Complete — validation evidence recorded below                             |
| Priority        | Foundation execution order 13                                             |
| Suggested Size  | Small — permission resolver, middleware, minimal test catalog, and tests  |
| Depends On      | `be/04-identity-schema`, `be/10-login-session`, `be/12-logout-revocation` |
| Blocks          | `be/14-audit-trail`                                                       |
| Execution Order | 13                                                                        |

## 2. Outcome

Provide deny-by-default server-side authorization based only on persisted `user → role → permission` relations. A focused permission middleware protects future explicitly mapped routes, returns safe `403` denials for authenticated users lacking a grant, and does not add business endpoints or policies.

## 3. Context

- `apps/api/src/database/schema.ts` already defines `roles`, `permissions`, `user_roles`, and `role_permissions` with stable lowercase codes, relation constraints, and lookup indexes.
- `apps/api/src/auth/access-auth-middleware.ts` verifies typed access JWTs and session/JTI/user state before controller execution.
- `apps/api/src/app.ts` currently installs only auth routes: login, refresh, logout, and logout-all. No business resource route exists.
- `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/SECURITY.md`, and `AGENTS.md` remain source-of-truth guidance.
- OpenAPI infrastructure does not yet exist. Do not create parallel endpoint documentation.

## 4. Dependencies

- `be/04-identity-schema` provides RBAC tables and constraints.
- `be/10-login-session` provides user/session identity context.
- `be/12-logout-revocation` provides access authentication and revocation enforcement.
- PostgreSQL is required for repository/integration validation. Redis is not required; permission caching is out of scope.

## 5. In Scope

- Persistent effective-permission resolution through `user_roles`, `role_permissions`, and `permissions`.
- Focused deny-by-default permission middleware after successful access authentication.
- Explicit route-level permission declaration boundary such as `requirePermission('system.access')`; actual names follow repository conventions.
- Safe `401` versus `403` behavior.
- Minimal isolated foundation test catalog: role `admin`, permission `system.access`, and an explicit `role_permissions` grant.
- Focused authorization-denial application logging with safe metadata when practical.
- Tests, validation, and completion evidence.

## 6. Out of Scope

- Role, permission, user-role, or role-permission management APIs.
- CMS role editor, user management UI, business permission catalog, and production placeholder endpoints.
- Row-level, ownership, tenant, organization, field-level, ABAC, ReBAC, inheritance, wildcard, or explicit-deny authorization.
- JWT role/permission snapshots, hard-coded admin bypasses, permission caching, and Redis authorization state.
- Login, refresh, logout, session, token-revocation, or audit-trail successor behavior.

## 7. Existing Implementation

- `apps/api/src/database/schema.ts` contains `roles`, `permissions`, `userRoles`, and `rolePermissions`.
- `apps/api/src/auth/permission-repository.ts`, `permission-service.ts`, and `permission-middleware.ts` resolve persisted RBAC grants and enforce explicit permission declarations.
- `apps/api/src/auth/access-auth-middleware.ts` exposes only verified access principal data to downstream authorization middleware.
- `apps/api/src/app.ts` exposes no protected business resource route.
- `apps/api/tests/rbac-permissions.test.ts` proves middleware behavior and test-only RBAC relations.
- No seed/bootstrap framework exists. Do not add a broad seed system for this task.

## 8. Implementation Requirements

### 8.1 Authorization Model

- Backend is authorization source of truth: `user → role → permission → action`.
- Resolve permissions from PostgreSQL at authorization time. Do not use client input, hidden UI state, `isAdmin`, JWT snapshots, or token claims as permission grants.
- A user may hold multiple roles. Effective permissions are their union; duplicate grants do not change outcome.
- `admin` has no bypass. It is allowed only through its persisted `role_permissions` records.
- Permission and role codes are stable lowercase machine identifiers. Permission format is `resource.action`.

### 8.2 Minimal Foundation Catalog

| Entity     | Code                        | Purpose                                                  |
| ---------- | --------------------------- | -------------------------------------------------------- |
| Role       | `admin`                     | Minimal foundation role for authorization tests.         |
| Role       | `viewer`                    | Restricted test role required to prove permission union. |
| Permission | `system.access`             | Foundation permission proving explicit RBAC evaluation.  |
| Permission | `system.observe`            | Foundation test permission required to prove role union. |
| Grant      | `admin` → `system.access`   | Normal `role_permissions` relation; never a bypass.      |
| Grant      | `viewer` → `system.observe` | Normal `role_permissions` relation; never a bypass.      |

- This catalog is limited to isolated RBAC test/bootstrap data because no current production resource route needs a permission.
- Do not create `users.*`, business-domain, or additional speculative permissions or roles.
- Do not add runtime startup writes, an empty migration, or a broad seed framework. Tests create and clean up deterministic synthetic rows using existing schema conventions.

### 8.3 Permission Middleware

- Permission middleware runs after access authentication and before route/controller handling.
- Routes requiring authorization explicitly declare one permission code. Do not derive permission from path, HTTP method, controller, or table name.
- Missing/invalid middleware configuration or a referenced permission absent from persistent data is a server configuration failure. Reject safely; never allow.
- A protected route allows only when access authentication succeeded and at least one persisted role grants the declared existing permission.
- No current production route is permission-protected. Prove the boundary through a focused middleware/integration test route only; do not expose a placeholder production endpoint.

### 8.4 Resource Policy

- Foundation policy is coarse-grained action permission only.
- Permission answers whether a principal may perform an action, not whether it may access a particular row, field, tenant, organization, or owned resource.
- No implicit self-service exception exists. A future resource-owning task must define any self/ownership policy.

### 8.5 Denial, Logging, And Error Handling

- Missing, malformed, invalid, expired, revoked, disabled, or soft-deleted authentication remains `401` using existing authentication behavior.
- Authenticated principal without required permission receives `403` with centralized sanitized envelope/message equivalent to `Forbidden`.
- Public `403` does not reveal roles, required permission, permission catalog, query details, or schema details.
- Log authorization denial only with safe metadata when practical: request ID, user ID, session ID, route/action, required permission, and outcome. Never log credentials, authorization header, tokens, passwords, or secrets.
- Durable authorization audit-table expansion belongs to `be/14-audit-trail`; do not alter current auth-audit vocabulary solely for RBAC denial.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no RBAC configuration or cache setting is introduced.

### API Contract

| Method | Route              | Authentication                  | Permission                                                    | Notes                         |
| ------ | ------------------ | ------------------------------- | ------------------------------------------------------------- | ----------------------------- |
| `POST` | `/auth/login`      | None                            | None — authentication/session capability, not RBAC-protected. | Public credential exchange.   |
| `POST` | `/auth/refresh`    | Refresh credential in JSON body | None — authentication/session capability, not RBAC-protected. | Access token not required.    |
| `POST` | `/auth/logout`     | Bearer access token             | None — authentication/session capability, not RBAC-protected. | Current session only.         |
| `POST` | `/auth/logout-all` | Bearer access token             | None — authentication/session capability, not RBAC-protected. | Current user's sessions only. |

No business resource route currently exists. RBAC is proven through focused middleware/integration tests only; no production placeholder endpoint is added.

### Authorization Contract

| Condition                                                  | Result                                               |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| Authentication missing or invalid                          | Existing generic `401 Unauthorized`.                 |
| Authenticated principal has an explicit persisted grant    | Route continues.                                     |
| Authenticated principal lacks required permission or roles | Generic `403 Forbidden`.                             |
| Middleware references nonexistent permission               | Sanitized server/configuration failure; never allow. |

### Database Contract

- Reuse `roles`, `permissions`, `user_roles`, and `role_permissions`.
- Existing unique keys, composite relation keys, and indexes satisfy foundation resolution queries.
- Database migration: **NOT REQUIRED — existing RBAC schema satisfies contract.**
- Do not generate an empty migration or create duplicate RBAC tables.

### UI Contract

Not applicable — CMS permissions are UX only and no UI changes belong here.

## 10. File Impact

Expected paths are guidance; inspect before editing.

| Change                | Paths                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Expected create       | Focused RBAC resolver/middleware under `apps/api/src/auth/` or a verified adjacent backend boundary; `apps/api/tests/rbac-permissions.test.ts`. |
| Expected modify       | `apps/api/src/app.ts` only if a focused internal test wiring seam requires it; logging/error boundary only if existing conventions require it.  |
| Expected not modified | Auth route behavior, JWT claims, refresh rotation, logout revocation, RBAC schema/migrations, CMS, secrets, and future business modules.        |

## 11. Runtime Behavior

1. Route uses access-authentication middleware where authentication is required.
2. Route explicitly invokes permission middleware with one stable permission code.
3. Middleware resolves effective permissions through persisted user-role-role-permission relations in one focused query path without N+1 lookup.
4. Existing declared grant allows route handling.
5. Missing grant denies `403` with safe public response and optional safe application log.
6. Unknown declared permission fails safely as server configuration error; it never grants access.
7. Auth routes continue without RBAC checks.

## 12. Error And Edge Cases

| Scenario                                         | Expected Result                       | Security / Recovery                                 |
| ------------------------------------------------ | ------------------------------------- | --------------------------------------------------- |
| Missing/invalid access authentication            | Existing generic `401`                | Do not evaluate or reveal permission state.         |
| Authenticated user has no roles                  | `403`                                 | Deny by default.                                    |
| Roles have no required grant                     | `403`                                 | Do not reveal assigned roles.                       |
| Multiple roles grant different permissions       | Union grants each declared permission | No explicit-deny model.                             |
| Client sends role/permission field               | No authorization effect               | Ignore as untrusted transport data.                 |
| Referenced permission absent from DB             | Sanitized `500`/configuration failure | Never convert unknown permission to allow or `403`. |
| Disabled/deleted user or revoked/expired session | Existing generic `401`                | Access authentication rejects first.                |
| Permission query/storage failure                 | Sanitized `500`                       | Do not allow on failure.                            |

## 13. Security Requirements

- Deny by default.
- Backend persistent RBAC data is sole authorization authority.
- No hard-coded `admin` or super-admin bypass.
- Explicit route permission declaration is mandatory for any future RBAC-protected route.
- Permission/role codes remain stable machine identifiers; display labels do not authorize.
- Preserve existing session/JTI/account-state authentication checks.
- No token, password, secret, or authorization-header logging.
- Do not add a cache without explicit invalidation and correctness policy.

## 14. Test Requirements

| Scenario                                   | Expected Result                              | Test Type                 |
| ------------------------------------------ | -------------------------------------------- | ------------------------- |
| One granted role                           | Allows declared permission                   | Focused integration/unit  |
| Multiple roles                             | Effective permissions are union              | Focused integration/unit  |
| No roles or irrelevant role                | `403`                                        | Focused integration/unit  |
| Admin grant                                | Allows only via persisted `role_permissions` | Focused integration/unit  |
| Client-supplied fake role/permission       | Does not authorize                           | Focused route/integration |
| Missing/invalid/revoked access auth        | `401`                                        | Focused route/integration |
| Unknown declared permission                | Safe server failure, never allow             | Focused integration/unit  |
| Disabled/deleted/revoked-session principal | `401`                                        | Access-auth regression    |
| Coarse permission check                    | No ownership/row behavior exists             | Focused unit              |
| Auth routes                                | Continue without RBAC permissions            | Regression                |

- Use synthetic UUIDs, roles, permissions, and keys only.
- Tests are isolated, deterministic, and clean up RBAC relations.
- Do not assert or snapshot credentials, tokens, authorization headers, or full logs.

## 15. Task-Level Expected Results

- Permission resolver and explicit deny-by-default middleware exist at backend boundary.
- Existing RBAC tables resolve union permissions without N+1 behavior.
- `admin` succeeds only through an explicit persisted `system.access` grant in isolated tests.
- Authorization denial distinguishes `401` authentication failure from `403` permission denial.
- No business API route, permission catalog, row policy, schema migration, or cache is added.

## 16. Acceptance Criteria

- [x] Backend persistent RBAC relations are authorization source of truth.
- [x] Permission codes use stable lowercase `resource.action` identifiers.
- [x] Authorization denies by default.
- [x] Every RBAC-protected route uses an explicit permission declaration.
- [x] Current auth foundation routes require no arbitrary RBAC permission.
- [x] Unauthenticated/invalid authentication returns `401`; authenticated missing permission returns `403`.
- [x] Effective permissions resolve through `user → role → permission` and union multiple roles.
- [x] `admin` uses normal `role_permissions`; no bypass exists.
- [x] Initial catalog remains limited to `admin`, `viewer`, `system.access`, and `system.observe` in isolated foundation tests.
- [x] Resource policy remains coarse-grained; no row-level/self-service/business rule exists.
- [x] Client role/permission state cannot authorize.
- [x] Unknown permission references fail safely and never allow.
- [x] Existing RBAC tables are reused; no schema migration or empty migration is created.
- [x] Focused tests, regression suite, lint, typecheck, Code Anti-Slop, and `git diff --check` pass.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Reject generic policy engines, factories, duplicated authentication checks, hard-coded bypasses, speculative permissions/roles, fake production route, broad seed framework, cache, empty migration, hidden TODO/FIXME/HACK, unchecked `any`/assertions, unused code/dependencies, and incomplete authorization behavior. UI Anti-Slop and visual verification: not applicable — no UI work.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api format:check`
- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused RBAC permission-resolution/middleware tests.
- Full `bun run --cwd apps/api test` regression suite.

### Database

- No migration validation required — existing schema is reused.
- Validate authorization query behavior against isolated PostgreSQL if repository tests require database integration.

### Build / UI

Not applicable — API has no build script and no UI changes.

### Anti-Slop

- Code Anti-Slop during implementation and after fixes.

## 19. Completion Evidence

| Acceptance criterion                  | Evidence                                                               |
| ------------------------------------- | ---------------------------------------------------------------------- |
| Permission resolution and union       | Focused Jest test plus isolated PostgreSQL evidence                    |
| Explicit declaration and deny default | Middleware/route integration test                                      |
| `401` versus `403`                    | Authentication and authorization test                                  |
| No admin bypass/client authority      | Relation-based fixture, negative test, and code review                 |
| No business/row policy or migration   | Changed-file review and `db:generate` no-change output                 |
| Regression/static/security            | Prettier, ESLint, TypeScript, 81-test Jest, Code Anti-Slop, diff check |

## 20. Traceability

| Trace Type       | References                                                                |
| ---------------- | ------------------------------------------------------------------------- |
| Architecture     | `docs/ARCHITECTURE.md` authorization boundary                             |
| Database         | `roles`, `permissions`, `user_roles`, `role_permissions`                  |
| API              | Current auth-route mapping table in this task                             |
| Security         | `docs/SECURITY.md`, `AGENTS.md`                                           |
| Dependency tasks | `be/04-identity-schema`, `be/10-login-session`, `be/12-logout-revocation` |
| Test IDs         | Not applicable — project has no test-ID system.                           |

## 21. Open Points

None.

## 22. Definition Of Done

- [x] Approved scope and all acceptance criteria are implemented without successor behavior.
- [x] Authorization uses persistent RBAC data and explicit route permission declarations.
- [x] Auth routes remain free of arbitrary RBAC grants.
- [x] No business catalog, row policy, cache, duplicate schema, or empty migration appears.
- [x] Focused and regression tests pass.
- [x] Code Anti-Slop passes.
- [x] Format, lint, typecheck, and `git diff --check` pass.
- [x] Changed-file, secret, and human review complete.
