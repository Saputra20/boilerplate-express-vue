# fe/43-audit-trail-ui-refinement — Audit Trail UI Refinement

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `fe/43-audit-trail-ui-refinement` |
| Batch | N/A |
| Owning Feature | Audit Trail |
| Workstream | Frontend |
| Task Category | UI visual refinement |
| Repository/App | `apps/cms` |
| Status | Ready — implementation contract defined |
| Priority | Normal |
| Suggested Size | Small — list/detail hierarchy, copy, filter presentation, and responsive polish |
| Depends On | `be/41-audit-trail` approved requirements and implemented read/export API; `fe/12-frontend-quality-gate`; `fe/13-tailadmin-ui-foundation` |
| Blocks | None |
| Execution Order | 43 |

## 2. Outcome

The existing read-only Audit Trail list and detail pages present approved event information with clear hierarchy, concise user-facing copy, coherent filter/result density, and responsive layouts. The UI keeps every approved filter and operation, renders real API states without filler, and follows the existing CMS visual system.

## 3. Context

- The human request and attached screenshot identify the current Audit Trail page as the visual reference and request a FE task to make it feel less generic/AI-generated. The screenshot is evidence of the current composition, not a product specification.
- `tasks/be/41-audit-trail/references/approved-requirements.md` is the task-specific approved feature contract. It defines visible event scope, list/detail projections, filters, pagination, export permission, legacy states, read-only behavior, and WIB timestamps.
- `apps/cms/src/views/AuditTrailView.vue` and `AuditEventDetailView.vue` are the current implementation truth for list and detail presentation. `apps/cms/tests/audit-page.test.ts` covers existing interactions and states.
- The current list page repeats the page-level Audit Trail title with “Read-only history,” describes implementation storage (“generic audit history”), places all filters in a large undifferentiated panel, and renders a wide table. Refine the actual copy and visual hierarchy without fabricating counts or event details.
- `docs/DESIGN.md`, `tasks/fe/13-tailadmin-ui-foundation/technical.md`, and `tasks/fe/18-tailadmin-visual-rework/technical.md` define the existing CMS visual language and UI quality constraints.
- Documentation consistency finding: `tasks/be/41-audit-trail/technical.md` and `references/current-state-and-gaps.md` say the read API and CMS UI are absent, but current source contains the audit API module, CMS routes/client/views, and tests. `CONFLICT` — implementation-presence claim is stale; authority winner: current source and tests. Safe continuation: treat source as implementation truth and the approved-requirements artifact as behavior authority; compare the running contract before changing UI.
- Pagination clarification: the human confirms the requested default is `10`. Current FE, API validation, and OpenAPI support page sizes `10, 20, 50, 100`, with API/OpenAPI default `10`. `CONFLICT` — `QUERY-001` in `tasks/be/41-audit-trail/references/approved-requirements.md` says default 20 and only 20/50/100; authority winner for this task: current explicit human clarification, corroborated by active source/configuration. Safe continuation: preserve the existing allowed size set and default 10; do not change cursor semantics or API behavior.

## 4. Dependencies

- `be/41-audit-trail` provides the approved UI/API behavior contract. Before implementation, verify the current backend route, response, and permission behavior against it; this task does not repair backend gaps.
- `fe/12-frontend-quality-gate` supplies frontend quality and validation conventions.
- `fe/13-tailadmin-ui-foundation` supplies shared CMS primitives and visual conventions.
- Existing audit list/detail API client methods and router entries must remain available. If source inspection finds the approved API is absent or materially incompatible, stop and identify the backend dependency rather than inventing a frontend fallback.

## 5. In Scope

