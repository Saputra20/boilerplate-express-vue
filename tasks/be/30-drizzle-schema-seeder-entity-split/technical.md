# be/30-drizzle-schema-seeder-entity-split — Drizzle Schema and Seeder Entity Split

## 1. Metadata

| Field           | Value                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------- |
| Task ID         | `be/30-drizzle-schema-seeder-entity-split`                                                    |
| Batch           | N/A                                                                                           |
| Owning Feature  | Backend architecture and database tooling                                                     |
| Workstream      | Backend                                                                                       |
| Task Category   | Behavior-preserving structural refactor                                                       |
| Repository/App  | `apps/api`                                                                                    |
| Status          | Implemented — validation evidence recorded in completion response                              |
| Priority        | N/A                                                                                           |
| Suggested Size  | Large — 11 schemas, repository-wide import updates, seed decomposition, and equivalence proof |
| Depends On      | `be/21-api-module-architecture-refactor`; current seed/schema source in `apps/api`            |
| Blocks          | None identified                                                                               |
| Execution Order | 30                                                                                            |

## 2. Outcome

Drizzle table definitions are organized into entity/relation files beneath `apps/api/src/config/drizzle/schema/`, re-exported by one schema index. Development/test database seed responsibilities are split into focused seed functions while `apps/api/scripts/db-seed.ts` remains the single CLI orchestrator. Runtime schema, migrations, seeded records, ordering, transaction, and idempotency behavior remain equivalent to the current implementation.

## 3. Context

- `AGENTS.md` requires a scoped approved task before architecture-level refactors, preserves Drizzle as schema/migration source of truth, and requires entity-scoped UP/DOWN migrations for future schema changes.
- `docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md` place database/Drizzle infrastructure under `apps/api/src/config/` and require explicit module ownership and inward dependency direction.
- `docs/DATABASE.md` establishes Drizzle/PostgreSQL and migration ownership.
- `be/21-api-module-architecture-refactor` relocated the schema to `apps/api/src/config/drizzle/schema.ts`; this task is a follow-up focused only on schema/seeder organization.
- Current source is `apps/api/src/config/drizzle/schema.ts`, `apps/api/drizzle.config.ts`, `apps/api/src/config/database/client.ts`, and `apps/api/scripts/db-seed.ts`.
- The current schema defines 11 tables: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `auth_sessions`, `refresh_tokens`, `token_revocations`, `auth_audit_events`, `audit_events`, and `categories`. It has inline foreign-key references and no `relations()` declarations.
- The current seed creates/loads the `admin` role, inserts the declared permission catalog, assigns all persisted permissions to the admin role, creates or validates `developer@dispostable.com`, and assigns that user the admin role. It runs these operations in this order inside one transaction.
- The existing seed requires `SEED_ADMIN_PASSWORD` at runtime and is restricted to `NODE_ENV=development` or `NODE_ENV=test`.

## 4. Dependencies

- `be/21-api-module-architecture-refactor` must remain the governing source-layout contract.
- Existing Drizzle/PostgreSQL client, migration history, Node/Bun ESM `.js` import convention, and package scripts are required dependencies.
- No external service, new package, environment variable, product decision, database migration, or destructive data operation is required.
- This task does not block any known successor task.

## 5. In Scope

- Split all current Drizzle table declarations into one focused file per actual entity or relation in `apps/api/src/config/drizzle/schema/`.
- Create `apps/api/src/config/drizzle/schema/index.ts` as the complete schema aggregator.
- Keep schema infrastructure under `config/drizzle`; do not relocate table ownership into business modules in this task.
- Update Drizzle Kit configuration and runtime/test imports to load the schema aggregator. Use explicit ESM-compatible `.js` import specifiers and repository-relative paths; do not add path aliases.
- Split the actual existing admin seed responsibilities into focused, meaningful seed functions under `apps/api/scripts/seed/`.
- Keep `apps/api/scripts/db-seed.ts` as the only top-level command, owning database initialization, one transaction, explicit invocation order, success/failure reporting, and resource closure.
- Emit consistent progress messages for the seed phases, using fixed phase labels only; retain the existing final success message and never include credentials or seed-user PII in progress/error output.
- Preserve the developer account, role, permission catalog, role-permission assignments, and user-role assignment behavior.
- Add focused schema import and seed behavior tests, including transaction rollback and idempotency evidence appropriate to the available test/database setup.
- Inspect repository-wide references to the old schema file and update only references needed for this refactor.

