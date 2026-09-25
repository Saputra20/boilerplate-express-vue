# be/28-user-crud — Administrative User CRUD And Role Assignment

## 1. Metadata

| Field           | Value |
| --------------- | ----- |
| Task ID         | `be/28-user-crud` |
| Batch           | N/A |
| Owning Feature  | User administration |
| Workstream      | Backend |
| Task Category   | Administrative API / identity management |
| Repository/App  | `apps/api` |
| Status          | Ready for Planning — blocked pending open-point approval |
| Priority        | Security-sensitive |
| Suggested Size  | Large — user API, auth-state coordination, role assignment, audit, authorization, and integration tests |
| Depends On      | `be/04-identity-schema`, `be/09-password-hashing`, `be/10-login-session`, `be/12-logout-revocation`, `be/13-rbac-permissions`, `be/14-audit-trail`, `be/23-versioned-openapi-swagger`, `be/25-authenticated-rbac-context`, `be/27-role-crud` |
| Blocks          | N/A |
| Execution Order | 28 |

## 2. Outcome

Provide protected administrative APIs for listing, inspecting, creating, updating, activating/deactivating, deleting, and assigning roles to users while reusing the existing identity tables, Argon2id password helper, session/revocation behavior, persisted RBAC, and approved audit boundary.

## 3. Context

- `docs/ARCHITECTURE.md` requires module-first backend boundaries and request flow `middleware → route → controller → service/use case → repository → database`.
- `docs/API.md` requires `/api/v1` business routes, camelCase API JSON, Zod boundary validation, centralized safe errors, and module-owned OpenAPI YAML.
- `docs/SECURITY.md` forbids raw credentials, client-side authorization, JWT role snapshots, and authentication bypasses. Backend persisted RBAC remains authoritative.
- Current `users` schema in `apps/api/src/config/drizzle/schema.ts` contains `id`, lowercase unique `email`, Argon2id `passwordHash`, enum `status` (`active`/`disabled`), `emailVerifiedAt`, `lastLoginAt`, `createdAt`, `updatedAt`, and nullable `deletedAt`.
- Current identity schema has no `name` field. The conceptual payload in the request must not add profile fields without an approved schema contract.
- `apps/api/src/helpers/password.helper.ts` owns password length validation and Argon2id hashing. Controllers must not hash passwords directly.
- Auth login/access/refresh repositories treat only active, non-deleted users as usable and persist sessions, refresh metadata, revocations, and auth audit state according to existing policies.
- `apps/api/src/config/drizzle/schema.ts` contains `userRoles`; no user-management API exists.
- `be/27-role-crud` is still planning/blocked. User role assignment cannot execute until role identifiers, lifecycle, and role-management contract are approved.

## 4. Dependencies

- Existing identity schema, password helper, authentication/session/revocation behavior, RBAC middleware, generic audit boundary, versioned OpenAPI, and approved role CRUD contract are required.
- PostgreSQL and Drizzle are required for user and transactional role-assignment behavior.
- Role assignment may target only existing role IDs from the approved role catalog. No dynamic role creation.
- Disable/delete session impact must reuse existing logout/revocation repository behavior or an explicitly approved owner; do not implement ad hoc token invalidation.
- Audit event names and fail-closed transaction policy require approved alignment with `be/14-audit-trail`.

## 5. In Scope

- Add module-first administrative user API under `apps/api/src/modules/user/` using current conventions.
- Add list, detail, create, partial update, status transition, and delete behavior according to approved identity/retention semantics.
- Add transactional synchronization of `user_roles` from validated existing role IDs.
- Reuse `hashPassword` and existing password limits for administrator-created/reset passwords.
- Restrict updates to explicitly approved administratively editable fields.
- Protect every administrative route with existing authentication and explicit RBAC permissions.
- Validate body, path, query, email, password, status, and role ID inputs with Zod.
- Use generic audit append boundary for approved security-sensitive user operations when the audit contract requires it.
- Add focused API, service, repository, transaction, authentication-state, authorization, audit, OpenAPI, and regression tests.

## 6. Out of Scope

