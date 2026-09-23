# be/04-identity-schema: Identity Schema

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/04-identity-schema` |
| Batch | N/A |
| Owning Feature | N/A |
| Workstream | Backend |
| Task Category | Identity foundation |
| Repository/App | `apps/api` |
| Status | Ready: approved for implementation |
| Priority | Foundation execution order 4 |
| Suggested Size | Small, reviewable database change set |
| Depends On | `be/03-database-foundation` |
| Blocks | `be/05-redis-foundation` |
| Execution Order | 4 |

## 2. Outcome

Create Drizzle schema and migration-backed PostgreSQL identity tables for users, roles, permissions, user-role assignments, and role-permission assignments. This task creates no API, authentication, session, token, or RBAC enforcement behavior.

## 3. Context

`docs/ARCHITECTURE.md` defines `middleware → route → controller → service/use case → repository → database`. `docs/DATABASE.md` requires Drizzle, camelCase TypeScript fields, and snake_case PostgreSQL names. `docs/SECURITY.md` requires Argon2id passwords and no secret logging. `be/03-database-foundation` establishes `apps/api/src/database/` and `apps/api/drizzle.config.ts`.

## 4. Dependencies

- `be/03-database-foundation` is complete.
- Isolated PostgreSQL required for migration and constraint evidence.
- `apps/api/drizzle` is Drizzle output root; no migration history exists.
- `drizzle-kit migrate` supports forward journaled migrations only. This task must establish and validate repository-compatible paired rollback SQL without replacing Drizzle.

## 5. In Scope

- Add only `users`, `roles`, `permissions`, `user_roles`, and `role_permissions` to Drizzle schema.
- Generate entity-scoped forward migrations in `apps/api/drizzle`.
- Add matching reverse SQL using forward Drizzle tag plus `.down.sql`; example: `0000_create_users_table.sql` and `0000_create_users_table.down.sql`.
- Add focused database tests for columns, constraints, indexes, foreign keys, soft-delete defaults, forward migration, rollback, and re-apply behavior.

## 6. Out of Scope

- Login, registration, password hashing service, password reset/change, email verification, JWT, refresh tokens, sessions, token revocation, authorization middleware, permission enforcement, audit records, MFA, OAuth, RBAC UI, role/permission seeds.
- `isAdmin`, username, phone, profile, avatar, organization, MFA, OAuth, reset-token, session, or refresh-token fields.
- Automated hard-delete or purge behavior; soft-deleted users remain indefinitely.
- A product permission catalog. Format examples do not become seed data.

## 7. Existing Implementation

- `apps/api/src/database/schema.ts` exports no tables.
- `apps/api/drizzle.config.ts` uses `schema: './src/database/schema.ts'` and `out: './drizzle'`.
- `apps/api/package.json` provides `db:generate` and `db:migrate`; no rollback script exists.
- `apps/api/src/database/config.ts` validates separated database config.
- `apps/api/tests/` uses Jest; no DB migration test harness exists.

## 8. Implementation Requirements

- Use installed Drizzle PostgreSQL primitives. TypeScript names use camelCase; PostgreSQL names use snake_case.
- Normalize email to lowercase before persistence through a focused database-boundary path. Do not add an API.
- `password_hash` stores Argon2id hash only. Never store, return, log, or seed plaintext/reversible passwords.
- `users.status` permits `active` and `disabled` only.
- `roles.code` is lowercase and machine-friendly. `permissions.code` uses lowercase `resource.action` format; `users.read` and `roles.manage` are format examples, not seed requirements.
- `users.deleted_at` implements soft deletion. Roles and permissions have no soft deletion.
- IDs are UUID primary keys. Junction tables use composite primary keys, not surrogate IDs.
- Define and test insert/update behavior for required timestamps. Do not add undocumented triggers.
- Do not add repositories, relations beyond schema support, seed data, endpoints, or business flows.

## 9. Applicable Contracts

### Configuration Contract

Not applicable: established database configuration remains unchanged.

### API Contract

Not applicable: no route, request, response, authentication, or permission contract changes.

### Database Contract

| Table | TypeScript field | PostgreSQL column | Type | Null | Constraint / behavior |
| --- | --- | --- | --- | --- |
| `users` | `id` | `id` | UUID | No | Primary key |
| `users` | `email` | `email` | text | No | Lowercase login identifier; unique |
| `users` | `passwordHash` | `password_hash` | text | No | Argon2id hash only |
| `users` | `status` | `status` | constrained text or PostgreSQL enum | No | `active` or `disabled` only |
| `users` | `emailVerifiedAt` | `email_verified_at` | timestamp | Yes | Schema only |
| `users` | `lastLoginAt` | `last_login_at` | timestamp | Yes | Schema only |
| `users` | `createdAt` / `updatedAt` | `created_at` / `updated_at` | timestamp | No | Required timestamps |
| `users` | `deletedAt` | `deleted_at` | timestamp | Yes | Soft-delete marker; default null |
| `roles` | `id` | `id` | UUID | No | Primary key |
| `roles` | `code` | `code` | text | No | Unique stable lowercase machine identifier |
| `roles` | `name` | `name` | text | No | Mutable display name |
| `roles` | `description` | `description` | text | Yes | Mutable display description |
| `roles` | `createdAt` / `updatedAt` | `created_at` / `updated_at` | timestamp | No | Required timestamps |
| `permissions` | `id` | `id` | UUID | No | Primary key |
| `permissions` | `code` | `code` | text | No | Unique stable `resource.action` identifier; no seed catalog |
| `permissions` | `description` | `description` | text | Yes | Display description |
| `permissions` | `createdAt` / `updatedAt` | `created_at` / `updated_at` | timestamp | No | Required timestamps |
| `user_roles` | `userId` | `user_id` | UUID | No | FK `users.id`, `ON DELETE CASCADE` |
| `user_roles` | `roleId` | `role_id` | UUID | No | FK `roles.id`, `ON DELETE CASCADE` |
| `user_roles` | `createdAt` | `created_at` | timestamp | No | Required assignment timestamp |
| `role_permissions` | `roleId` | `role_id` | UUID | No | FK `roles.id`, `ON DELETE CASCADE` |
| `role_permissions` | `permissionId` | `permission_id` | UUID | No | FK `permissions.id`, `ON DELETE CASCADE` |
| `role_permissions` | `createdAt` | `created_at` | timestamp | No | Required assignment timestamp |

| Table | Key / index | Purpose |
| --- | --- | --- |
| `users` | Primary key `id`; unique `email` | Identity and login lookup |
| `roles` | Primary key `id`; unique `code` | Stable role lookup |
| `permissions` | Primary key `id`; unique `code` | Stable permission lookup |
| `user_roles` | Composite primary key `(user_id, role_id)`; index `role_id` | Duplicate prevention; reverse role lookup |
| `role_permissions` | Composite primary key `(role_id, permission_id)`; index `permission_id` | Duplicate prevention; reverse permission lookup |

Application deletion sets `users.deleted_at`; it does not cascade. Cascades occur only for actual DB hard deletes. Foundation creation has no existing identity data, backfill, destructive change, or automatic seed.

### UI Contract

Not applicable: no CMS UI change.

## 10. Migration Plan And Data Impact

Drizzle remains schema and forward-migration source of truth. Generate numbered forward tags into `apps/api/drizzle`, then add reviewed `<tag>.down.sql` reverse files. Drizzle journal entries refer only to forward `<tag>.sql`; implementation must prove sibling `.down.sql` files do not affect forward migration and add/verify a repository-compatible isolated-database rollback executor.

| Order | Operation | UP | DOWN |
| --- | --- | --- | --- |
| 1 | `create-users-table` | Create users, email uniqueness, status constraint, initial table-coupled indexes | Drop users after dependent tables are removed |
| 2 | `create-roles-table` | Create roles and unique code | Drop roles after dependent tables are removed |
| 3 | `create-permissions-table` | Create permissions and unique code | Drop permissions after dependent tables are removed |
| 4 | `create-user-roles-table` | Create relationship, composite key, FKs, role index | Drop user_roles |
| 5 | `create-role-permissions-table` | Create relationship, composite key, FKs, permission index | Drop role_permissions |

Forward order is 1 through 5. Rollback order is 5, 4, 3, 2, 1. Migration names state actual operations, never vague groups. Applied/shared migrations are immutable. Future changes use new focused migrations. Irreversible/destructive operations require human approval and documented rollback limits.

## 11. Runtime Behavior

`db:generate` derives forward migrations. `db:migrate` applies them in FK dependency order. Rollback validation executes matching DOWN operations in reverse order on isolated PostgreSQL, restores prior schema, then proves UP re-applies. No application endpoint or identity business flow starts.

## 12. Error And Edge Cases

| Scenario | Expected result | Security / recovery |
| --- | --- | --- |
| Duplicate email, code, or junction pair | PostgreSQL rejects write | Assert DB constraint; never expose password values |
| Invalid status | PostgreSQL rejects write | Only approved states allowed |
| Missing required field | PostgreSQL rejects write | Assert nullability |
| Unknown FK | PostgreSQL rejects write | Assert FK integrity |
| Hard delete parent | Junction rows cascade | Test declared behavior |
| Parent rollback before junction rollback | Never run | Enforce reverse dependency order |
| Irreversible future migration | Stop for approval | Never fake DOWN SQL |

## 13. Security Requirements

- Password fixtures use non-secret Argon2id-hash-shaped values only.
- Do not add plaintext, reversible-password, session, token, or private-key columns.
- Authorization remains `user → role → permission`; no `isAdmin` field.
- Preserve safe database initialization errors.

## 14. Test Requirements

| Scenario | Expected result | Test type |
| --- | --- | --- |
| Users | Duplicate normalized email rejects; nullable timestamps accept null; required columns reject null; `deleted_at` defaults null | Database integration |
| Roles | Duplicate code rejects | Database integration |
| Permissions | Duplicate code rejects | Database integration |
| User roles | Duplicate pair/unknown FK reject; parent hard delete cascades | Database integration |
| Role permissions | Duplicate pair/unknown FK reject; parent hard delete cascades | Database integration |
| Migrations | UP order, FK/index evidence, DOWN 5→1, schema restoration, re-apply | Migration integration |
| Regression | Existing API shell and database foundation tests pass | Jest |

Tests use isolated PostgreSQL, deterministic cleanup, and no API behavior tests.

## 15. Task-Level Expected Results

- Drizzle schema matches section 9 without out-of-scope fields.
- Five entity/relationship migration units have reviewed forward and reverse behavior.
- Constraints, indexes, FK cascades, soft-delete default, migration ordering, rollback, and re-apply have actual evidence.

## 16. Acceptance Criteria

- [ ] Schema contains exactly five approved identity tables and contract columns.
- [ ] Email lowercases before persistence; uniqueness and status restriction work.
- [ ] Junction tables use composite keys, declared cascades, and reverse indexes.
- [ ] Five focused migration units follow forward/reverse dependency order with UP/DOWN behavior.
- [ ] Isolated PostgreSQL proves apply, rollback to prior schema, and re-apply.
- [ ] No API/auth/session/token/seed behavior or speculative fields appear.
- [ ] Tests, lint, typecheck, migration validation, Anti-Slop, and diff review report actual status.

## 17. Anti-Slop Requirements

Code Anti-Slop required. Reject generic schema helpers, duplicated timestamp/constraint logic where Drizzle primitives suffice, unused dependencies, fake rollback files, hidden TODO/FIXME/HACK, unjustified `any`/assertions, seeds presented as requirements, and unrelated refactors. UI Anti-Slop and visual verification are not applicable.

## 18. Validation Requirements

- Static: `bun run --cwd apps/api lint`, `bun run --cwd apps/api typecheck`, `git diff --check`.
- Tests: focused database/migration integration tests and `bun run --cwd apps/api test`.
- Database: `bun run --cwd apps/api db:generate`, `bun run --cwd apps/api db:migrate`, isolated rollback/down execution, schema inspection, and re-apply evidence.
- Build: not applicable: API has no build script.
- Anti-Slop: Code Anti-Slop review, fix findings, rerun.

## 19. Completion Evidence

| Acceptance criterion | Evidence |
| --- | --- |
| Tables and constraints | Schema review plus integration assertions |
| Forward migrations | `db:generate`, `db:migrate`, journal and migration review |
| Rollback | Isolated DOWN log in 5→1 order, schema comparison, re-apply result |
| Static/regression | Lint, typecheck, focused tests, full Jest |
| Scope/Anti-Slop | `git diff --check`, `git diff`, `git status`, Anti-Slop report |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture | `docs/ARCHITECTURE.md` |
| Database | `docs/DATABASE.md` |
| Security | `docs/SECURITY.md` |
| Dependency | `be/03-database-foundation` |
| Approved requirements | Current human instruction |

## 21. Open Points

None.

## 22. Definition Of Done

- [ ] Acceptance criteria and approved scope complete.
- [ ] Five entity-scoped migrations and matching reverse behavior reviewed.
- [ ] Isolated PostgreSQL evidence proves forward, rollback, restoration, and re-apply.
- [ ] Focused/full tests, lint, typecheck, generation, migration validation, and Code Anti-Slop pass.
- [ ] `git diff --check`, changed-file review, secret review, and human review complete.
