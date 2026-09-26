# be/28-user-management — User Management Contract

## 1. Metadata

| Field           | Value                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Task ID         | `be/28-user-management`                                                                                                  |
| Batch           | N/A                                                                                                                      |
| Owning Feature  | CMS user management                                                                                                      |
| Workstream      | Backend                                                                                                                  |
| Task Category   | API contract planning                                                                                                    |
| Repository/App  | `apps/api`                                                                                                               |
| Status          | Proposed contract — human approval required                                                                              |
| Priority        | N/A                                                                                                                      |
| Suggested Size  | Large                                                                                                                    |
| Depends On      | `be/04-identity-schema`, `be/13-rbac-permissions`, `be/23-versioned-openapi-swagger`, `be/25-authenticated-rbac-context` |
| Blocks          | `fe/16-user-management`                                                                                                  |
| Execution Order | 28                                                                                                                       |

## 2. Outcome

Define an approved user-management API contract before implementation. This task does not create user CRUD routes or change authentication.

## 3. Context

Authentication already owns login, sessions, refresh, logout, and current identity. User management must not duplicate those responsibilities. No user-management API exists.

## 4. Dependencies

Existing users, roles, user-role, session, password-hashing, revocation, and audit structures. The proposed decisions below require human approval before implementation.

## 5. In Scope

- Record the proposed user API, lifecycle, role-assignment, password, pagination, RBAC, audit, and error decisions below for approval.

## 6. Out of Scope

Implementation, migrations, login/refresh/logout changes, password reset design unless explicitly approved, frontend UI, and invented user fields.

## 7. Existing Implementation

Inspect `apps/api/src/config/drizzle/schema.ts`, auth module services/repositories, RBAC middleware, audit module, OpenAPI aggregation, and current authentication task contracts.

## 8. Implementation Requirements

Do not infer behavior outside the proposed contract. Keep sensitive fields out of responses and preserve authentication ownership.

## 9. Applicable Contracts

### Proposed Contract Decisions

The API, database, lifecycle, password, authorization, and audit decisions below are proposed for human approval. No runtime behavior is approved until this review completes.

**API Contract — Proposed Contract Decisions:**

- `GET /api/v1/users` lists users; `POST /api/v1/users` creates; `GET /api/v1/users/:id` reads; `PATCH /api/v1/users/:id` updates; `DELETE /api/v1/users/:id` soft-deletes.
- Response fields are `id`, `email`, `status`, `emailVerifiedAt`, `roles`, `createdAt`, and `updatedAt`. Never return `passwordHash`, tokens, token hashes, session secrets, or audit metadata.
- Create accepts `email`, `password`, `status` (default `active`), and `roleCodes`; update accepts `email`, `status`, and complete replacement `roleCodes`. Password changes are not part of this API.
- Email uses the existing lowercase storage boundary and unique constraint. Duplicate email returns `409`.
- `password` is required on create, is passed unchanged to the existing Argon2id hashing helper, and is never logged or returned. Invitation, reset, and generated-password flows remain out of scope.
- List supports `page` (default 1, minimum 1), `limit` (default 20, maximum 100), `search` over email, `status`, and `roleCode` filters, and sort values `email.asc`, `email.desc`, `createdAt.asc`, `createdAt.desc`; default `createdAt.desc`.
- List response is `{ items, pagination: { page, limit, total, totalPages } }`.
- Create returns `201`; reads and updates return `200`; soft delete returns `204`; validation is existing `400`; duplicate email is `409`; missing user is `404`; auth is existing `401`/`403`.

**Database Contract — Proposed Contract Decisions:** Reuse `users`, `user_roles`, `roles`, and existing session/revocation tables. No migration is required. Delete sets `users.deleted_at`, preserves the row, changes no historical audit rows, and revokes all active sessions for the user. A deleted user cannot be restored through this API.

**Lifecycle and transaction Contract — Proposed Contract Decisions:** `active` and `disabled` remain the only user statuses. Disabling or soft-deleting a user revokes all active sessions in the same transaction. Role assignment replaces the complete `user_roles` set in one transaction; unknown role codes reject the request with `400` and leave prior assignments unchanged. Login behavior remains owned by auth and rejects disabled/deleted users using its existing generic response.

**Authorization Contract — Proposed Contract Decisions:** `user.read`, `user.create`, `user.update`, and `user.delete` are persisted permissions supplied by the explicit seed/catalog path. `user.update` covers status and complete role replacement. No role label or client state grants access.

**Audit Contract — Proposed Contract Decisions:** Successful create, update, role replacement, disable, and soft-delete operations require same-transaction generic audit events. Reads are not audited. Password input is never included in metadata.

## 10. File Impact

Expected Create/Modify: this planning contract only. Expected Not Modified: application source, migrations, OpenAPI, packages, lockfiles, and CMS source.

## 11. Runtime Behavior

No runtime behavior until the proposed contract is approved and implementation is separately authorized.

## 12. Error And Edge Cases

The proposed contract defines duplicate email as `409`, invalid fields as `400`, unknown user as `404`, unauthorized caller as existing `401`/`403`, unknown role as `400`, and password/invitation behavior as explicit password-on-create with no invitation flow. Public auth failures remain generic.

## 13. Security Requirements

Never expose password hashes, tokens, secrets, or raw credentials. Preserve generic authentication failures. Backend authorization is authoritative; no client-only user administration.

## 14. Test Requirements

After approval: request validation, authorization, safe response fields, status lifecycle, role assignment, pagination/search, audit, error, and authentication regression tests.

## 15. Task-Level Expected Results

User-management behavior remains blocked rather than being invented to satisfy the TailAdmin UI.

## 16. Acceptance Criteria

- [ ] Human approves the proposed routes, fields, lifecycle, password ownership, role assignment, pagination, RBAC, errors, and audit behavior.

## 17. Anti-Slop Requirements

Use `document-planning`, `api-design`, `architecture`, `security-review`, and `verification-loop`. Reject duplicate auth flows, speculative profile fields, unsafe responses, and generic CRUD scaffolding.

## 18. Validation Requirements

Review against auth, RBAC, security, database, API, OpenAPI, and audit sources. Run `git diff --check` and changed-file review.

## 19. Completion Evidence

Approved contract decisions and a successor implementation task with observable acceptance criteria.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

- Human approval is required for the proposed contract decisions in sections 9 and 11–12 before implementation.

## 22. Definition Of Done

All user-management decisions are approved, auth ownership remains clear, implementation is split, and no behavior is guessed.