- A second user table/model, profile/name/phone/avatar fields, registration, self-service profile editing, password reset workflow, password change workflow, email verification workflow, MFA, OAuth, or account recovery.
- Direct updates to password hashes, token/session identifiers, login timestamps, audit fields, or JWT claims.
- User-role or permission model duplication, dynamic role/permission creation, admin bypasses, client-side enforcement, or JWT permission snapshots.
- Session policy redesign, token-version fields, blanket logout-all behavior without approval, or retention/purge scheduler.
- CMS user-management UI.
- Bulk operations, import/export, impersonation, restore API, or hard deletion unless explicitly approved.
- Unrelated dependency upgrades, migrations, refactors, or auth behavior changes.

## 7. Existing Implementation

- `apps/api/src/config/drizzle/schema.ts`: `users`, `userRoles`, `roles`, and auth/session tables.
- `apps/api/src/helpers/password.helper.ts`: `hashPassword`, `verifyPassword`, Argon2id options, and 12–128 Unicode-character password limits.
- `apps/api/src/modules/auth/repositories/login.repository.ts`, `access-auth.repository.ts`, `refresh-token.repository.ts`, and logout repositories: current account-state and session/revocation behavior.
- `apps/api/src/modules/auth/services/` and `apps/api/src/middleware/authentication.middleware.ts`: existing auth boundaries.
- `apps/api/src/middleware/permission.middleware.ts`: explicit persisted route-permission enforcement.
- `apps/api/src/modules/rbac/`: persisted permission resolution; must not be duplicated.
- `apps/api/src/modules/audit/`: generic audit append boundary; inspect exact API before emitting events.
- `apps/api/src/app.ts`, `apps/api/src/server.ts`, and `apps/api/src/config/openapi/openapi.ts`: application/module/OpenAPI composition.
- `apps/api/tests/`: Jest/Supertest patterns, auth-state tests, RBAC tests, audit tests, and database integration helpers.
- `tasks/be/27-role-crud/technical.md`: prerequisite role-management contract, currently unresolved.

## 8. Implementation Requirements

### 8.1 Module and architecture

- Use `apps/api/src/modules/user/`; do not add global user repositories/controllers or `apps/api/src/modul/`.
- Repository owns Drizzle queries and transaction primitives.
- Service owns account-state rules, editable-field policy, password hashing orchestration, duplicate checks, role synchronization, and session/audit coordination.
- Controller owns HTTP translation only; it must not hash passwords or decide authorization.
- Router composes authentication and explicit RBAC middleware.
- Existing auth modules remain source of truth for login eligibility, session lifecycle, revocation, and token behavior.

### 8.2 User fields

- Reuse current fields exactly unless an approved identity extension exists.
- `email` remains lowercase unique login identifier. Normalize only according to current identity/login convention.
- `password` is write-only input accepted only where create/reset behavior is explicitly approved; store only `passwordHash` produced by `hashPassword`.
- `status` accepts only existing `active` and `disabled` values.
- `deletedAt` remains lifecycle state if soft deletion is approved; do not invent new status values.
- Never return `passwordHash`, session IDs, refresh metadata, revocation records, audit internals, or token data.
- `emailVerifiedAt` and `lastLoginAt` are not administratively editable unless explicitly approved.

### 8.3 CRUD and state transitions

- Proposed paths use `/api/v1/users` and `/api/v1/users/:id`; exact methods, status codes, envelopes, pagination, and filters require approval.
- Proposed status operation is `PATCH /api/v1/users/:id/status` only if a separate endpoint matches current architecture; otherwise status belongs in the main patch contract.
- Create must validate all requested role IDs before user/role writes and define whether user creation plus role assignment is one transaction.
- Update must reject unknown or security-sensitive fields rather than silently accepting them.
- Disable/deactivate must use existing account status semantics and define how active sessions/tokens become unusable.
- Delete must follow approved retention policy. Current identity contract states soft-deleted users remain indefinitely; changing that requires explicit approval.
- Disabled and deleted users must remain rejected by existing login/access/refresh behavior.

### 8.4 Role assignment

- Accept only role UUIDs from existing `roles` rows and approved role lifecycle.
- Validate every role before modifying `user_roles`.
- Synchronize assignment atomically; validation or write failure preserves existing assignments.
- Define empty `roleIds` behavior explicitly; clearing all roles is destructive authorization state and cannot be inferred.
- Do not assign roles based on role names, client claims, or permission codes.

### 8.5 Authorization and audit