- Refine the visual hierarchy and concise English copy of `/audit-trail` and `/audit-trail/:id` within the current CMS design system.
- Give the list page one clear primary heading; remove implementation-facing descriptions such as “generic audit history”; retain only short explanatory copy that helps users understand scope or time display.
- Make the filter area easier to scan by grouping related controls and visually distinguishing primary search/date controls from exact actor/resource/action/outcome filters. Keep all approved filters discoverable and usable; do not remove or silently change their semantics.
- Give the event results clear visual priority, improve table readability and density at supported widths, and keep event labels more prominent than machine event codes.
- Refine detail page hierarchy so event label, actor, target, timestamp, outcome, changes, and export summary are easy to scan while preserving approved projection and legacy-state behavior.
- Preserve permission-gated CSV export and provide coherent loading, exporting, error, denied, empty, and content states.
- Preserve the currently supported page-size options `10, 20, 50, 100` and use the human-confirmed default of 10.
- Verify desktop and mobile layouts, keyboard use, focus visibility, labels, contrast, and text overflow.
- Add/update focused CMS tests for changed controls, copy, states, and responsive affordances where behavior can be asserted.

## 6. Out of Scope

- Backend/API, OpenAPI, RBAC, permission catalog, database, event taxonomy, audit retention, logging, or export behavior changes.
- New routes, actions, filters, columns, sort behavior, event types, permissions, or user-facing product policy.
- Changes to filter interpretation, cursor pagination, query bounds, data projection, timestamp source, or CSV contents.
- Hiding approved filters behind inaccessible controls or removing filters to make the screen appear simpler.
- Fabricated event rows, total counts, summary metrics, activity charts, decorative statistics, sample content, or claims that audit history is complete/tamper-proof.
- New dependencies, replacement of shared CMS primitives, broad design-system changes, or opportunistic redesign of unrelated CMS pages.
- Changes to authorization behavior; CMS permission checks remain UX-only and backend RBAC remains authoritative.

## 7. Existing Implementation

- `apps/cms/src/views/AuditTrailView.vue`: filters, export, event list, cursor navigation, list states, and timestamp formatting.
- `apps/cms/src/views/AuditEventDetailView.vue`: approved event detail, change snapshot, export summary, and detail states.
- `apps/cms/src/components/CmsPageHeader.vue` and `apps/cms/src/components/ui/`: page header and shared CMS primitives; reuse existing components when suitable.
- `apps/cms/src/api/types.ts` and `apps/cms/src/api/client.ts`: audit event types, labels, and API client contract.
- `apps/cms/src/router/index.ts` and `apps/cms/src/navigation.ts`: existing audit routes and permission-filtered navigation; do not change route/permission semantics.
- `apps/cms/tests/audit-page.test.ts`: current audit list/detail behavior coverage.
- `docs/DESIGN.md`, `tasks/fe/12-frontend-quality-gate/technical.md`, `tasks/fe/13-tailadmin-ui-foundation/technical.md`, and `tasks/fe/18-tailadmin-visual-rework/technical.md`: design and quality references.
- `tasks/be/41-audit-trail/references/approved-requirements.md`: authoritative Audit Trail contract.

## 8. Implementation Requirements

1. Use the approved event labels and fields already returned by the API. Do not derive historical facts from current category, role, or user records.
2. Keep one primary page heading and remove technical/storage wording from user-facing copy. Copy should explain the visible history and WIB display only when that explanation is useful; use the approved scope without claiming full or tamper-proof history.
3. Preserve all approved filters: date range, exact actor ID, exact action, resource type, resource ID, outcome, and actor/target search. Group their layout to clarify related inputs; keep labels, values, and submit/reset behavior clear.
4. Preserve approved filter meaning and API query mapping. Exact actor ID remains distinct from actor/target text search. Date inputs retain UTC-boundary behavior, and human-readable event times remain explicitly `WIB (UTC+07:00)`.
5. Preserve page-size options `10`, `20`, `50`, and `100`, and default to `10` per the human clarification and active API/OpenAPI source. Retain existing opaque cursor navigation and reset-to-first-page behavior when filters or page size change.
6. Keep event labels as the primary action text and machine `eventType` as secondary technical context. Keep actor, stable target identity, outcome, and occurrence time visible without exposing fields omitted by the approved projection.
7. Do not add visual material to compensate for a small result set. Empty/loading/error/denied states remain truthful and contextual; a single real event must remain legible without fake rows or artificial totals.
8. Preserve the details link and read-only behavior. Detail must continue to show approved actor/resource identity, request ID, allowlisted changes, export summary, and the approved `Actor unavailable` / `Change details unavailable` legacy states.
9. Keep CSV export visible only when the current auth state has both `audit.read` and `audit.export`. Preserve existing API call and safe error handling.
10. Reuse current CMS tokens and primitives. Introduce no decorative elements, duplicate primitive, or new package solely to create visual novelty.
11. Ensure filters, table/list, pagination, and detail content reflow at mobile widths without page-level horizontal overflow. Intentional bounded overflow is permitted only for tabular content when necessary and must remain usable.
12. Preserve semantic headings, labelled controls, keyboard operation, visible focus, accessible feedback, and status/error announcements.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no new environment value or configuration is approved.

