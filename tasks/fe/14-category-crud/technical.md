# fe/14-category-crud — Category CRUD UI

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `fe/14-category-crud` |
| Batch | N/A |
| Owning Feature | Category management UI |
| Workstream | Frontend |
| Task Category | Business module UI |
| Repository/App | `apps/cms` |
| Status | Blocked — backend contract |
| Priority | N/A |
| Suggested Size | Medium |
| Depends On | `fe/13-tailadmin-ui-foundation`, `be/26-category-crud` |
| Blocks | N/A |
| Execution Order | 14 |

## 2. Outcome

Provide TailAdmin-consistent category list and form UI after the category API contract is approved and implemented.

## 3. Context

`be/26-category-crud` is the backend contract source. No category fields, endpoints, search, pagination, sorting, or permission keys may be inferred here.

## 4. Dependencies

TailAdmin foundation and completed category API/OpenAPI/RBAC contract.

## 5. In Scope

Consume approved list/create/update/delete contracts; compose shared table, form, badge, pagination, loading, empty, error, and modal primitives.

## 6. Out of Scope

API design, field invention, permission catalog, fake rows, and category business rules.

## 7. Existing Implementation

Inspect `apps/cms/src/components/`, router, API client, and `be/26-category-crud` before implementation.

## 8. Implementation Requirements

Use exact backend schemas and permission keys. Do not duplicate authorization logic or invent query parameters.

## 9. Applicable Contracts

**API/UI Contract:** BLOCKED — consume `be/26-category-crud` only after approval.

## 10. File Impact

Expected Modify/Create: category module components, routes, API client types, and tests after unblock. Expected Not Modified: backend contract files in this task.

## 11. Runtime Behavior

Not applicable until API contract exists.

## 12. Error And Edge Cases

Use approved validation, conflict, unauthorized, empty, loading, and server-error responses only.

## 13. Security Requirements

Backend authorizes every operation. Frontend visibility is UX only.

## 14. Test Requirements

After unblock: list/form states, validation, API errors, pagination/search contract, permission visibility, and route behavior.

## 15. Task-Level Expected Results

Category UI matches TailAdmin shared system without guessed behavior.

## 16. Acceptance Criteria

- [ ] `be/26-category-crud` approved and implemented.
- [ ] UI consumes exact API contract.
- [ ] Shared TailAdmin primitives are reused.
- [ ] Tests, lint, typecheck, build, and browser verification pass.

## 17. Anti-Slop Requirements

Use `frontend-patterns`, `ui-styling`, `tdd-workflow`, `antislop`, `antislop-ui`, `antislop-human`, `antislop-layoutmobile`, `browser-verification`, and `verification-loop` as applicable.

## 18. Validation Requirements

Focused tests, lint, typecheck, build, browser verification, Anti-Slop, diff check, and scope review.

## 19. Completion Evidence

API contract mapping, tests, static checks, and TailAdmin side-by-side browser evidence.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

All category API and product decisions remain in `be/26-category-crud`.

## 22. Definition Of Done

Approved backend contract consumed exactly; no guessed fields, permissions, or behavior; automated and visual gates pass.