## 6. Out of Scope

- Database/table/column/enum/constraint/index/foreign-key/Drizzle relation semantics or data changes.
- Any SQL migration, Drizzle journal/snapshot change, schema push, or manual DDL.
- New entities, seed records, permission codes, seed values, account lifecycle behavior, or production seed capability.
- Changing the admin password handling, password hash policy, admin account, role, permission catalog, or transaction isolation/behavior.
- Refactoring repositories, services, controllers, app routes, API behavior, auth/RBAC semantics, or unrelated configuration.
- Adding categories or other entity seeders without an existing seed responsibility.
- Adding compatibility imports that duplicate schema definitions or keep the old `schema.ts` file after the folder/index migration.
- Updating task history, durable project guidance, unrelated task contracts, dependencies, lockfiles, or generated artifacts.

## 7. Existing Implementation

- `apps/api/src/config/drizzle/schema.ts` — all 11 current table declarations and inline FKs.
- `apps/api/src/config/database/client.ts` — runtime imports the schema namespace and passes it to Drizzle.
- `apps/api/drizzle.config.ts` — Drizzle Kit currently points to `./src/config/drizzle/schema.ts` and writes to `./drizzle`.
- `apps/api/scripts/db-seed.ts` — current single-transaction development/test admin bootstrap seeder.
- `apps/api/scripts/db-rollback.ts` and `apps/api/src/config/drizzle/rollback.ts` — rollback tooling that must remain unaffected.
- Consumers importing `apps/api/src/config/drizzle/schema.js` include the audit, auth, category, dashboard, RBAC, and role modules, plus `apps/api/tests/identity-schema.test.ts` and the seed script. The implementer must run a repository-wide search before and after.
- `apps/api/package.json` exposes `db:generate`, `db:migrate`, `db:rollback`, `db:seed`, lint, typecheck, and tests.
- `apps/api/drizzle/**` is the existing migration/journal/snapshot history and must be inspected before and after.

## 8. Implementation Requirements

### 8.1 Schema files and aggregator

- Create one schema file per current table: `users.schema.ts`, `roles.schema.ts`, `permissions.schema.ts`, `user-roles.schema.ts`, `role-permissions.schema.ts`, `auth-sessions.schema.ts`, `refresh-tokens.schema.ts`, `token-revocations.schema.ts`, `auth-audit-events.schema.ts`, `audit-events.schema.ts`, and `categories.schema.ts`.
- Each file owns only its named table declaration, required Drizzle imports, and closely related exported inferred types if the current code already has or needs those types. Do not introduce unneeded type exports.
- Preserve existing table names, columns, types, defaults, `$onUpdate` behavior, nullability, checks, indexes, unique constraints, foreign-key actions, and exported TypeScript symbols exactly.
- Cross-file FK references must import the referenced table directly from its entity file. Keep dependency edges acyclic. Where a current self-reference needs deferred typing, preserve its existing safe pattern. Do not duplicate declarations or use `any`/unjustified assertions to suppress cycles.
- Current schema uses inline `references()` and has no `relations()` declarations. Do not invent Drizzle relation declarations. If discovery finds additional current relation declarations, preserve them in the smallest appropriate file without changing behavior.
- `schema/index.ts` re-exports every current schema symbol once and is the sole schema aggregation surface. Do not create competing barrel files.
- Remove the old `schema.ts` after every consumer and tool is updated. Consumers use the index entrypoint with the repository's explicit `.js` specifier, for example `../config/drizzle/schema/index.js`.