### API Contract

No API change. Preserve approved operations and permissions:

- `GET /api/v1/audit-events` and `GET /api/v1/audit-events/:id` require authenticated `audit.read`.
- `GET /api/v1/audit-events/export` requires both `audit.read` and `audit.export`.
- Preserve approved projections, filters, UTC request boundaries, cursor pagination, and export redaction from `tasks/be/41-audit-trail/references/approved-requirements.md`.

### Database Contract

Not applicable — no schema or migration changes.

### UI Contract

| Surface | Required result |
| --- | --- |
| List heading/copy | One primary heading; concise user-facing explanation; no internal storage implementation wording or completeness claim |
| Filters | All approved filters remain available, clearly grouped and labelled, with existing apply/reset semantics |
| Event results | Real event label leads; actor, target, outcome, and WIB timestamp remain readable; no fake counts or filler |
| Pagination | 10/20/50/100, default 10; existing cursor behavior |
| Detail | Approved event facts and change/export context scan clearly; legacy states remain truthful |
| Export | Existing permission gate and safe states remain intact |
| Responsive/accessibility | Desktop/mobile reflow, no page overflow, semantic labels, keyboard/focus, readable contrast |

## 10. File Impact

**Expected Create**

- None expected.

**Expected Modify**

- `apps/cms/src/views/AuditTrailView.vue`.
- `apps/cms/src/views/AuditEventDetailView.vue` only if shared visual/copy consistency requires a focused update.
- `apps/cms/tests/audit-page.test.ts` or a focused neighboring test if existing coverage cannot express the changed behavior.

**Expected Not Modified**

- `apps/api/**`, migrations, OpenAPI contracts, API permissions, `apps/cms/src/router/index.ts`, navigation permission rules, API data contracts, unrelated views, design tokens, package manifests, and lockfiles.

Expected paths are guidance; agent must inspect repository before finalizing changes.

## 11. Runtime Behavior

1. The existing route guard and backend remain responsible for access control. The list page requests the first cursor page using the selected filters and approved page size.
2. The UI presents the response in a clear results area. Applying/resetting filters and changing page size resets cursor history and loads the first page; next/previous actions preserve current filter state.
3. Search text is sent through the existing bounded `q` contract; exact actor ID remains a separate filter. No UI-only filtering may imply results the API did not return.
4. Export sends the current approved filter values only when both permissions are present; safe export failures remain visible.
5. Selecting an event opens the existing detail route and renders only the API projection. Legacy missing snapshots retain their approved unavailable messages.
6. Loading, empty, denied, unavailable, and error states remain distinct and contain no fabricated audit data.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| One or few events returned | Results remain readable without filler or fake totals | Show only API-provided events |
| No events match filters | Existing contextual empty state remains, with wording aligned to filters | Do not imply no history exists beyond the current query |
| Legacy actor/change snapshot unavailable | Show approved unavailable state | Do not query live source records to fill historical gaps |
| User lacks `audit.read` | Existing denied route/state remains | Backend remains authorization authority |
| User lacks `audit.export` | Export control is absent; list/detail still depend on `audit.read` | UI guard is not a security boundary |
| API/network failure | Existing safe error/unavailable state and retry behavior remain | Do not render raw server internals |
| Narrow viewport or long IDs | Controls/content reflow; long values wrap or use bounded overflow | No page-level horizontal overflow or inaccessible control |
| Unsupported page size requested by stale state | Do not send unsupported values | Only 10/20/50/100 are selectable; default is 10 |