- Every administrative route requires bearer authentication and explicit persisted permission.
- Proposed mappings: user list/detail → `user.read`; create → `user.create`; update/status → `user.update`; delete → `user.delete`; role assignment → `user.role.manage`, pending approved catalog.
- Reuse existing permission vocabulary if keys already exist; do not silently rename or seed new keys.
- Preserve existing `401`/`403` behavior.
- Emit only approved generic audit event types, with allowlisted IDs/metadata and no password, token, hash, headers, cookie, or payload dump.
- Define whether user create/update/status/delete/role assignment audit inserts are required in the same transaction (fail closed) or best effort.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no new environment variable is approved.

### API Contract

Pending approval of exact endpoints, field exposure, status/error mapping, pagination/search/filter/sort, status endpoint choice, role assignment response, and audit behavior.

| Method | Proposed Path | Auth | Permission | Request | Response |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/users` | Bearer | `user.read` | page, limit, search, status, role, sort | Existing paginated user list without secrets |
| GET | `/api/v1/users/:id` | Bearer | `user.read` | UUID path parameter | Safe user detail and approved roles |
| POST | `/api/v1/users` | Bearer | `user.create` | Approved identity fields, write-only password, role IDs | Safe created user |
| PATCH | `/api/v1/users/:id` | Bearer | `user.update` | Approved editable fields only | Safe updated user |
| PATCH/other | `/api/v1/users/:id/status` | Bearer | `user.update` | Approved status | Safe updated status |
| DELETE | `/api/v1/users/:id` | Bearer | `user.delete` | UUID path parameter | Existing delete contract |
| PUT | `/api/v1/users/:id/roles` | Bearer | `user.role.manage` | `{ roleIds: string[] }` | Updated approved role assignment |

### Database Contract

| Item | Contract |
| --- | --- |
| User table | Existing `users`; no duplicate model |
| Role assignment | Existing `user_roles`; composite `(user_id, role_id)` remains authoritative |
| Password | Existing `password_hash`; Argon2id only, never returned/logged |
| Status | Existing enum values `active`, `disabled` |
| Deletion | Existing `deleted_at`; current foundation retains soft-deleted users indefinitely |
| Assignment transaction | Full role synchronization is atomic; failed validation/write preserves prior rows |
| Schema changes | None approved; any extension requires separate explicit decision and migration contract |

### UI Contract

Not applicable — no CMS/UI change.

## 10. File Impact

**Expected Create**

- User module router, controller, service, repository, validation/schema/types, and module-owned OpenAPI YAML under `apps/api/src/modules/user/`.
- Focused user CRUD, role assignment, audit, auth-state, and authorization tests.
- No migration unless an approved identity extension is separately authorized.

**Expected Modify**

- `apps/api/src/app.ts` and `apps/api/src/server.ts` for module composition.
- `apps/api/src/config/openapi/openapi.ts` and OpenAPI tests for actual routes.
- Existing audit/auth/revocation boundary only where required by approved integration contract; preserve existing behavior.
- Permission catalog/bootstrap only if an approved mechanism owns administrative permission entries.

**Expected Not Modified**

- Existing user schema, auth/session/token policy, password helper, RBAC resolver, role tables, CMS, queue, Redis, and unrelated modules.
- Existing migrations and package manifests unless a separately approved schema/dependency decision exists.

Expected paths are guidance; agent must inspect repository before finalizing changes.

## 11. Runtime Behavior

### Read flow

Request → security middleware → access authentication → input validation → `user.read` permission → controller → service/repository reads safe user fields and approved roles → response excludes secrets and auth internals.

### Create flow

Request → authentication/permission → validate identity, password, and all role IDs → hash password through existing helper → transaction creates user, role links, and required audit state → commit → safe response. Any required audit/session-related failure rolls back according to approved policy.

### Update/status/delete flow

Request → authentication/permission → validate allowed fields and current user lifecycle → service applies approved state transition → coordinate session/revocation behavior through existing owner → write required audit state → commit → safe response. No direct token/session mutation from controller.

### Role assignment flow

Request → authentication/permission → validate user and every role → transaction synchronizes `user_roles` → approved audit write → commit. Any failure rolls back all assignment changes.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Missing/invalid bearer token | Existing `401` | Do not reveal user data |
| Authenticated user lacks permission | Existing `403` | Backend persisted RBAC only |
| Invalid UUID/body/query | Validation error | No mutation |
| Duplicate email | Conflict or existing safe duplicate behavior | Do not expose unrelated account data |
| Password outside existing limits | Validation error | Never hash/store invalid input |
| Unknown role ID | Validation/not-found error | Existing role assignments remain unchanged |
| Empty role list | Explicit approved clear/reject behavior | Authorization state must not change accidentally |
| Invalid security-sensitive update field | Rejection, not silent ignore | No password/session/audit corruption |
| Disabled/deleted target | Approved not-found or lifecycle response | Do not reactivate accidentally |
| Delete active user | Approved retention flow and session invalidation | Existing auth eligibility remains enforced |
| Required audit failure | Rollback/fail closed if approved | Never report success without durable required audit |
| Database/transaction failure | Central safe error and rollback | No stack, credentials, tokens, or SQL exposed |

## 13. Security Requirements

- Reuse Argon2id `hashPassword`; never log, return, persist, or compare plaintext outside existing helper contract.
- Preserve generic authentication behavior for disabled/deleted users; administrative responses must not weaken login/access/refresh checks.
- Protect every route with existing bearer authentication and explicit persisted RBAC permission.
- Validate all request-controlled input with Zod and use parameterized Drizzle queries.
- Synchronize role assignments transactionally; unknown role validation must occur before destructive changes.
- Coordinate disable/delete with existing session/revocation policy; never invent token-version or bulk-revocation state.
- Never return password hashes, refresh/access tokens, session identifiers, revocation data, auth audit internals, authorization headers, cookies, private keys, or stacks.
- Use generic audit boundary only with bounded allowlisted metadata; never store passwords, hashes, tokens, payload dumps, or exception stacks.
- Review self-delete, last-admin removal, role removal, email mutation, and status-transition policy before approval; do not infer safeguards.

## 14. Test Requirements

### Happy Path

- List users with approved pagination/search/status/role/sort behavior.
- Read safe user detail with approved assigned roles.
- Create user with valid identity/password and approved roles.
- Update approved editable fields.
- Activate/deactivate according to approved status contract.
- Delete according to approved retention behavior.
- Assign and replace valid roles.

### Validation

- Invalid UUID/email/password/status/query/role IDs.
- Duplicate email.
- Unknown or duplicate role IDs.
- Empty role assignment behavior.
- Rejection of password hash, token/session, audit, and unknown fields.

### Negative / Failure

- Missing user.
- Disabled/deleted target behavior.
- Role synchronization failure rolls back all links.
- Required audit failure follows approved fail-closed/best-effort policy.
- Password hashing failure creates no partial user state.
- Session invalidation failure follows approved state-transition policy.

### Security

- Every route proves unauthenticated `401`, unauthorized `403`, and allowed behavior.
- Client-supplied role/permission claims cannot authorize.
- Password never appears in response, logs, audit, or database plaintext.
- Disabled/deleted users remain unusable through existing login/access/refresh paths.
- Administrative operations do not expose internal security fields.

### Regression

- Existing login, refresh, logout, revocation, context, RBAC, audit, OpenAPI, and database tests pass.
- Existing generic auth failure behavior remains unchanged.

### Isolation

- Tests isolate users, roles, sessions, audit rows, and assignments or use deterministic repository doubles.
- Transaction tests force failure after validation and prove prior state survives.
- No real credentials/secrets; no execution-order dependence; deterministic cleanup.

## 15. Task-Level Expected Results

- Existing `users` and `user_roles` are reused without duplicate models.
- User CRUD exposes only approved safe fields.
- Password creation uses existing Argon2id helper.
- Status and deletion preserve current authentication eligibility rules.
- Role assignment validates all roles and commits atomically.
- Administrative routes use explicit persisted RBAC permissions.
- Approved sensitive actions produce safe generic audit events under the correct transaction policy.
- OpenAPI documents only mounted routes.
- Focused and regression tests prove security and lifecycle behavior.

## 16. Acceptance Criteria

- [ ] Human approves exact user API paths, envelopes, statuses, pagination, search, filters, and editable fields.
- [ ] Human approves whether password is accepted during create and how future password changes are handled.
- [ ] Human approves status endpoint vs main patch and allowed status transitions.
- [ ] Human approves deletion/retention semantics and required session/revocation effects.
- [ ] Human approves role assignment empty-list and self/last-admin behavior.
- [ ] Human approves administrative permission catalog and bootstrap mechanism.
- [ ] Human approves audit event names, metadata, ownership, and fail-closed transaction policy.
- [ ] Existing user schema and password hashing are reused.
- [ ] User list/detail/create/update/status/delete work under approved behavior.
- [ ] Role assignment is transactional and unknown roles are rejected without state loss.
- [ ] Sensitive fields cannot be updated or exposed.
- [ ] Disabled/deleted users remain rejected by existing auth flows.
- [ ] RBAC protects every administrative route with explicit permissions.
- [ ] Focused and regression tests pass.
- [ ] Lint, typecheck, format check, Code Anti-Slop, and `git diff --check` pass.
- [ ] No unrelated module changes remain.

## 17. Anti-Slop Requirements

Code Anti-Slop: required. Reject duplicate user models, controller password hashing, generic CRUD layers, direct auth-state mutation, dynamic role creation, admin bypasses, speculative profile fields, leaked secrets, unbounded user lists, hidden `TODO`/`FIXME`/`HACK`, unjustified `any`/assertions, dead code, and incomplete rollback/audit paths.

UI Anti-Slop: not applicable — no UI changes.

Visual verification: not applicable — no rendered UI changes.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/api format:check`
- `bun run --cwd apps/api lint`
- `bun run --cwd apps/api typecheck`
- `git diff --check`

