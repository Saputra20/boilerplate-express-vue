# be/40-authenticated-self-profile — Authenticated Self Profile

## 1. Metadata

| Field           | Value                                                                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID         | `be/40-authenticated-self-profile`                                                                                                                                                                                                            |
| Batch           | Account self-service                                                                                                                                                                                                                          |
| Owning Feature  | CMS account profile                                                                                                                                                                                                                           |
| Workstream      | Backend                                                                                                                                                                                                                                       |
| Task Category   | Authenticated API / profile data                                                                                                                                                                                                              |
| Repository/App  | `apps/api`                                                                                                                                                                                                                                    |
| Status          | READY FOR IMPLEMENTATION                                                                                                                                                                                                                      |
| Priority        | Normal; authenticated user data                                                                                                                                                                                                               |
| Suggested Size  | Medium                                                                                                                                                                                                                                        |
| Depends On      | `be/03-database-foundation`, `be/04-identity-schema`, `be/14-audit-trail`, `be/21-api-module-architecture-refactor`, `be/23-versioned-openapi-swagger`, `be/25-authenticated-rbac-context`, `be/38-authenticated-first-login-password-change` |
| Blocks          | `fe/26-update-profile`                                                                                                                                                                                                                        |
| Execution Order | 40                                                                                                                                                                                                                                            |

## 2. Outcome

The authenticated identity endpoint returns the current user's nullable `displayName`, and `PATCH /api/v1/me` lets that user set or change only their own display name. The response returns the updated canonical `/me` context, and a successful actual change is durably audited.

## 3. Context

