# be/27-role-crud — Role CRUD Contract

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/27-role-crud` |
| Batch | N/A |
| Owning Feature | Role management |
| Workstream | Backend |
| Task Category | API contract planning |
| Repository/App | `apps/api` |
| Status | Blocked — requirement needed |
| Priority | N/A |
| Suggested Size | Medium |
| Depends On | `be/13-rbac-permissions`, `be/23-versioned-openapi-swagger`, `be/25-authenticated-rbac-context` |
| Blocks | `fe/15-role-crud` |
| Execution Order | 27 |

## 2. Outcome

Define an approved role-management API contract before implementation. This task currently creates no route, schema, migration, permission, or controller.

## 3. Context

Existing RBAC is backend-authoritative and foundation-only. Role CRUD must use module-first architecture, explicit route permissions, safe errors, OpenAPI YAML, and existing audit policy. No current role-management API exists.

## 4. Dependencies

Existing users, roles, permissions, user-role, and role-permission tables. Human approval is required for product role lifecycle and permission assignment semantics.

## 5. In Scope

- Decide route ownership and versioned paths.
- Define role fields and mutable fields.
- Define permission catalog and assignment contract.
- Define reserved/system-role behavior.
- Define pagination/search behavior if list exists.
- Define RBAC permissions, audit events, errors, and focused tests.

## 6. Out of Scope

Implementation, migrations, seed catalog expansion, user management, authentication redesign, frontend UI, and admin bypasses.

## 7. Existing Implementation

Inspect `apps/api/src/config/drizzle/schema.ts`, `apps/api/src/modules/rbac/`, `apps/api/src/middleware/permission.middleware.ts`, OpenAPI aggregation, and audit conventions.

## 8. Implementation Requirements

Do not infer role names, route paths, field mutability, permission assignment behavior, delete semantics, or reserved-role policy. Preserve `user → role → permission → action` and deny by default.

## 9. Applicable Contracts

**API Contract:** Not approved. Candidate REST shape and exact paths require human approval.

**Database Contract:** Existing roles and role-permissions tables only unless an approved contract proves schema change necessary.

## 10. File Impact

Expected Create/Modify: this planning contract only. Expected Not Modified: `apps/api/**`, migrations, OpenAPI, packages, lockfiles, and CMS source.

## 11. Runtime Behavior

No runtime behavior until open points are approved and a successor implementation task is created.

## 12. Error And Edge Cases

Approval must define duplicate role, unknown permission, reserved role mutation, missing role, unauthorized caller, validation failure, and concurrent assignment behavior.

## 13. Security Requirements

No client-supplied role grants access; backend middleware remains authoritative; no `isAdmin` or `super_admin` bypass; audit sensitive role/permission changes according to approved policy.

## 14. Test Requirements

After approval: contract, validation, authorization, reserved-role, permission-assignment, audit, error, and regression tests. No implementation tests belong in this planning task.

## 15. Task-Level Expected Results

Open questions are explicit and frontend cannot proceed against guessed role behavior.

## 16. Acceptance Criteria

- [ ] Route and method contract approved.
- [ ] Role fields and lifecycle approved.
- [ ] Permission catalog and assignment behavior approved.
- [ ] Reserved-role and audit policy approved.
- [ ] Implementation task split created after approval.

## 17. Anti-Slop Requirements

Use `document-planning`, `api-design`, `architecture`, `security-review`, and `verification-loop`. Reject speculative role names, wildcard permissions, generic CRUD, and duplicate authorization logic.

## 18. Validation Requirements

Review contract against architecture, security, RBAC, OpenAPI, database, and audit docs. Run `git diff --check` and changed-file review.

## 19. Completion Evidence

Human-approved answers for all open points and a successor implementation task.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

- TODO: REQUIREMENT NEEDED — role routes and HTTP methods.
- TODO: REQUIREMENT NEEDED — role fields, labels, descriptions, and mutability.
- TODO: REQUIREMENT NEEDED — permission catalog and assignment API.
- TODO: REQUIREMENT NEEDED — reserved/system-role lifecycle.
- TODO: REQUIREMENT NEEDED — pagination/search and audit behavior.

## 22. Definition Of Done

Contract decisions are approved, implementation scope is split, no behavior is invented, and governance review passes.