## 13. Security Requirements

- Preserve the approved API projection; do not expose raw metadata, session ID, IP address, user agent, reason code, hidden event types, or credentials.
- Do not query live source records to enrich actor/target history.
- Preserve `audit.read` and `audit.export` UX gating without treating frontend state as authorization.
- Do not log or display raw API errors, credentials, tokens, or sensitive metadata.

## 14. Test Requirements

### Happy Path

- List presents event label, actor, target, outcome, and WIB timestamp using existing API data.
- Detail presents approved fields and changes/export summary.
- Filter apply/reset, cursor navigation, page-size change, and permitted export continue to call existing API methods with approved query values.

### Validation

- Page-size control exposes 10, 20, 50, and 100 and defaults to 10.
- Existing filter values map to their corresponding query fields; actor ID and free-text search stay distinct.

### Negative / Failure

- Empty, unavailable, error, denied, missing legacy snapshot, and export failure states remain accurate and safe.
- No fake event, count, metric, or detail appears when API data is empty or limited.

### Security

- Existing route/API permission checks remain intact.
- Tests confirm no raw metadata or omitted sensitive fields are rendered.

### Regression

- Existing audit page tests, CMS lint/typecheck/build, and applicable CMS tests pass.
- Route names, permissions, query semantics, cursor behavior, and CSV operation remain unchanged.

### Isolation

- Tests use deterministic fixtures and mocks; they do not rely on test order, live audit data, or a real export/download service.

## 15. Task-Level Expected Results

- List and detail pages have clearer hierarchy and user-facing copy aligned with the approved Audit Trail contract.
- Filters remain complete and their groupings make exact identifiers distinct from text search.
- The results remain legible for sparse and dense real data without filler.
- The pagination selector matches approved page sizes and default.
- Responsive, accessibility, state, and behavior evidence covers changed UI.

## 16. Acceptance Criteria

- [ ] The list page has one clear primary heading and no user-facing description of generic audit storage implementation.
- [ ] Approved filters are all present, clearly labelled/grouped, and preserve their existing query semantics.
- [ ] Exact Actor ID and actor/target search are visually and semantically distinct.
- [ ] Real event labels lead the result row; machine event type remains secondary context.
- [ ] Sparse results remain intentional and contain no invented count, chart, card, or filler row.
- [ ] Detail page presents approved facts, changes, export summary, and legacy unavailable states clearly.
- [ ] Pagination offers 10, 20, 50, and 100 and defaults to 10; cursor behavior remains unchanged.
- [ ] Permission-gated export and loading/empty/error/denied states remain correct.
- [ ] Desktop and mobile layouts are inspected; no page-level horizontal overflow is present.
- [ ] Labels, keyboard access, focus visibility, contrast, and feedback announcements pass applicable UI audit.
- [ ] Focused tests, CMS lint, typecheck, applicable tests, and build pass.
- [ ] Code Anti-Slop and UI Anti-Slop pass after any fixes.
- [ ] No API, backend, permission, dependency, or unrelated UI scope is changed.

## 17. Anti-Slop Requirements

- **Code Anti-Slop:** required. Check unnecessary abstractions, duplicated UI, dead/unused styles, hidden TODO/FIXME/HACK, fake behavior, unjustified assertions/`any`, excessive comments, and unrelated files/dependencies.
- **UI Anti-Slop:** required. Inspect source and rendered list/detail for generic admin composition, repeated headings, undifferentiated filter density, excessive cards/badges/decoration, inconsistent hierarchy, fake content, low-information empty space, and missing responsive behavior.
- **Copy review:** required for user-facing text. Remove implementation notes and generic filler; keep wording precise, concise, and consistent with approved scope and WIB/UTC meaning.
- **Accessibility/human audit:** required. Check semantic order, labels, keyboard use, focus visibility, contrast, error association, and status announcements.
- **Responsive audit:** required. Check narrow/desktop reflow, long identifiers, control reachability, and horizontal overflow.
- **Visual verification:** required. Inspect the rendered list and detail pages at desktop and mobile with populated, empty, and error/denied states where the browser environment permits. Source tests are not visual evidence.