- [`tasks/fe/26-update-profile/technical.md`](../../fe/26-update-profile/technical.md) requires a real self-profile contract before the CMS page is implemented.
- `apps/api/src/config/drizzle/schema/users.schema.ts` currently has no personal display-name field. Its user fields are identity, credential, lifecycle, and system-managed state.
- `apps/api/src/modules/auth/v1/me.router.ts`, `apps/api/src/modules/auth/services/context.service.ts`, and `context.repository.ts` implement authenticated `GET /api/v1/me`. The router allows this read while `mustChangePassword` is true.
- `apps/api/src/modules/me/v1/me.openapi.yaml` owns the current `/api/v1/me` OpenAPI contract. `apps/api/src/modules/auth/auth.module.ts` composes the `meRouter`.
- `apps/api/src/modules/user/v1/user.router.ts` and `user.openapi.yaml` expose administrative user CRUD guarded by `user.*` permissions. They are not self-service endpoints and must not be used for this capability.
- `apps/api/src/modules/audit/services/audit.service.ts` provides required transactional audit writes and allowlisted metadata. `docs/SECURITY.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, and `docs/DATABASE.md` define auth, module, API, audit, and migration conventions.
- `docs/PRD.md`, `docs/PRODUCT.md`, and `docs/DOMAIN.md` contain requirement-needed placeholders. Human decision for this task approves only `displayName` as self-editable, required on update, trimmed, and limited to 1–80 characters. Other example fields are not approved.

## 4. Dependencies

- Existing PostgreSQL/Drizzle, auth context, access-auth middleware, generic audit, versioned OpenAPI, and admin user management are required foundations; verify their runtime code before implementation.
- `be/38-authenticated-first-login-password-change` defines DB-backed mandatory-change enforcement. `GET /api/v1/me` is allowed while the flag is true; profile mutation must use the default middleware policy and be blocked while the flag is true.
- `be/39-authenticated-self-service-password-change` owns voluntary password changes and remains separate.
- `fe/26-update-profile` consumes this contract only after BE-40 implementation and validation are complete.
- Add one nullable `users.display_name` field. Existing users remain null until they set it; no backfill or inferred value is allowed.
- No new infrastructure, configuration, external service, permission, or dependency is required.

## 5. In Scope

- Add nullable `users.display_name` to the Drizzle schema and a focused forward/reverse migration. Existing accounts remain null; do not derive values from email or other fields.
- Extend canonical authenticated `GET /api/v1/me` to return `user.displayName` as `string | null`, preserving all existing response fields.
- Add authenticated `PATCH /api/v1/me`, whose target user is derived only from the validated access principal. It accepts exactly `{ displayName: string }`.
- Trim leading/trailing whitespace before persistence. The resulting value must contain 1–80 Unicode code points. Preserve internal whitespace and do not apply case folding or Unicode normalization. Reject null, empty-after-trim, non-string, over-limit, missing, or extra fields.
- Return HTTP `200` with the updated canonical `MeV1Response`; retain existing `roles`, `permissions`, `id`, `email`, and `mustChangePassword` fields.
- Record `user.profile_updated` as required audit in the same transaction only when the normalized value changes. Metadata may contain only `{ changedFields: ["displayName"] }`; never store old/new values or the request body.
- Preserve the exact existing administrative user API response shape when the Drizzle row gains `displayName`; do not expose it through admin serializers by incidental row spreading.
- Update module-local OpenAPI, `docs/API.md`, and the FE-26 dependency/contract handoff after implementation agrees with runtime.
- Add route/controller/service/repository, isolated PostgreSQL, audit, OpenAPI, and admin-response regression tests.

## 6. Out of Scope

- FE-26 CMS UI or frontend implementation.
- Email change or verification lifecycle; email remains readable and immutable in self-profile.
- Avatar upload/storage, phone number, secondary emails, biography, external identifiers, or other unspecified fields.
- Password change/reset, mandatory first-login behavior changes, and password lifecycle.
- Self-service role, permission, account-status, account-lock, or deletion changes.
- Reusing or changing administrative `/api/v1/users/*` authorization or semantics.
- New profile-specific permission, rate limiter, audit viewer, cache, or generic profile framework.
- Any new field beyond `displayName`, any backfill, or migration that fabricates profile values.

## 7. Existing Implementation

- `apps/api/src/config/drizzle/schema/users.schema.ts`: current `users` table; add only nullable `displayName`/`display_name`.
- `apps/api/drizzle/` and `apps/api/drizzle/meta/_journal.json`: migration source and journal; current last forward entry is `0019_extend-auth-challenge-purpose-for-password-reset`, so use the next available focused tag after verifying repository state.
- `apps/api/src/modules/auth/v1/me.router.ts` and `controllers/me.controller.ts`: current authenticated context transport. Add PATCH to this existing `meRouter`; it is mounted at `/api/v1`.
- `apps/api/src/modules/auth/services/context.service.ts` and `repositories/context.repository.ts`: current identity-context read boundary; extend it with `displayName`.
- Add self-profile validation/service/repository under `apps/api/src/modules/auth/` only if needed to preserve middleware → router → controller → service → repository → database ownership.
- `apps/api/src/modules/me/v1/me.openapi.yaml`: existing me API schemas/path; extend the same operation group.
- `apps/api/src/modules/user/{repositories/user.repository.ts,services/user.service.ts,v1/controllers/user.controller.ts,v1/user.openapi.yaml}`: admin API. Inspect response serialization and protect its current documented/runtime fields from incidental new-column exposure.
- `apps/api/src/modules/audit/{services/audit.service.ts,repositories/audit.repository.ts}`: required durable audit boundary.
- Existing tests include `apps/api/tests/me-context.test.ts`, `context-service.test.ts`, `user-management.test.ts`, `openapi.test.ts`, and database/migration integration conventions. Verify actual test names and harness before editing.

## 8. Implementation Requirements

1. Use `GET /api/v1/me` as the single canonical authenticated identity/profile read. Extend, do not replace or rename, the existing response contract.
2. Add `PATCH /api/v1/me` to the existing auth-owned `meRouter`, mounted at the existing `/api/v1` boundary, with exact OpenAPI operation ID `updateCurrentUserProfile`.
3. Require bearer authentication. Derive user and session identifiers from the validated request principal only; do not accept target user IDs or session IDs in path, query, or body. Do not require `user.update` or another admin permission.
4. Apply the default mandatory-password-change access policy to PATCH. A user with `mustChangePassword === true` may continue to GET `/me` but receives the existing `403 password_change_required` on PATCH. Do not change global auth middleware or add a bypass.
5. Add only nullable `display_name TEXT`. No default, backfill, index, uniqueness rule, or additional schema field. The nullable column supports existing accounts and admin-created accounts that have not yet set a display name.
6. Accept a strict JSON object with one required property: `{ displayName: string }`. Unknown properties—including `id`, `email`, `role`, `permissions`, `status`, `password`, and `avatar`—are rejected with the existing safe `400 { message: "Bad request" }` response. Missing/null/non-string input is also `400`.
7. Normalize by trimming only leading/trailing whitespace. Validate 1–80 Unicode code points after trimming; whitespace-only values fail. Preserve internal whitespace and do not lowercase or Unicode-normalize the value. Persist only the normalized result.
8. Re-read and lock the current active user row in the repository transaction before mutation. Recheck `must_change_password` under that lock so a state change after middleware evaluation cannot bypass the mandatory flow. An invalid/inactive/deleted user returns generic `401`; a now-mandatory user returns `403 password_change_required` with no write.
9. Treat a normalized value equal to the current value as a successful no-op: return the canonical `200` response and do not write an update or audit event. For changed values, update only `users.display_name` and `updated_at` through the existing Drizzle update conventions.
10. Return the canonical `MeV1Response` after success. Its `user` contains required `id`, `email`, `displayName` (nullable), and `mustChangePassword`; top-level roles and effective permissions retain their current semantics. The FE should reload `/api/v1/me` through its auth store after PATCH and use that refreshed identity as canonical.
11. In one transaction, update the display name and write required audit event `user.profile_updated` with actor=current authenticated user, resource=current user, request ID, current session ID, IP, and user agent from existing request context. Allowlist metadata to `{ changedFields: ["displayName"] }`. Audit failure rolls back the update. Do not log/audit submitted or previous display-name values.
12. Keep email readable but read-only. Roles/permissions are read-only. ID is immutable. `mustChangePassword`, status, email-verification timestamps, last-login time, creation/update/deletion timestamps, password hash, session/token/challenge data, and audit internals are not user-editable; return only fields currently approved in the `/me` response plus `displayName`.
13. Since adding the Drizzle column changes full-row selections/`returning()` output, maintain the existing admin `/api/v1/users*` response schema and runtime shape. Add only explicit projections or response serialization needed to avoid leaking `displayName`; do not change admin operations or expose the new field there.
14. Define no profile-specific duplicate/conflict response: displayName is not unique. Preserve existing generic `401`, `403`, `413`, `429`, and centralized safe `500` behavior. Validation and unsupported-field attempts return generic safe `400`; frontend validation uses the exact rule in this contract.
15. Do not add endpoint-specific rate limiting unless an existing shared global policy already applies; preserve existing middleware and do not invent a rate policy.
16. OpenAPI under `apps/api/src/modules/me/v1/me.openapi.yaml` documents GET and PATCH method/path, bearer security, exact request/response fields, and `400`, `401`, `403`, `413`, `429`, and `500` outcomes. Add response schema for `displayName: string | null` without removing existing `/me` fields.
17. Use `0020_add-display-name-to-users.sql` with matching `0020_add-display-name-to-users.down.sql` and one forward journal entry. The approved DOWN operation drops only this new column and therefore deletes display-name values written after UP; human approval for this data-loss behavior was given during planning. Execute and record UP, DOWN, and re-apply validation against an isolated database using the repository-compatible rollback executor.
18. Update `docs/API.md` and FE-26's dependency/contract reference only after actual implementation and OpenAPI agree. Do not implement FE-26.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no configuration changes.

### API Contract

All paths below are full application paths.

| Method | Path         | Auth                                                                                                                    | Request                          | Success                                                              | Errors                                                                                                                                  |
| ------ | ------------ | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/me` | Bearer access token; active authenticated user; allowed during mandatory password change                                | None                             | `200 MeV1Response`, now including `user.displayName: string \| null` | Existing generic `401`, `413`, `429`, safe `500`                                                                                        |
| PATCH  | `/api/v1/me` | Bearer access token; active authenticated user; mandatory password change must be complete; no `user.update` permission | Strict `{ displayName: string }` | `200 MeV1Response` with updated canonical identity context           | `400 { message: "Bad request" }`; generic `401`; `403 password_change_required`; existing `413`; existing `429`; safe centralized `500` |

`displayName` is trimmed at both ends and must contain 1–80 Unicode code points after trimming. Null, missing, empty-after-trim, non-string, and extra properties reject. Internal whitespace is preserved. No case folding or Unicode normalization occurs. A normalized unchanged value returns `200` without mutation/audit. There is no uniqueness conflict.

**Readable/self-visible field classification:**

| Field                                                        | Classification                         | Self response                                                 |
| ------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------- |
| `id`                                                         | Immutable identity                     | Read-only UUID                                                |
| `email`                                                      | Security-sensitive identity; read-only | Existing email field                                          |
| `displayName`                                                | Self-editable personal profile         | Nullable string; null until first successful update           |
| `mustChangePassword`                                         | Security/system-managed                | Existing boolean; read-only                                   |
| `roles`                                                      | Admin/RBAC-managed                     | Existing top-level role-code array; read-only                 |
| `permissions`                                                | Admin/RBAC-managed                     | Existing top-level effective permission-code array; read-only |
| Account `status`                                             | Admin/system-managed                   | Not exposed by self-profile                                   |
| Password hash, tokens, sessions, challenges, audit internals | Secret/internal                        | Never exposed                                                 |
| Email verification and lifecycle timestamps                  | System-managed                         | Not exposed by self-profile                                   |
| Avatar, phone, and all other profile fields                  | Not present/approved                   | Not exposed or editable                                       |

**Response:** same canonical shape as existing `/api/v1/me`, with `user.displayName` added and required in the response schema but nullable in value:

```json
{
  "user": {
    "id": "<uuid>",
    "email": "user@example.test",
    "displayName": null,
    "mustChangePassword": false
  },
  "roles": [],
  "permissions": []
}
```

The sample is synthetic. The PATCH success response returns the same shape with the persisted display name. FE-26 refetches `/api/v1/me` after success and refreshes auth-store identity from that response.

### Database Contract

- Add nullable `users.display_name TEXT`; no default, backfill, constraint, index, or relationship.
- Update only `display_name` and the existing `updated_at` behavior on a changed value.
- In the same transaction, append required generic audit event `user.profile_updated` with allowlisted changed-field metadata. No row value is stored in audit metadata.
- No other entity or admin user-management semantics change. Admin response serializers continue to omit `displayName`.
- Matching DOWN drops only this column. It destroys values written after UP; the human explicitly approved this rollback impact during task planning.

### UI Contract

Not applicable — backend task. `fe/26-update-profile` consumes the exact field and rules above.

## 10. File Impact

| Classification                             | Expected files / impact                                                                                                                                                                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expected Modify — schema/migration         | `apps/api/src/config/drizzle/schema/users.schema.ts`; one `apps/api/drizzle/` forward migration, matching `.down.sql`, and `meta/_journal.json` forward entry. Entity/schema work remains under existing configuration ownership; no new top-level source directory. |
| Expected Modify — auth/self context module | `apps/api/src/modules/auth/v1/me.router.ts`, current me controller, `services/context.service.ts`, `repositories/context.repository.ts`; add focused module-owned service/repository/validation files only if current boundaries require them.                       |
| Expected Modify — admin response stability | Minimal serializer/projection in existing `apps/api/src/modules/user/` boundary if required to keep the documented admin response unchanged after schema expansion. No new admin capability or permission behavior.                                                  |
| Expected Modify — contract/docs            | `apps/api/src/modules/me/v1/me.openapi.yaml`, `docs/API.md`, and FE-26 dependency/contract references after runtime implementation.                                                                                                                                  |
| Expected Tests                             | Existing me/context/user/OpenAPI suites plus isolated PostgreSQL audit/migration tests, following current repository conventions.                                                                                                                                    |
| Expected Not Modified                      | Login/refresh/logout/password semantics, email lifecycle, RBAC policy/catalog, admin user API behavior or response contract, unrelated modules, package manifests/dependencies, environment files, and FE-26 frontend source.                                        |

Expected paths are guidance; agent must inspect repository before finalizing changes. Ownership remains the existing auth/me context and users entity. No new `apps/api/src` root directory is permitted.

## 11. Runtime Behavior

1. `GET /api/v1/me` authenticates through existing access middleware with the existing mandatory-change exception, loads the active current user and current RBAC context, and returns the existing fields plus nullable display name.
2. `PATCH /api/v1/me` authenticates through the default access policy. If the account still requires first-login password change, existing middleware returns `403 password_change_required` before mutation.
3. The controller validates the strict body. The service trims outer whitespace and validates 1–80 Unicode code points; it does not accept a target identity.
4. The repository transaction locks and reloads the active principal's user row, then rechecks the mandatory-change flag before mutation. If the user became inactive/deleted, return generic `401`; if the mandatory flag became true, return `403 password_change_required`.
5. If the normalized value matches the stored value, return the current canonical response without an update or audit write.
6. Otherwise the transaction updates only the current user's display name and records the required safe audit event. Audit failure rolls back the update.
7. The endpoint loads/returns the updated canonical context with existing roles and permissions; CMS then refetches `/me` to refresh the auth store.
8. Admin `/api/v1/users*` endpoints continue to return their existing response contract, without incidental display-name exposure.

## 12. Error And Edge Cases

| Scenario                                                   | Expected Result                                       | Security / Recovery                                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Missing, null, non-string, blank, or overlong display name | `400 { message: "Bad request" }`; no mutation/audit   | Strict schema and normalized length check; do not echo submitted value                    |
| Unknown/privileged field in PATCH body                     | Generic `400`; no mutation/audit                      | Reject, do not silently ignore or permit mass assignment                                  |
| Missing/invalid/expired/revoked authentication             | Existing generic `401`                                | Do not reveal account status                                                              |
| `mustChangePassword === true` on PATCH                     | Existing `403 password_change_required`               | GET `/me` remains available; no mutation bypass                                           |
| Display name unchanged after trimming                      | `200` canonical response; no DB update or audit event | Deterministic no-op                                                                       |
| User becomes inactive/deleted before persistence           | Generic `401`; no mutation                            | Never update a different identity or disclose account state                               |
| Required audit insert fails                                | Safe `500`; display-name update rolls back            | Fail closed for requested audited change                                                  |
| DB/permission/context lookup fails                         | Safe centralized `500`; no partial success            | No SQL/internal detail                                                                    |
| Admin user response after schema expansion                 | Existing schema and response shape remain unchanged   | New field must not leak through row spreads                                               |
| Migration DOWN after display names were written            | Column and values are removed                         | This data-loss rollback was explicitly approved; test only against isolated disposable DB |

## 13. Security Requirements

- Authenticate the request and derive the subject/session only from validated middleware context. No user ID parameter/body value may select a target.
- Use strict Zod validation and an explicit one-field allowlist. Do not reuse admin update schemas.
- Apply mandatory-change enforcement to PATCH; retain the existing explicit GET `/me` exception.
- Never permit self-edits to email, roles, permissions, status, password, lifecycle/security fields, or another user's identity.
- Return minimum approved identity context only. Keep all secret/internal values out of the response.
- Audit changed field names only; do not persist old/new values, request bodies, credentials, headers, cookies, tokens, or exception data in audit/logs.
- Require the successful audit event in the same transaction as the update.
- Preserve generic public auth failures, established rate limits, body-size limits, safe centralized errors, and existing admin authorization.
- Migration rollback deletes newly stored display names; execute only with the recorded explicit human approval and on isolated test data during validation.

## 14. Test Requirements

| Category             | Required proof                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Happy Path           | Authenticated principal reads its own context; display name null/updated values serialize; exact PATCH updates only that principal; response is canonical; audit commits; no-op returns success without write/audit |
| Validation           | Strict schema rejects absent/null/non-string/extra fields; trim behavior; whitespace-only failure; 1 and 80 Unicode code points pass; 0 and 81 fail; internal whitespace preserved                                  |
| Negative / Failure   | Generic 401; mandatory-change 403; audit/database failure safe response and no partial update; inactive/deleted identity is not mutated                                                                             |
| Security             | No user ID targeting; email/role/permission/status/password/avatar fields reject; no internal/secret values in self response; default auth policy on PATCH                                                          |
| Regression           | Existing GET `/me` fields and password flag remain; login/refresh/auth guards pass; admin user operations retain permission behavior and documented/runtime response shape                                          |
| Audit                | One `user.profile_updated` required event for an actual changed value; metadata exactly allowlisted; audit failure rolls back; no-op does not create an event                                                       |
| OpenAPI              | GET/PATCH path, IDs, auth, nullable displayName, strict request, success and errors match runtime                                                                                                                   |
| Database / Migration | Isolated PostgreSQL proves nullable column for existing rows, persistence/update behavior, UP, DOWN, schema restoration, and re-apply through the repository-compatible rollback executor                           |
| Isolation            | Tests use synthetic users and disposable databases; deterministic cleanup; no dependence on execution order; migration proof contains no production data                                                            |

## 15. Task-Level Expected Results

- `GET /api/v1/me` is the only canonical self-profile read and includes `user.displayName`.
- `PATCH /api/v1/me` changes only the authenticated user's display name under the exact validation contract.
- Existing accounts remain valid with null display names and can set one later.
- Mandatory-change users can read `/me` but cannot mutate profile before completing FE-24/BE-38.
- Successful changed values are durably audited atomically; no-op updates do not create noise.
- Administrative user API response and authorization contracts remain unchanged.
- FE-26 receives a frontend-consumable contract with no field, endpoint, validation, or session-policy guessing.

## 16. Acceptance Criteria

- [ ] `users.display_name` exists as nullable text with a focused migration and matching DOWN; existing rows are not backfilled.
- [ ] `GET /api/v1/me` returns required nullable `user.displayName` and preserves every existing response field and meaning.
- [ ] `PATCH /api/v1/me` accepts only strict `{ displayName: string }`, derives the user from authentication, and does not require `user.update`.
- [ ] Display-name trim, Unicode code-point length, empty/null/missing/extra-field, and no-op semantics match this contract.
- [ ] PATCH is denied with existing `403 password_change_required` while mandatory password change is active; GET `/me` remains available.
- [ ] Email, roles, permissions, status, password, avatar, and target-user selection cannot be changed through this API.
- [ ] Changed value and required `user.profile_updated` audit write commit atomically with allowlisted metadata; unchanged update causes no audit write.
- [ ] Admin user API responses and authorization behavior remain unchanged after schema expansion.
- [ ] OpenAPI and `docs/API.md` match implementation; FE-26 references BE-40 contract without FE source changes.
- [ ] Focused HTTP/service/integration/migration/OpenAPI tests, backend suite, lint, typecheck, formatting, Code Anti-Slop, and `git diff --check` pass.
- [ ] Migration UP, approved DOWN data removal, and re-apply are proven against an isolated database; no production/manual DDL is used.

## 17. Anti-Slop Requirements

- **Code Anti-Slop:** required. Check for broad admin schema reuse, mass assignment, duplicated profile schemas, unnecessary service abstractions, dead code/dependencies, fake audit, hidden TODO/FIXME/HACK, unjustified `any`/assertions, row-spread data leaks, and unrelated changes.
- **UI Anti-Slop:** not applicable — backend task.
- **Visual Verification:** not applicable — backend task.
- Keep scope to one field, one focused schema migration, the existing me contract, safe audit, and necessary admin response projection. Do not create a generic profile framework or speculative profile properties.

## 18. Validation Requirements

- **Static:** `bun run --cwd apps/api lint`, `bun run --cwd apps/api typecheck`, `bun run --cwd apps/api format:check`, and `git diff --check`.
- **Automated Tests:** focused me/context/user/OpenAPI tests and `bun run --cwd apps/api test`; isolated PostgreSQL integration tests for persistence, audit transaction, and mandatory boundary.
- **Build:** Not applicable if `apps/api/package.json` has no build script; typecheck and runtime tests provide compilation evidence.
- **Database:** Drizzle generation/schema validation, focused UP, DOWN, and re-apply against an isolated database using a repository-compatible rollback executor; review journal and matching reverse operation.
- **UI:** Not applicable — backend task.
- **Anti-Slop:** Code Anti-Slop against changed files, fix findings, then rerun.

## 19. Completion Evidence

- AC-001 → schema diff, migration journal, isolated PostgreSQL UP/DOWN/re-apply evidence.
- AC-002 → `me-context.test.ts`, context service/repository tests, OpenAPI assertion for nullable field.
- AC-003–006 → route/API integration and validation tests covering principal ownership, strict allowlist, normalization, boundaries, no-op, and mandatory-flow 403.
- AC-007 → isolated DB audit assertions showing atomic success, allowlisted metadata, and rollback on audit failure.
- AC-008 → existing admin user tests plus response-shape assertions showing `displayName` is not exposed and permission checks are unchanged.
- AC-009 → aggregated OpenAPI/API docs checks, FE-26 task diff, and proof no frontend source changed.
- AC-010–011 → exact test/lint/typecheck/format/migration/Anti-Slop output, `git diff --check`, and reviewed `git status`/diff.

## 20. Traceability

| Trace Type          | References                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| PRD                 | `docs/PRD.md` (account-profile requirements currently unspecified)                                                          |
| Feature             | `fe/26-update-profile`; `be/40-authenticated-self-profile`                                                                  |
| Requirement         | User-approved `displayName` field, required/trimmed/1–80 chars; authenticated self ownership; provided backend task request |
| Acceptance Criteria | AC-001–AC-011 in this task                                                                                                  |
| API Operation       | Existing `getAuthenticatedUserContext`; planned `updateCurrentUserProfile`; `GET/PATCH /api/v1/me`                          |
| Database            | `users.display_name`; focused add-column migration                                                                          |
| Test IDs            | Not applicable — project has no test ID registry                                                                            |
| Design/Figma        | Not applicable — backend task                                                                                               |

## 21. Open Points

None. Human decisions recorded during task planning: add `displayName` as the only editable profile field; it is required on PATCH, outer whitespace is trimmed, length is 1–80 characters; existing users may have null until they set it; email remains read-only; the DOWN migration may delete values introduced after UP.

## 22. Definition Of Done

- [ ] Acceptance criteria and approved scope are satisfied.
- [ ] Schema, migration, me endpoint, audit transaction, OpenAPI, and admin response compatibility are implemented.
- [ ] Focused and full applicable tests pass, including isolated PostgreSQL and migration rollback/re-apply evidence.
- [ ] Lint, typecheck, formatting, Code Anti-Slop, and `git diff --check` pass.
- [ ] Changed-file, secret/PII, API compatibility, and scope reviews pass.
- [ ] FE-26 handoff identifies exact fields, operations, validation, errors, and post-update refresh behavior.