### Automated Tests

- Focused user CRUD, password, role assignment, transaction, auth-state, audit, and authorization tests.
- `bun run --cwd apps/api test`
- OpenAPI validation tests where routes are documented.

### Build

Not applicable — no separate API build script exists; typecheck is required.

### Database

- Validate existing schema reuse and transaction behavior against isolated PostgreSQL.
- Run migration checks only if an approved schema extension is added.

### UI

Not applicable — no UI changes.

### Anti-Slop

- Run Code Anti-Slop after implementation and again after fixes.
- Review changed files, secret exposure, auth-state coordination, transaction boundaries, and scope.

## 19. Completion Evidence

- Contract decisions → approved task update resolving all open points.
- Schema/password reuse → source review plus focused repository/password tests.
- CRUD and validation → focused user API test output.
- Role assignment atomicity → forced transaction failure test showing prior links remain.
- Auth-state preservation → login/access/refresh tests for disabled/deleted users after admin transitions.
- Audit → event tests proving approved names, transaction policy, bounded metadata, and no credentials.
- Authorization → route tests proving `401`, `403`, and allowed paths.
- OpenAPI → aggregate validation and module YAML review.
- Quality → format, lint, typecheck, full tests, Code Anti-Slop, and `git diff --check` output.
- Scope → final `git status --short` and `git diff` review.

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture | `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md` |
| API | `docs/API.md` |
| Database | `docs/DATABASE.md`, `apps/api/src/config/drizzle/schema.ts` |
| Security | `docs/SECURITY.md`, `tasks/be/09-password-hashing/technical.md`, `tasks/be/10-login-session/technical.md`, `tasks/be/12-logout-revocation/technical.md` |
| RBAC | `tasks/be/13-rbac-permissions/technical.md`, `tasks/be/27-role-crud/technical.md` |
| Audit | `tasks/be/14-audit-trail/technical.md` |
| Approved requirements | Current human instruction, pending open-point approval |

