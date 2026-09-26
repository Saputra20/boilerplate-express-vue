# be/29-dashboard-summary — Dashboard Summary Contract

## 1. Metadata

| Field           | Value                                                       |
| --------------- | ----------------------------------------------------------- |
| Task ID         | `be/29-dashboard-summary`                                   |
| Batch           | N/A                                                         |
| Owning Feature  | CMS dashboard summary                                       |
| Workstream      | Backend                                                     |
| Task Category   | API contract planning                                       |
| Repository/App  | `apps/api`                                                  |
| Status          | Proposed contract — human approval required                 |
| Priority        | N/A                                                         |
| Suggested Size  | Small/Medium                                                |
| Depends On      | Domain-owning modules and `be/23-versioned-openapi-swagger` |
| Blocks          | `fe/17-dashboard-summary`                                   |
| Execution Order | 29                                                          |

## 2. Outcome

Decide whether the CMS needs a dashboard summary API and define only metrics backed by real domain data. No metric endpoint is created by this task.

## 3. Context

The TailAdmin visual shell may render an intentional empty/informational state without metrics. Existing `users` and `roles` tables support four initial counts; category counts become available only after `be/26-category-crud` creates the approved `categories` table.

## 4. Dependencies

Actual domain data owners, approved aggregation semantics, API versioning, RBAC, and OpenAPI conventions. `be/26-category-crud` is a required dependency for category metrics.

## 5. In Scope

- Record the proposed summary endpoint and initial metrics below for approval.

## 6. Out of Scope

Fake metrics, demo charts, guessed counts, analytics infrastructure, event tracking, caching, database changes, and frontend dashboard implementation.

## 7. Existing Implementation

Inspect domain schemas/modules, API conventions, RBAC, OpenAPI, and CMS home. No approved dashboard metric source currently exists.

## 8. Implementation Requirements

Do not publish a metric unless its source and definition are approved. Preserve backend authorization and safe empty/error behavior.

## 9. Applicable Contracts

### Proposed Contract Decisions

The endpoint, metric definitions, permission, freshness, failure, and frontend-consumption decisions below are proposed for human approval. No runtime behavior is approved until this review completes.

**API Contract — Proposed Contract Decisions:**

- `GET /api/v1/dashboard/summary`, bearer-authenticated, requires `dashboard.read`.
- Response: `{ users: { total, active, disabled }, roles: { total }, categories: { total, active } }`.
- `users.total` counts non-deleted users; `active` counts `status = active AND deleted_at IS NULL`; `disabled` counts `status = disabled AND deleted_at IS NULL`.
- `roles.total` counts all persisted roles because the current role schema has no delete/status fields.
- `categories.total` counts `deleted_at IS NULL`; `categories.active` counts `is_active = true AND deleted_at IS NULL`.
- The endpoint is not implementable until `categories` exists through `be/26-category-crud`; no nullable or fabricated category values are returned.
- Counts use current database state with no time window and no caching. Read failures return the existing safe `500` response. Reads do not create audit events.
- `dashboard.read` is a persisted permission supplied by the explicit seed/catalog path; frontend navigation never grants access.

**Frontend Contract — Proposed Contract Decisions:** FE consumes this exact response and renders loading, error, and empty states. It does not derive counts from list endpoints and does not fabricate unavailable metrics.

**Database Contract:** No schema change approved.

## 10. File Impact

Expected Create/Modify: this planning contract only. Expected Not Modified: application source, database, packages, lockfiles, and CMS source.

## 11. Runtime Behavior

No runtime behavior until the proposed metric contract is approved, `categories` exists, and implementation is separately authorized. CMS foundation uses empty/informational state meanwhile.

## 12. Error And Edge Cases

The proposed contract has no stale state because caching is disabled, no time boundaries, `401`/`403` for auth, safe `500` for aggregate failure, and no partial success response. Empty datasets return zero counts.

## 13. Security Requirements

Metrics must not leak unauthorized aggregate data or sensitive user information. Backend authorization remains authoritative.

## 14. Test Requirements

After approval: metric calculation/source tests, authorization, empty/stale/error behavior, response schema, OpenAPI, and regression tests.

## 15. Task-Level Expected Results

Dashboard visual work can proceed with an honest empty state; real statistics remain separate and evidence-based.

## 16. Acceptance Criteria

- [ ] Human approves the proposed endpoint, metrics, definitions, permission, freshness, failure, and dependency behavior.
- [ ] `be/26-category-crud` provides the category table before implementation.
- [ ] Implementation task and frontend consumer task are split.

## 17. Anti-Slop Requirements

Use `document-planning`, `api-design`, `architecture`, `security-review`, and `verification-loop`. Reject fake metrics, charts without data, speculative analytics, and unbounded aggregation.

## 18. Validation Requirements

Review domain sources, API/security/RBAC/OpenAPI conventions, and metric definitions. Run `git diff --check` and changed-file review.

## 19. Completion Evidence

Approved metric definitions mapped to real sources and an implementation task, or explicit decision to keep dashboard informational only.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

- Human approval is required for the proposed contract decisions in sections 9 and 11–12 before implementation.

## 22. Definition Of Done

Metric requirements are approved or dashboard is explicitly informational-only; no fabricated data or endpoint exists.
