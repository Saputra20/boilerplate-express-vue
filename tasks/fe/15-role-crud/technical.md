# fe/15-role-crud — Role CRUD UI

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `fe/15-role-crud` |
| Batch | N/A |
| Owning Feature | Role management UI |
| Workstream | Frontend |
| Task Category | Business module UI |
| Repository/App | `apps/cms` |
| Status | Blocked — backend contract |
| Priority | N/A |
| Suggested Size | Medium |
| Depends On | `fe/13-tailadmin-ui-foundation`, `be/27-role-crud` |
| Blocks | N/A |
| Execution Order | 15 |

## 2. Outcome

Provide TailAdmin-consistent role and approved permission-assignment UI after `be/27-role-crud` is approved and implemented.

## 3. Context

Role fields, reserved-role rules, permission catalog, assignment behavior, and permissions are not approved. Backend remains authorization authority.

## 4. Dependencies

TailAdmin foundation and completed role API/OpenAPI/RBAC contract.

## 5. In Scope

Consume exact approved role list/form/assignment contracts using shared visual primitives.

## 6. Out of Scope

Role semantics, permission keys, API design, admin bypasses, and fake role data.

## 7. Existing Implementation

Inspect CMS shared components, auth permissions, and `be/27-role-crud` before implementation.

## 8. Implementation Requirements

Use exact backend role and permission schemas. Do not infer authorization from display labels.

## 9. Applicable Contracts

**API/UI Contract:** BLOCKED — consume `be/27-role-crud` after approval.

## 10. File Impact

Expected Modify/Create: role module components, routes, client types, and tests after unblock. Expected Not Modified: backend implementation in this task.

## 11. Runtime Behavior

Not applicable until contract exists.

## 12. Error And Edge Cases

Use approved reserved-role, validation, conflict, forbidden, empty, loading, and error behavior.

## 13. Security Requirements

Frontend role UI never grants authorization; backend permission middleware remains authoritative.

## 14. Test Requirements

After unblock: role forms, permission assignment display, validation, errors, denied actions, and route behavior.

## 15. Task-Level Expected Results

Role UI fits the shared TailAdmin system without inventing RBAC vocabulary.

## 16. Acceptance Criteria

- [ ] `be/27-role-crud` approved and implemented.
- [ ] Exact role/permission contract consumed.
- [ ] Shared primitives reused.
- [ ] Automated and browser visual gates pass.

## 17. Anti-Slop Requirements

Use `frontend-patterns`, `security-review`, `ui-styling`, `tdd-workflow`, `antislop`, applicable UI/human audits, `browser-verification`, and `verification-loop`.

## 18. Validation Requirements

Focused tests, lint, typecheck, build, browser verification, Anti-Slop, diff check, and scope review.

## 19. Completion Evidence

Approved API mapping, tests, static checks, and TailAdmin side-by-side browser evidence.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

All role and permission decisions remain in `be/27-role-crud`.

## 22. Definition Of Done

Approved backend contract consumed exactly and all automated/security/visual gates pass.