## 21. Open Points

- Exact API paths, response envelopes, statuses, pagination, search fields, filters, and sorting.
- Whether create accepts password, whether it is temporary, and whether any password-change workflow is required separately.
- Administratively editable user fields; current schema has no `name`.
- Status transition matrix, self-disable/self-delete behavior, and last-admin safeguards.
- Delete retention behavior: current foundation says soft-deleted users remain indefinitely; session/revocation effects need explicit owner decision.
- Role assignment synchronization, empty-list semantics, and whether role assignment occurs in same transaction as user create/update.
- Administrative permission keys and persisted catalog/bootstrap source.
- Audit event names consistent with approved taxonomy, metadata allowlist, required events, and fail-closed vs best-effort policy.
- Behavior for email changes, email verification state, and existing sessions.
- `be/27-role-crud` must be approved before role IDs/lifecycle can be consumed.

## 22. Definition Of Done

- [ ] Open points approved and contract updated.
- [ ] Role CRUD dependency approved and stable.
- [ ] Existing user/auth/RBAC/password/audit boundaries reused.
- [ ] Sensitive operations and role synchronization tested.
- [ ] Focused/regression tests pass.
- [ ] Code Anti-Slop passes.
- [ ] Lint, typecheck, format, and applicable OpenAPI/database checks pass.
- [ ] `git diff --check` passes.
- [ ] Changed files, secrets, auth-state effects, audit, and scope reviewed.
- [ ] No unrelated changes remain.

