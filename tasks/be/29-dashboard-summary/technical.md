# be/29-dashboard-summary — Dashboard Summary Contract

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/29-dashboard-summary` |
| Batch | N/A |
| Owning Feature | CMS dashboard summary |
| Workstream | Backend |
| Task Category | API contract planning |
| Repository/App | `apps/api` |
| Status | Optional — blocked pending metric approval |
| Priority | N/A |
| Suggested Size | Small/Medium |
| Depends On | Domain-owning modules and `be/23-versioned-openapi-swagger` |
| Blocks | `fe/17-dashboard-summary` |
| Execution Order | 29 |

## 2. Outcome

Decide whether the CMS needs a dashboard summary API and define only metrics backed by real domain data. No metric endpoint is created by this task.

## 3. Context

The TailAdmin visual shell may render an intentional empty/informational state without metrics. Existing repository contracts do not approve user, role, category, activity, or chart metrics.

## 4. Dependencies

Actual domain data owners, approved retention/aggregation semantics, API versioning, RBAC, and OpenAPI conventions.

## 5. In Scope

- Decide whether real dashboard metrics are needed.
- For each approved metric, define source, meaning, time window, freshness, authorization, response, and failure behavior.
- Decide whether one summary endpoint or domain endpoints own the data.

## 6. Out of Scope

Fake metrics, demo charts, guessed counts, analytics infrastructure, event tracking, caching, database changes, and frontend dashboard implementation.

## 7. Existing Implementation

Inspect domain schemas/modules, API conventions, RBAC, OpenAPI, and CMS home. No approved dashboard metric source currently exists.

## 8. Implementation Requirements

Do not publish a metric unless its source and definition are approved. Preserve backend authorization and safe empty/error behavior.

## 9. Applicable Contracts

**API Contract:** Not applicable until metric approval. Candidate path, method, response, and permissions require approval.

**Database Contract:** No schema change approved.

## 10. File Impact

Expected Create/Modify: this planning contract only. Expected Not Modified: application source, database, packages, lockfiles, and CMS source.

## 11. Runtime Behavior

No runtime behavior until a metric contract is approved. CMS foundation uses empty/informational state meanwhile.

## 12. Error And Edge Cases

Approval must define unavailable source, stale data, empty data, unauthorized access, time boundaries, and partial metric failure.

## 13. Security Requirements

Metrics must not leak unauthorized aggregate data or sensitive user information. Backend authorization remains authoritative.

## 14. Test Requirements

After approval: metric calculation/source tests, authorization, empty/stale/error behavior, response schema, OpenAPI, and regression tests.

## 15. Task-Level Expected Results

Dashboard visual work can proceed with an honest empty state; real statistics remain separate and evidence-based.

## 16. Acceptance Criteria

- [ ] Need for real metrics approved.
- [ ] Every metric has a real source and definition.
- [ ] Route, response, authorization, freshness, and failure semantics approved.
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

- TODO: REQUIREMENT NEEDED — whether metrics are required now.
- TODO: REQUIREMENT NEEDED — metric list, source, meaning, and time windows.
- TODO: REQUIREMENT NEEDED — route, response, permission, freshness, and failure policy.

## 22. Definition Of Done

Metric requirements are approved or dashboard is explicitly informational-only; no fabricated data or endpoint exists.
