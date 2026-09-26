# fe/17-dashboard-summary — Dashboard Summary UI

## 1. Metadata

| Field           | Value                                                      |
| --------------- | ---------------------------------------------------------- |
| Task ID         | `fe/17-dashboard-summary`                                  |
| Batch           | N/A                                                        |
| Owning Feature  | CMS dashboard summary                                      |
| Workstream      | Frontend                                                   |
| Task Category   | Business module UI                                         |
| Repository/App  | `apps/cms`                                                 |
| Status          | Blocked — metric contract                                  |
| Priority        | N/A                                                        |
| Suggested Size  | Small/Medium                                               |
| Depends On      | `fe/13-tailadmin-ui-foundation`, `be/29-dashboard-summary` |
| Blocks          | N/A                                                        |
| Execution Order | 17                                                         |

## 2. Outcome

Render approved dashboard metrics in TailAdmin cards/charts only after each metric has a real backend source and contract.

## 3. Context

The UI foundation may render an informational/empty dashboard. No counts, charts, activity data, or growth values are approved currently.

## 4. Dependencies

TailAdmin foundation and completed `be/29-dashboard-summary` contract.

## 5. In Scope

Consume approved metric response and render shared cards, loading, empty, error, responsive, and accessibility states.

## 6. Out of Scope

Metric invention, analytics backend, fake values, chart data fabrication, caching, and domain aggregation.

## 7. Existing Implementation

Inspect CMS home, shared primitives, current API client, and `be/29-dashboard-summary` before implementation.

## 8. Implementation Requirements

Use exact metric definitions and freshness/error semantics. Keep empty state when no metric contract exists.

## 9. Applicable Contracts

**API/UI Contract:** Consume `be/29-dashboard-summary` exactly: `GET /api/v1/dashboard/summary`, permission `dashboard.read`, and response `{ users: { total, active, disabled }, roles: { total }, categories: { total, active } }`. FE renders backend-provided counts only; no derivation, fallback metrics, fake charts, or fabricated values.

## 10. File Impact

Expected Modify/Create: dashboard view, API types/client, and tests after unblock. Expected Not Modified: backend metric implementation in this task.

## 11. Runtime Behavior

Not applicable until metric contract exists; foundation informational state remains valid.

## 12. Error And Edge Cases

Use approved loading, empty, stale, partial, unauthorized, and server-error behavior.

## 13. Security Requirements

Do not expose unauthorized aggregates or sensitive user information. Backend authorizes metric access.

## 14. Test Requirements

After unblock: metric parsing, card states, empty/error behavior, responsive composition, and permission behavior.

## 15. Task-Level Expected Results

Dashboard metrics are real, defined, and traceable; no fake demo statistics appear.

## 16. Acceptance Criteria

- [ ] `be/29-dashboard-summary` approved and implemented.
- [ ] Every rendered metric maps to an API definition and source.
- [ ] Shared TailAdmin primitives reused.
- [ ] Automated and browser visual gates pass.

## 17. Anti-Slop Requirements

Use `frontend-patterns`, `ui-ux-pro-max`, `ui-styling`, `tdd-workflow`, `antislop`, `antislop-ui`, `antislop-human`, `browser-verification`, and `verification-loop` as applicable.

## 18. Validation Requirements

Focused tests, lint, typecheck, build, browser verification, Anti-Slop, diff check, and scope review.

## 19. Completion Evidence

Metric contract mapping, tests, static checks, and TailAdmin side-by-side browser evidence.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

Backend contract is documented in `be/29-dashboard-summary`; execution remains blocked until human review, `be/26` category schema availability, and backend implementation complete.

## 22. Definition Of Done

Approved real metrics are consumed exactly; no fabricated data remains; automated and visual gates pass.