### 8.2 Drizzle Kit and migration equivalence

- Update `apps/api/drizzle.config.ts` to discover the complete schema folder using a Drizzle Kit-supported glob/path, with output remaining `./drizzle` and all credentials/config behavior unchanged.
- Keep `apps/api/src/config/database/client.ts` passing the complete schema index to `drizzle()`.
- Compare current and refactored Drizzle models using the existing journal/snapshot state and Drizzle Kit tooling. A schema diff must be empty.
- Run migration generation in a way that cannot overwrite existing migration files. If Drizzle reports any schema change or attempts to produce a migration, stop, preserve migration history, and report the mismatch; do not add a migration to make this refactor pass.
- Do not modify any file under `apps/api/drizzle/` for this file-only refactor.

### 8.3 Seed file responsibilities

- Keep the top-level `db-seed.ts` thin: environment guard, required seed password loading, database lifecycle, one transaction, focused seeder orchestration, sanitized failure handling, and close.
- Create only seed modules needed by current responsibilities. A suitable split is permission catalog, admin role, role-permission links, admin user, and user-role assignment; the implementer may choose names that match repository conventions while retaining those boundaries.
- Do not create `categories.seed.ts` or any other empty/nonfunctional seeder because the current seed has no such responsibility.
- Seeders accept the transaction context from `db-seed.ts`; they must not create clients, open nested transactions, close resources, or read mutable process state independently.
- Pass the admin role/user identifiers or small typed result objects through orchestration. Do not repeat the admin role code, admin email, permission catalog, or other seed constants across files.
- Preserve current seeder behavior precisely:
  - Reject execution unless `NODE_ENV` is `development` or `test`.
  - Require `SEED_ADMIN_PASSWORD` and hash it using the current Argon2id helper; never log or persist the plaintext value.
  - Insert the `admin` role and current permission codes with existing conflict behavior; do not update existing records on conflict.
  - Assign every persisted permission row to the admin role, retaining existing conflict handling.
  - If the seed user exists and is active/not deleted, reuse it without changing its password or profile; if disabled or soft-deleted, fail with the current safe message.
  - If no seed user exists, create it active with the current password hash behavior.
  - Add the admin user's role assignment idempotently.
  - Preserve current success output and safe error/exit behavior unless existing tests/source prove a different current behavior.
- Use explicit sequential `await` calls in `db-seed.ts` that preserve the current order: admin role → permission catalog → role-permission assignments → seed user → user-role assignment. Do not rely on import order or parallel execution.
- Log start/completion of these phases consistently with static labels and no row payloads, credentials, email address, or other PII. Preserve the existing final success message.
- Keep the entire operation in one transaction. A failure from any seeder rejects the transaction and rolls back all writes. Database initialization and close remain in the same lifecycle order as today.

### 8.4 Maintainability and dependency direction

- Seed modules may import their owned Drizzle schema definitions and shared seed constants/types. Avoid a generic seed framework, generic CRUD helpers, cross-entity catch-all, or empty wrappers.
- Keep the seeder orchestrator as composition; individual seed functions own only their named persistence responsibility.
- Keep schema source under infrastructure config as required by the explicit task target. No business module may import another module's private code as a workaround for schema organization.

## 9. Applicable Contracts

### 9.1 Configuration Contract

