# be/43-audit-trail-page-pagination

## 1. Metadata

| Field           | Value                                              |
| --------------- | -------------------------------------------------- |
| Task ID         | `be/43-audit-trail-page-pagination`                |
| Batch           | N/A                                                |
| Owning Feature  | Audit Trail                                        |
| Workstream      | API and CMS consumer                               |
| Task Category   | Pagination contract change                         |
| Repository/App  | `apps/api`, `apps/cms`                             |
| Status          | Approved by current user request and clarification |
| Priority        | Normal                                             |
| Suggested Size  | Small                                              |
| Depends On      | `be/41-audit-trail`, existing CMS Audit Trail      |
| Blocks          | N/A                                                |
| Execution Order | After existing Audit Trail implementation          |

## 2. Outcome

Audit list requests use one-based `page` pagination. The list response contains `pagination: { page, limit, total, totalPages }`, and the CMS navigates with that response.

## 3. Context

- Current human instruction and clarification explicitly replace Audit Trail cursor pagination with `page`, starting at 1, and specify the four response fields.
- `tasks/be/41-audit-trail/references/approved-requirements.md` defines audit visibility, filters, ordering, and export. Its cursor rule conflicts with the current human instruction; authority winner: current human instruction. Its older default limit of 20 also conflicts with the user's prior explicit default of 10; authority winner: current human instruction.
- `tasks/fe/43-audit-trail-ui-refinement/technical.md` excluded API pagination changes. This new scoped task owns the contract change without rewriting that existing task.
- `docs/API.md` specifies camelCase JSON; existing category, role, and user lists use the requested pagination response shape.

## 4. Dependencies

Existing Audit Trail list API, CMS client, and list view. No new infrastructure or external system.

## 5. In Scope

- Replace list query `cursor` with one-based `page`, defaulting to 1; preserve `limit` options 10/20/50/100 and default 10.
- Return filtered `total`, `totalPages = ceil(total / limit)` (zero when total is zero), requested `page`, and `limit`.
- Retain `(createdAt DESC, id DESC)` ordering and the approved visible event/filter scope.
- Update CMS typing, client validation, previous/next navigation, count display, OpenAPI, and focused coverage.

## 6. Out of Scope

Audit detail, CSV export behavior, filter semantics, permission policy, retention, schema/migrations, new page-number controls, and unrelated list APIs.

## 7. Existing Implementation

- `apps/api/src/modules/audit/services/audit-read.service.ts` owns list input and response; `apps/api/src/modules/audit/repositories/audit-read.repository.ts` owns queries; `apps/api/src/modules/audit/v1/audit.openapi.yaml` owns route documentation.
- `apps/cms/src/api/types.ts`, `apps/cms/src/api/client.ts`, and `apps/cms/src/views/AuditTrailView.vue` consume list pagination.
- `apps/api/tests/audit-read.test.ts`, `apps/api/tests/openapi.test.ts`, `apps/cms/tests/audit-page.test.ts`, and `apps/cms/tests/api-client.test.ts` contain current contract assertions.

## 8. Implementation Requirements

1. Reject invalid/non-integer/zero/negative `page` values with existing safe `400` handling. Reject `cursor` as an unknown list query field.
2. Count only events satisfying the same visibility, date, search, and exact-filter conditions as returned rows. Never count `auth_audit_events` or hidden catalog events.
3. Apply deterministic ordering before offset and bound each list result by the selected limit. An out-of-range page returns empty items with the requested page and actual totals.
4. Keep CSV export's bounded selection independent of list page and count. Keep detail and permission behavior intact.
5. Reset the CMS to page 1 after applying/clearing filters or changing page size; previous/next use response `page` and `totalPages`.

## 9. Applicable Contracts

**Configuration Contract:** Not applicable — no configuration change.

**API Contract:** `GET /api/v1/audit-events` requires `audit.read`. Query adds optional `page` (integer ≥1, default 1), keeps optional `limit` (10/20/50/100, default 10), removes `cursor`, and returns `{ items, pagination: { page, limit, total, totalPages } }`. Existing approved filters, 400 validation, 401/403 access, and server-error handling remain.

**Database Contract:** No schema change. Filtered count and bounded offset query read `audit_events` only.

**UI Contract:** `/audit-trail` retains current layout and page-size selector. The footer shows a truthful item range and total; Previous is disabled on page 1, Next on the last page. Empty/error/denied states remain.

## 10. File Impact

