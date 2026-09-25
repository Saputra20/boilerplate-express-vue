# be/28-user-management — User Management Contract

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/28-user-management` |
| Batch | N/A |
| Owning Feature | CMS user management |
| Workstream | Backend |
| Task Category | API contract planning |
| Repository/App | `apps/api` |
| Status | Blocked — requirement needed |
| Priority | N/A |
| Suggested Size | Large |
| Depends On | `be/04-identity-schema`, `be/13-rbac-permissions`, `be/23-versioned-openapi-swagger`, `be/25-authenticated-rbac-context` |
| Blocks | `fe/16-user-management` |
| Execution Order | 28 |

## 2. Outcome

Define an approved user-management API contract before implementation. This task does not create user CRUD routes or change authentication.

## 3. Context

Authentication already owns login, sessions, refresh, logout, and current identity. User management must not duplicate those responsibilities. No user-management API exists.

## 4. Dependencies

Existing users, roles, user-role, session, and audit structures. Human approval is required for editable fields, status transitions, role assignment, password/invitation behavior, and permissions.

## 5. In Scope

- Decide readable and editable user fields.
- Define list/detail/create/update/status/role-assignment routes if needed.
- Define validation, pagination, search, filtering, errors, RBAC permissions, and audit behavior.
- Define password or invitation ownership without duplicating auth flows.

## 6. Out of Scope

Implementation, migrations, login/refresh/logout changes, password reset design unless explicitly approved, frontend UI, and invented user fields.

## 7. Existing Implementation

Inspect `apps/api/src/config/drizzle/schema.ts`, auth module services/repositories, RBAC middleware, audit module, OpenAPI aggregation, and current authentication task contracts.

## 8. Implementation Requirements

Do not infer profile fields, account statuses, role assignment semantics, password handling, delete behavior, search parameters, or permission keys. Keep sensitive fields out of responses.

## 9. Applicable Contracts

**API Contract:** Not approved. Candidate route shape and methods require human approval.

**Database Contract:** Existing `users`, `user_roles`, and related tables only unless an approved contract requires a focused migration.

## 10. File Impact

Expected Create/Modify: this planning contract only. Expected Not Modified: application source, migrations, OpenAPI, packages, lockfiles, and CMS source.

## 11. Runtime Behavior

No runtime behavior until contract decisions are approved and implementation is separately authorized.

## 12. Error And Edge Cases

Approval must define duplicate email, invalid fields, unknown user, disabled/deleted user, unauthorized caller, role assignment failure, password/invitation failure, and safe error messages.

## 13. Security Requirements

Never expose password hashes, tokens, secrets, or raw credentials. Preserve generic authentication failures. Backend authorization is authoritative; no client-only user administration.

## 14. Test Requirements

After approval: request validation, authorization, safe response fields, status lifecycle, role assignment, pagination/search, audit, error, and authentication regression tests.

## 15. Task-Level Expected Results

User-management behavior remains blocked rather than being invented to satisfy the TailAdmin UI.

## 16. Acceptance Criteria

- [ ] User routes and methods approved.
- [ ] Read/write fields and status lifecycle approved.
- [ ] Role assignment and password/invitation ownership approved.
- [ ] Search/filter/pagination and error contracts approved.
- [ ] RBAC and audit policy approved.

## 17. Anti-Slop Requirements

Use `document-planning`, `api-design`, `architecture`, `security-review`, and `verification-loop`. Reject duplicate auth flows, speculative profile fields, unsafe responses, and generic CRUD scaffolding.

## 18. Validation Requirements

Review against auth, RBAC, security, database, API, OpenAPI, and audit sources. Run `git diff --check` and changed-file review.

## 19. Completion Evidence

Approved contract decisions and a successor implementation task with observable acceptance criteria.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

- TODO: REQUIREMENT NEEDED — readable/editable fields.
- TODO: REQUIREMENT NEEDED — user routes and methods.
- TODO: REQUIREMENT NEEDED — status, delete, and restoration semantics.
- TODO: REQUIREMENT NEEDED — role assignment behavior.
- TODO: REQUIREMENT NEEDED — password/invitation ownership.
- TODO: REQUIREMENT NEEDED — search/filter/pagination, RBAC, and audit behavior.

## 22. Definition Of Done

All user-management decisions are approved, auth ownership remains clear, implementation is split, and no behavior is guessed.