## 18. Validation Requirements

### Static

- `bun run --cwd apps/cms format:check`
- `bun run --cwd apps/cms lint`
- `bun run --cwd apps/cms typecheck`
- `git diff --check`

### Automated Tests

- Focused audit page tests.
- `bun run --cwd apps/cms test`

### Build

- `bun run --cwd apps/cms build`

### Database/API

Not applicable — task makes no API, OpenAPI, backend, or database changes. Reconfirm the existing approved API contract before implementation.

### UI

- Browser inspection of list and detail at desktop and mobile widths, including representative populated, empty, and failure/denied states.
- Verify filters, pagination, event links, and permitted export remain usable.

### Anti-Slop

- Run Code Anti-Slop, UI Anti-Slop, copy review, accessibility audit, responsive audit, and browser verification after implementation and again after relevant fixes.

## 19. Completion Evidence

| Acceptance area | Required evidence |
| --- | --- |
| Heading/copy and visual hierarchy | Before/after browser inspection or screenshots plus copy review notes |
| Filter completeness and mapping | Focused test assertions for all retained filters, distinct actor ID/search, apply/reset |
| Pagination contract | Test showing default 10 and selectable 10/20/50/100; cursor regression assertions |
| List/detail states and data minimization | Focused test output for real, empty, legacy, error, denied, and export contexts |
| Responsive/accessibility | Browser inspection notes with viewport dimensions and UI audit findings |
| Quality | CMS format, lint, typecheck, tests, build, Code/UI Anti-Slop, and `git diff --check` output |
| Scope | Final `git status --short`, changed-file review, and secret/unrelated-change review |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| PRD | `docs/PRD.md` remains unresolved; it does not add requirements for this task |
| Feature | `tasks/be/41-audit-trail/technical.md` |
| Requirement | `tasks/be/41-audit-trail/references/approved-requirements.md`: `SCOPE-001`, `READ-001`, `QUERY-001`, `EXPORT-001`, `TIME-001`, `LEGACY-001`, `ACCESS-001`, `ACCESS-002` |
| Acceptance Criteria | This task, section 16 |
| API Operation | `GET /api/v1/audit-events`, `GET /api/v1/audit-events/:id`, `GET /api/v1/audit-events/export` |
| Database | Not applicable — read-only UI refinement |
| Test IDs | Existing `apps/cms/tests/audit-page.test.ts`; add focused cases as needed |
| Design/Figma | Attached screenshot in the human request is current-state reference only; existing CMS design system remains the design authority |

## 21. Open Points

- Browser availability and the mechanism for capturing rendered evidence must be confirmed during implementation. If unavailable, report visual verification `NOT RUN` and do not claim completion under the project UI gate.
- `QUERY-001` in the approved requirements artifact conflicts with the human-confirmed default 10 and current API/OpenAPI, which support 10/20/50/100 with default 10. This task follows the current human clarification and existing API behavior. Updating the upstream approval artifact is outside this FE task and remains a documentation follow-up.
- No new event labels, fields, data summaries, or filter behavior are open for frontend interpretation; follow the approved requirements artifact.

## 22. Definition Of Done

- [ ] Approved scope and all acceptance criteria are satisfied.
- [ ] List/detail presentation and copy are updated without changing the Audit Trail product/API contract.
- [ ] Tests, lint, typecheck, and build pass.
- [ ] Code Anti-Slop, UI Anti-Slop, copy, accessibility, responsive, and visual verification gates pass.
- [ ] Browser evidence records viewports, states, and observed results.
- [ ] `git diff --check` passes.
- [ ] Changed files, secrets, and scope are reviewed; no unrelated changes remain.