**Expected Create:** This task's `technical.md` and `explanation.md` only.

**Expected Modify:** Audit service, audit repository, audit OpenAPI, CMS audit types/list view, and relevant existing tests. `apps/cms/src/api/client.ts` only if its query handling requires a change.

**Expected Not Modified:** Database schema/migrations, audit writer, auth/RBAC, CSV format, other modules. Expected paths are guidance; inspect repository before finalizing changes. Backend changes remain inside the existing audit module; no new `apps/api/src` root is created.

## 11. Runtime Behavior

Validate the list query, normalize date/filters/page/limit, count matching visible events, fetch the requested ordered page, and return items plus the four pagination fields. CMS requests page 1 initially and on filter/size reset, then requests adjacent pages as available. Invalid query stops at 400 before repository access.

## 12. Error And Edge Cases

| Scenario                       | Expected Result                            | Security / Recovery             |
| ------------------------------ | ------------------------------------------ | ------------------------------- |
| Invalid `page` or old `cursor` | Safe 400                                   | No SQL detail                   |
| No matching events             | Empty items, total 0, totalPages 0         | Honest empty state              |
| Page beyond end                | Empty items, requested page, actual totals | User may return to earlier page |
| DB failure                     | Existing safe 500 path                     | Retry available in CMS          |

## 13. Security Requirements

Preserve `audit.read` enforcement, bounded page size, visible catalog restriction, redacted projections, and safe validation errors. Count query uses the same allowlisted predicates as row query.

## 14. Test Requirements

Happy Path: response shape, first and later pages, filtered totals. Validation: bad page and cursor rejected. Negative / Failure: empty and out-of-range pages. Security: hidden events excluded from count and rows. Regression: ordering, filters, detail/export, permission. Isolation: deterministic fixtures and query results.

## 15. Task-Level Expected Results

API and CMS share one page pagination contract; OpenAPI matches; cursor navigation is removed; default page size stays 10.

## 16. Acceptance Criteria

- [ ] `GET /api/v1/audit-events` accepts page 1 by default and returns exactly `page`, `limit`, `total`, `totalPages` in `pagination`.
- [ ] Filtered totals and deterministic page rows agree, including empty and out-of-range pages.
- [ ] Invalid page/cursor query returns safe 400.
- [ ] CMS Previous/Next and filter/page-size resets use page numbers and truthful totals.
- [ ] Detail, export, permissions, and page-size options remain intact; OpenAPI matches API.

## 17. Anti-Slop Requirements

Code Anti-Slop: no duplicate predicates, speculative abstraction, dead cursor code, unjustified casts, hidden TODOs, or unrelated dependencies. UI Anti-Slop: preserve existing visual system, responsive footer, labels, focus, disabled states, and honest result counts. Browser verification is required for the changed pagination interaction when capability exists.

## 18. Validation Requirements

Static: API/CMS lint, typecheck, formatting, `git diff --check`. Automated Tests: focused audit API/CMS and OpenAPI checks. Build: CMS build. Database: no migration; query evidence through focused validation. UI: desktop/mobile and pagination interaction in browser. Anti-Slop: code and UI audits.

## 19. Completion Evidence

AC1–3 → API test output and OpenAPI diff. AC4 → CMS test output and browser inspection. AC5 → focused regression evidence, source diff, static/build output. All criteria → Anti-Slop results and `git diff --check`.

## 20. Traceability

| Trace Type          | References                                                                         |
| ------------------- | ---------------------------------------------------------------------------------- |
| PRD                 | N/A                                                                                |
| Feature             | Audit Trail                                                                        |
| Requirement         | Current human pagination instruction; `QUERY-001` except superseded cursor/default |
| Acceptance Criteria | This document AC1–5                                                                |
| API Operation       | `GET /api/v1/audit-events`                                                         |
| Database            | Existing `audit_events`                                                            |
| Test IDs            | Existing audit API/CMS/OpenAPI suites                                              |
| Design/Figma        | Existing Audit Trail UI and CMS design system                                      |

## 21. Open Points

None. The current human clarification resolves the cursor versus page decision.

## 22. Definition Of Done

- [ ] Acceptance criteria and scope met; implementation and focused regression evidence reviewed.
- [ ] Code and UI Anti-Slop pass; lint, typecheck, applicable tests/build/browser verification pass.
- [ ] `git diff --check`, changed-file review, secret review, and no unrelated changes confirmed.