| Variable                                                                                                    | Required                        | Type                                     | Validation                                                                                   | Default                                  | Secret                   |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------ |
| `SEED_ADMIN_PASSWORD`                                                                                       | Yes when `db:seed` runs         | String                                   | Existing non-empty runtime requirement; passed unchanged to existing password hashing helper | None — seed command must fail if missing | Yes                      |
| `NODE_ENV`                                                                                                  | Yes for `db:seed` safety gate   | Existing environment string              | Must be `development` or `test` for seed command                                             | None added by this task                  | No                       |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_SSL` | Yes for database initialization | Existing validated database config types | Existing Zod/database validation unchanged                                                   | None changed                             | `DATABASE_PASSWORD`: Yes |

No environment behavior is added or changed.

### 9.2 API Contract

Not applicable — this task changes no HTTP routes, request/response shapes, authentication, authorization, status codes, or OpenAPI contract.

### 9.3 Database Contract

- Database tables and persisted model remain byte-for-byte equivalent in Drizzle semantics; preserve all 11 current tables and their exact constraints and relationships.
- No data or SQL change; no migration is required or allowed.
- Existing seed inserts/conflict behavior and transaction boundary/order are unchanged.

### 9.4 UI Contract

Not applicable — no CMS/UI change.

## 10. File Impact

### Expected Create

- `apps/api/src/config/drizzle/schema/` with the 11 entity/relation schema files and `index.ts`.
- `apps/api/scripts/seed/` with only the focused seed modules justified by current admin bootstrap responsibilities.
- Focused test(s) under `apps/api/tests/` for schema aggregation and seed behavior/transaction guarantees where the current test setup permits.
- `tasks/be/30-drizzle-schema-seeder-entity-split/technical.md`.
- `tasks/be/30-drizzle-schema-seeder-entity-split/explanation.md`.

### Expected Modify

- `apps/api/drizzle.config.ts` — schema folder discovery only.
- `apps/api/src/config/database/client.ts` — schema index import only, if required by the chosen extension-safe path.
- All actual source, script, and test imports of the old schema module — index import path only.
- `apps/api/scripts/db-seed.ts` — orchestration/lifecycle only.
- `apps/api/tests/**` — focused tests and only necessary import/mock updates.

### Expected Not Modified

- `apps/api/drizzle/**`, migration SQL, Drizzle snapshots/journal, database contents, package manifests/lockfiles, environment examples/secrets, rollback behavior, repositories/services/controllers, API/OpenAPI behavior, CMS source, and unrelated tasks/docs.

Expected paths are guidance; the implementer must verify the repository before editing and record the final changed paths.

## 11. Runtime Behavior

1. `db:seed` invokes `apps/api/scripts/db-seed.ts` as it does today.
2. The orchestrator checks `NODE_ENV`; any value other than `development` or `test` fails before database initialization.
3. The orchestrator loads required `SEED_ADMIN_PASSWORD`; missing value fails before database writes. The password is hashed with the existing helper and is never logged.
4. The orchestrator validates/loads existing DB configuration, constructs the database client, and initializes the connection.
5. One database transaction executes, sequentially: ensure admin role → seed/ensure permission catalog → link all existing permissions to admin → ensure/reuse seed user → assign admin role to seed user.
6. The orchestrator emits static progress messages for the ordered seed phases. Messages do not contain seed values, email, password, or database details.
7. Any failure rejects and rolls back the whole transaction. It is reported using the existing safe error message and non-zero process exit code.
8. On success, the existing success message is emitted. The database client closes in `finally`, whether seeding succeeds or fails.
9. Re-running the command produces no unintended duplicate roles, permissions, role-permission links, or user-role links; existing valid admin user's password/profile remain unchanged.

## 12. Error And Edge Cases

| Scenario                                                 | Expected Result                                                                                                     | Security / Recovery                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `NODE_ENV` is not development or test                    | Fail before database initialization/writes with the current environment-safety error.                               | Never permit production seed execution.                     |
| `SEED_ADMIN_PASSWORD` is missing                         | Fail before writes with the current required-variable message.                                                      | Never print or expose password values.                      |
| Database config invalid or initialization fails          | Existing deterministic sanitized failure; no seed transaction proceeds.                                             | Do not expose credentials.                                  |
| Existing seed account is disabled or deleted             | Transaction fails with the current error and rolls back seed changes.                                               | Do not silently reactivate or restore the account.          |
| Any entity seeder fails after earlier seeders wrote rows | The one enclosing transaction rolls back all writes.                                                                | No partial bootstrap state.                                 |
| Seed reruns with existing rows                           | Conflict handling/reuse remains as current behavior; no unintended duplicates or mutation of existing account data. | Preserve idempotency and current password semantics.        |
| Schema aggregator omits or duplicates an export          | Schema import/typecheck or focused schema test fails before use.                                                    | Export every actual table exactly once.                     |
| Drizzle Kit detects schema difference                    | Stop and report; do not create/apply a migration.                                                                   | Preserve DB model and migration history.                    |
| Stale import to `schema.ts` remains                      | Repository-wide import search fails acceptance.                                                                     | Update only import paths necessary for the directory index. |

## 13. Security Requirements

- Preserve the development/test-only seed gate and fail before connecting in other environments.
- Preserve required password configuration and existing hashing behavior; never log, persist, return, or commit plaintext `SEED_ADMIN_PASSWORD`.
- Preserve database secret validation/redaction behavior.
- Do not add privileged role/permission semantics or production seeding.
- Keep transaction rollback behavior so partial role/permission/user bootstrap writes cannot persist.

## 14. Test Requirements

### Happy Path

- Schema index exposes all 11 current tables to runtime Drizzle, with imports resolving under the project's ESM convention.
- Seed orchestration creates/reuses the same role, permission catalog, admin permission links, user, and user-role assignment as the current script.
- Successful seed emits the existing success output and closes the database client.
- Seed orchestration emits predictable phase progress labels without disclosing seed values or credentials.

### Validation

- Schema export tests assert every current entity/relation table is present once and no export is undefined.
- Seed module tests verify the explicit orchestration order using focused transaction fakes or existing repository-compatible test patterns.
- Typecheck, lint, and formatting cover the split files.

### Negative / Failure

- Seed rejects unsupported `NODE_ENV` before database initialization.
- Missing `SEED_ADMIN_PASSWORD` fails before transaction/writes.
- Disabled/deleted seed user retains current failure behavior.
- A failure after at least one seeder operation rolls back all writes; prove via isolated PostgreSQL integration test if available, otherwise an existing transaction test harness that verifies rollback invocation plus report the integration limitation.
- Database close is attempted after success and failure.

### Security

- Tests do not include real credentials. Confirm logs/errors do not include the password value or database secret.
- Progress and error messages do not include the seeded account email, credential values, database configuration, or row payloads.
- Verify no path enables the seed command in production.

### Regression

- Run existing API tests, lint, typecheck, and build.
- Run Drizzle Kit generation/model diff check and prove no new migration, journal, or snapshot change.
- Run seed against an isolated development/test database; run it a second time and verify rows remain unique and equivalent.
- Compare before/after row semantics and migration output; no API behavior changes are expected.

### Isolation

- Use an isolated database/schema with deterministic cleanup for integration seed runs; never target production/shared data.
- Tests must be repeatable and independent of test order.
- Preserve existing migration UP/DOWN files and do not apply migrations as part of this refactor unless the isolated test setup requires its own disposable database.

## 15. Task-Level Expected Results

- Every current Drizzle table definition appears in exactly one entity/relation file.
- `schema/index.ts` re-exports the complete schema and is used by runtime and Drizzle Kit.
- No stale source import refers to `apps/api/src/config/drizzle/schema.ts`.
- Seed responsibilities are focused by actual entity/domain behavior and composed by `db-seed.ts`.
- One transaction, current order, conflict behavior, admin/account behavior, environment guard, and password handling are preserved.
- No SQL migration, journal, snapshot, schema, API, or business behavior change is introduced.

## 16. Acceptance Criteria

- [x] AC-001 — `schema.ts` is replaced by one file for each of the 11 current tables and `schema/index.ts`.
- [x] AC-002 — The schema index exports every current table exactly once; runtime Drizzle receives the full schema.
- [x] AC-003 — Every application/script/test import resolves through the schema index; repository search finds no stale physical `schema.ts` import.
- [x] AC-004 — Drizzle Kit configuration discovers all entity schema files and still writes to `apps/api/drizzle`.
- [x] AC-005 — Before/after Drizzle model comparison is empty; no migration, journal, snapshot, or SQL file is created or modified.
- [x] AC-006 — Seed implementation is split into focused modules for current responsibilities; no empty or speculative entity seeders are added.
- [x] AC-007 — `db-seed.ts` remains the top-level command and contains only guard/config/client lifecycle, one transaction, explicit ordered orchestration, progress/final output, and safe cleanup.
- [x] AC-008 — Seed operation order, data, conflict behavior, idempotency, admin account handling, and one-transaction rollback behavior match current source.
- [x] AC-009 — Seed password remains required, runtime-only, hashed with the existing helper, and absent from logs/errors; progress output contains only static labels.
- [x] AC-010 — Focused schema/seed tests and existing API tests pass; repeat seed execution against an isolated database proves no duplicates.
- [x] AC-011 — Lint, typecheck, format check, applicable build, and `git diff --check` pass.
- [x] AC-012 — No unrelated application, migration, package, or task files are changed.

## 17. Anti-Slop Requirements

- **Code Anti-Slop:** Required. Keep each schema/seed file single-purpose; avoid duplicated table definitions/constants, generic seed frameworks, empty wrappers, unused exports, unjustified assertions/`any`, hidden TODOs, or unrelated formatting/refactors.
- **UI Anti-Slop:** Not applicable — no UI changes.
- **Visual Verification:** Not applicable — no rendered UI change.
- Review import cycles and ensure the aggregator and seed orchestrator do not become catch-all implementation files.
- Preserve one source of truth for admin role, email, permission catalog, and seed ordering.

## 18. Validation Requirements

- **Static:** `bun --cwd apps/api run format:check`, `bun --cwd apps/api run lint`, `bun --cwd apps/api run typecheck`, `git diff --check`, repository-wide stale schema import search.
- **Automated Tests:** `bun --cwd apps/api test`, focused schema-index and seed unit tests, and isolated database seed integration/idempotency/rollback proof.
- **Build:** `bun --cwd apps/api run build` if an API build script exists; otherwise verify via TypeScript typecheck and report build as not configured.
- **Database:** Run the migration diff/generation check without overwriting migration history; prove no schema diff and no migration output. Execute seed twice in an isolated development/test database and verify transaction rollback behavior.
- **UI:** Not applicable.
- **Anti-Slop:** Run Code Anti-Slop after implementation and correct all relevant findings; repeat the gate after fixes.

## 19. Completion Evidence

| Acceptance Criteria | Required Evidence                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| AC-001–AC-003       | Schema index test, runtime typecheck/test output, and repository-wide import search output.                                    |
| AC-004–AC-005       | Drizzle Kit config/generation output, zero-diff evidence, and unchanged `apps/api/drizzle/**` git status/diff.                 |
| AC-006–AC-008       | Seed module/orchestrator diff, focused order test, isolated before/after seed data, repeated execution, and rollback evidence. |
| AC-009              | Focused safe logging/guard test and changed-file secret scan.                                                                  |
| AC-010–AC-011       | API test/lint/typecheck/format/build outputs, Code Anti-Slop result, and `git diff --check`.                                   |
| AC-012              | Reviewed `git status` and scoped diff.                                                                                         |

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

None. This contract freezes the refactor to the current source model and current seed behavior; if implementation discovers schema drift or a need to change persisted behavior, stop and request a separate approved task.

## 22. Definition Of Done

- [x] All acceptance criteria and the behavior-preserving scope are satisfied.
- [x] Every current schema definition and seed responsibility is represented exactly once.
- [x] Schema aggregation, import resolution, seed order, one-transaction rollback, and repeated seed behavior have evidence.
- [x] No migration/schema/data/API/auth/RBAC behavior change or unrelated change exists.
- [x] Applicable tests, lint, typecheck, formatting, and migration-diff check pass. Build is not configured.
- [x] Code Anti-Slop passes after any fixes.
- [x] `git diff --check` passes and all changed files are reviewed for scope and secrets.
- [x] Completion evidence is recorded; no check is marked PASS without its actual output.
