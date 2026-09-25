# fe/16-user-management — User Management UI

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `fe/16-user-management` |
| Batch | N/A |
| Owning Feature | User management UI |
| Workstream | Frontend |
| Task Category | Business module UI |
| Repository/App | `apps/cms` |
| Status | Blocked — backend contract |
| Priority | N/A |
| Suggested Size | Large |
| Depends On | `fe/13-tailadmin-ui-foundation`, `be/28-user-management` |
| Blocks | N/A |
| Execution Order | 16 |

## 2. Outcome

Provide TailAdmin-consistent user list and forms after the user-management API contract is approved and implemented.

## 3. Context

Editable fields, status semantics, role assignment, password/invitation behavior, search, pagination, and permission keys are not approved.

## 4. Dependencies

TailAdmin foundation and completed `be/28-user-management` contract.

## 5. In Scope

Consume exact user list/detail/create/update/status/assignment contracts using shared tables, forms, badges, pagination, loading, empty, error, and modal primitives.

## 6. Out of Scope

Auth redesign, password policy invention, user fields, role semantics, API design, and fake accounts.

## 7. Existing Implementation

Inspect CMS shared components, auth state, API client, and `be/28-user-management` before implementation.

## 8. Implementation Requirements

Use exact backend response/request schemas. Never display sensitive fields or treat client state as authorization.

## 9. Applicable Contracts

**API/UI Contract:** BLOCKED — consume `be/28-user-management` after approval.

## 10. File Impact

Expected Modify/Create: user module components, routes, client types, and tests after unblock. Expected Not Modified: auth/backend implementation in this task.

## 11. Runtime Behavior

Not applicable until contract exists.

## 12. Error And Edge Cases

Use approved duplicate, validation, status, role-assignment, unauthorized, empty, loading, and server-error behavior.

## 13. Security Requirements

Do not expose password hashes, tokens, secrets, or internal auth data. Backend remains authorization authority.

## 14. Test Requirements

After unblock: list/form states, validation, safe fields, role assignment, status behavior, API errors, permissions, and route behavior.

## 15. Task-Level Expected Results

User UI follows shared TailAdmin system without duplicating authentication behavior.

## 16. Acceptance Criteria

- [ ] `be/28-user-management` approved and implemented.
- [ ] Exact user contract consumed.
- [ ] Shared primitives reused.
- [ ] Automated, security, and browser gates pass.

## 17. Anti-Slop Requirements

Use `frontend-patterns`, `security-review`, `ui-styling`, `tdd-workflow`, `antislop`, applicable UI/human audits, `browser-verification`, and `verification-loop`.

## 18. Validation Requirements

Focused tests, lint, typecheck, build, browser verification, Anti-Slop, diff check, secret review, and scope review.

## 19. Completion Evidence

Approved API mapping, tests, static checks, safe-field review, and TailAdmin browser evidence.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

All user-management decisions remain in `be/28-user-management`.

## 22. Definition Of Done

Approved backend contract consumed exactly; auth boundaries preserved; automated/security/visual gates pass.
