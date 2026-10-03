# be/41-audit-trail: Audit Trail Read and Policy Successor

## 1. Metadata

| Field           | Value                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID         | `be/41-audit-trail`                                                                                                                       |
| Batch           | Audit Trail successor                                                                                                                     |
| Owning Feature  | Audit Trail                                                                                                                               |
| Workstream      | Cross-functional: BA, Backend, Frontend, QA, Reviewer                                                                                     |
| Task Category   | Product/security contract and successor delivery plan                                                                                     |
| Repository/App  | `apps/api`, `apps/cms`                                                                                                                    |
| Status          | READY: Saputra's named approval is recorded in `references/approved-requirements.md`; implementation remains pending                      |
| Priority        | After completed generic audit foundation and current authenticated CMS foundations                                                        |
| Suggested Size  | Epic; execute as small ordered child tasks in section 8.9, not one implementation diff                                                    |
| Depends On      | Completed `be/14-audit-trail`; current auth/RBAC, versioned OpenAPI, module architecture, BullMQ, role/user/category, and CMS foundations |
| Blocks          | Audit read API, audit history UI, retention automation, and complete event coverage                                                       |
| Execution Order | 41; child order in section 8.9                                                                                                            |

## 2. Outcome

Produce an approved, repository-grounded Audit Trail feature contract, then deliver it through separate reviewable child tasks. Existing generic append-only `audit_events` remains the persistence/writer foundation. Successor work adds only approved event coverage, authorization, read-only query/detail behavior, retention operations, and CMS history UI.

Named human approval for retention, access, event catalog, metadata visibility, export, and write-failure policy is recorded in `references/approved-requirements.md`. That artifact is the exact phase 1 product/security contract and supersedes unresolved approval placeholders in this planning document.

## 3. Context

- `tasks/be/14-audit-trail` is COMPLETE. It created generic `audit_events`, validated append boundaries, required transactional writes, informational best-effort writes, and deterministic unscheduled 90-day cleanup.
- `auth_audit_events` is separate and remains used by login, refresh, and logout flows. This successor must not claim either audit foundation is absent or silently merge them.
- Generic events are already emitted by category, role, user, self-profile, password, email verification, and password recovery paths. Coverage must be inventoried against approved business requirements rather than replaced with a speculative global catalog.
- `docs/DATABASE.md` and `docs/SECURITY.md` define audit history as durable, append-only, bounded, secret-free data. Public audit reads require an approved RBAC contract.
- `docs/PRD.md`, `docs/PRODUCT.md`, and `docs/DOMAIN.md` still contain `TODO: REQUIREMENT NEEDED`; they do not authorize viewer roles, export, retention/compliance, tenant semantics, event scope, or UI behavior.
- Current source has no audit read API, audit OpenAPI contract, `audit.read` permission, CMS audit route, or audit view.
- Repository has no approved tenant/domain ownership model. Tenant columns, selectors, isolation claims, and cross-tenant behavior are forbidden unless separately approved.

Current-state evidence and gaps are recorded in `references/current-state-and-gaps.md`.

## 4. Dependencies

- Completed generic audit foundation: `be/14-audit-trail` and migration `0011_create-audit-events-table`.
- Existing auth-specific audit history from login/session, refresh, and logout tasks.
- Existing authenticated principal, backend permission middleware, permission catalog/seeding, versioned OpenAPI aggregation, and CMS permission guards.
- Existing BullMQ foundation is available for the approved scheduled retention child. It does not authorize retry/outbox work or other queues.
- BA approval is complete in `references/approved-requirements.md`, with Saputra's identity/role, approval date, stable decision IDs, and exact phase 1 values.
- Backend API contract must be implemented and verified before frontend implementation.
- Reviewer approval must precede final QA.

Any behavior outside the approved artifact remains a blocker, not implementation scope.

## 5. In Scope

Planning scope:

- Reconcile current `audit_events`, `auth_audit_events`, audit emitters, tests, permissions, OpenAPI, and CMS navigation with requested Audit Trail behavior.
- Define explicit human approval gates and durable approved-requirements artifact.
- Define actor, action, resource, occurrence timestamp, outcome, request/session context, and bounded change-metadata requirements.
- Define append-only/read-only behavior at application API/UI boundaries.
- Define event taxonomy and coverage from actual repository workflows.
- Define approved global read authorization, data minimization, filters, deterministic pagination, dedicated detail, and CSV export.
- Define approved one-year permanent purge plus explicit no-archive/no-legal-hold phase 1 boundary and operational ownership.
- Define best-effort failure behavior for approved CMS mutation/export events while preserving existing auth emitter behavior.
- Define backend, frontend, reviewer, and QA child work with dependency order.

Implementation scope after approval, split across child tasks:

- Minimal extensions to existing audit module and database only when approved contract cannot be met by current fields/indexes.
- Server-authorized read-only API and module-local OpenAPI.
- Approved event emitter corrections or additions in owning modules.
- Approved retention execution and operational evidence.
- Read-only CMS audit list/detail experience using backend data only.
- Focused automated, migration where applicable, browser, accessibility, security, and regression verification.

## 6. Out of Scope

- Rebuilding or duplicating completed generic audit storage/writer foundation.
- Replacing, migrating, merging, renaming, or deleting `auth_audit_events` without a separate approved migration/data contract.
- Generic client-submitted audit writes, audit update APIs, per-row delete APIs, or UI mutation controls.
- Invented tenant model, organization IDs, row-level ownership, impersonation model, service-account model, compliance certification, or legal-hold semantics.
- SIEM, data warehouse, WORM storage, cryptographic chaining/signing, anomaly detection, and external log shipping unless separately approved.
- Fabricated event labels, viewer roles, performance budgets, retention durations, archive destinations, or exports.
- Broad refactoring of auth, RBAC, business modules, logging, queue infrastructure, or CMS navigation.
- Backfilling historical actions that were never captured unless a separately approved, technically valid source and migration policy exists.

## 7. Existing Implementation

Verified current implementation:

- `apps/api/src/config/drizzle/schema/audit-events.schema.ts`: generic event ID, event type, nullable actor user ID, actor type, resource type/ID, outcome, reason, request/session IDs, IP, user agent, JSONB metadata, and database-generated `createdAt`; actor/session deletion uses `ON DELETE SET NULL`; indexes cover creation time, event type, actor, and resource pair.
- `apps/api/src/modules/audit/services/audit.service.ts`: validates event names, actor rules, identifiers, reason codes, IP/user agent bounds, JSON serializability, forbidden nested metadata keys, and 8 KiB metadata size; exposes required, informational, and 90-day cleanup operations.
- `apps/api/src/modules/audit/repositories/audit.repository.ts`: insert and age-based cleanup only. No read repository and no row mutation method exist.
- `apps/api/src/config/drizzle/schema/auth-audit-events.schema.ts`: separate constrained auth event store for login, refresh, reuse/revocation, and logout vocabulary.
- `apps/api/tests/audit-trail.test.ts` and integration suites cover validation, fail-closed owner transactions, best-effort logging, cleanup boundary, and several concrete emitters.
- Generic required writes are present in category, role, user, profile, password, verification, and recovery paths. Exact event coverage requires an inventory against approved requirements.
- No source file under `apps/cms/src` contains an Audit Trail feature.
- No audit list/detail/export route or OpenAPI contribution exists.

Expected paths are guidance. Each child must re-inspect current source before editing.

## 8. Implementation Requirements

### 8.1 Approval and traceability

1. BA records each policy decision in `references/approved-requirements.md`. Every row needs stable decision ID, approved value, approver name/role, and approval date.
2. Approved event catalog maps each actual trigger to stable event type, actor source, resource type/ID, outcome, allowed metadata keys, criticality, write-failure behavior, authorized viewers, retention class, and source owner.
3. Backend, frontend, reviewer, and QA work traces code/tests to those IDs. Unknown decisions block work; no worker may pick defaults for product, security, compliance, destructive data, or public API behavior.

### 8.2 Audit record semantics

1. Preserve stable immutable event ID and database UTC timestamp as source of truth. Browser input never supplies trusted occurrence time, actor, action, outcome, or target.
2. Use approved `eventType` values as controlled machine actions and the labels in `CATALOG-001`/`CATALOG-002` for presentation.
3. New CMS rows store `actorType` plus event-time actor ID, nullable display name, and email. System actors store no user identity. Legacy rows are not backfilled. Tenant, impersonator/effective-user, service-account, and bulk-actor fields remain out of scope.
4. Use `resourceType` and stable `resourceId` for target identity. Deleted targets render that identity plus approved delete-time `before` fields; missing legacy change data renders `Change details unavailable`.
5. Metadata uses only event-specific `{ before, after }` or approved export-summary keys, remains JSON-safe and secret-free, and stays within the current 8 KiB boundary.
6. Never persist passwords, password hashes, raw tokens, token fingerprints, authorization headers, cookies, private keys, connection strings, raw credentials, request/response bodies, exception stacks, or complete entities.

### 8.3 Immutability and read-only behavior

1. No HTTP or CMS operation may update an audit event or delete a selected audit event.
2. Read repositories use explicit projections from `READ-001` and omit all unapproved fields server-side.
3. Retention purge is isolated internal scheduled maintenance under `RETENTION-001`, never generic CRUD or a public/CMS control.
4. Database-role or stronger tamper resistance beyond current application boundaries remains out of scope. Do not claim WORM or database-enforced immutability without executed evidence.

### 8.4 Access and data minimization

1. `audit.read` grants global list/detail access. No self-only mode or role-code bypass exists.
2. Export requires both `audit.read` and `audit.export`.
3. Backend RBAC is authoritative. CMS guards only hide unavailable UX; direct API access uses established generic `401`/`403` behavior without leaking event existence.
4. Reader visibility is restricted to the approved generic CMS event catalog. `auth_audit_events`, generic `auth.*` events, and unknown types remain hidden.
5. Current repository has no tenant model. No tenant selector, filter, column, or cross-tenant claim is approved.
6. API responses omit session ID, IP address, user agent, reason code, raw metadata, auth rows, and all sensitive or unapproved data rather than relying on frontend hiding.

### 8.5 Query and API behavior

The exact contract is `READ-001`, `QUERY-001`, `EXPORT-001`, and the detailed rules in `references/approved-requirements.md`:

- `GET /api/v1/audit-events` lists visible events; `GET /api/v1/audit-events/:id` returns one visible event; `GET /api/v1/audit-events/export` streams approved CSV. No public write operation exists.
- List ordering is `(createdAt DESC, id DESC)` with an opaque cursor so equal timestamps do not omit or duplicate rows.
- Page size defaults to 20 and accepts only 20, 50, or 100.
- Filters cover date, actor ID, exact action/event type, resource type/ID, and outcome. Search is bounded to actor snapshot and target identity fields.
- List browsing defaults to the last 30 days and permits at most a 90-day submitted range. Export permits at most 31 days and 10,000 rows.
- List/detail expose only approved actor, target, outcome, timestamp, request ID, and allowlisted before/after projections. Hidden or unknown event IDs use the same not-found response as an absent visible row.
- All path, query, date, limit, and cursor input validates with Zod. API emits UTC ISO-8601 timestamps.

### 8.6 Retention and audit-write failures

1. `RETENTION-001` supersedes the current unscheduled 90-day engineering baseline: both audit tables retain rows for one year, then permanently delete rows at strict `createdAt < cutoff`.
2. Purge runs daily at 02:00 `Asia/Jakarta`, in deterministic batches of at most 1,000 rows per table, with a 30-second whole-run bound. No archive or legal hold exists in phase 1. Failure emits sanitized Pino evidence and remaining rows retry on the next schedule.
3. The ten approved CMS mutation types and `audit.exported` use best-effort persistence. CMS state commits before its audit attempt; export may complete when its event fails.
4. Best-effort failure emits one structured sanitized Pino error without metadata, actor PII, filters, payloads, credentials, or exception stacks. No external metric/alert backend, outbox, or durable retry is required in phase 1.
5. Existing generic auth/password/email-verification and `auth_audit_events` writers retain their current per-emitter behavior.
6. `RISK-001` accepts missing, unreconstructable phase 1 history; do not claim complete or non-repudiable audit coverage.

### 8.7 UI behavior

- Use dedicated read-only routes `/audit-trail` and `/audit-trail/:id` with navigation label `Audit Trail`. No create/edit/delete route, modal, button, or API call.
- Render approved actor snapshot, action label, target, outcome, and `Asia/Jakarta` time labelled `WIB (UTC+07:00)`.
- Support only approved date, actor, action, resource, outcome, actor/target search, pagination, and permission-gated CSV export controls.
- Include applicable loading, empty, forbidden, retryable error, unavailable legacy actor/change, and malformed/hidden-event fallback states.
- Use semantic table/list structure, labelled controls, keyboard access, visible focus, screen-reader status, safe wrapping/overflow, and responsive behavior.
- UI must not reconstruct legacy values, join current source records to fabricate snapshots, or expose raw JSON.

### 8.8 Rollout boundaries

1. Land approved backend permission/API and tests before CMS consumers.
2. If schema/index changes are required, use focused Drizzle UP/DOWN migration and isolated UP/DOWN/re-apply evidence. Existing applied migrations remain immutable.
3. Add event emitters module by module with regression tests; do not mix unrelated business changes.
4. Approved retention scheduling remains an independent task. Approved export ships with the read API contract and may be exposed in CMS only after its backend authorization/redaction tests pass.
5. No destructive cleanup runs against shared/production data during development or verification.
6. Feature availability must remain absent until backend authorization and response redaction are verified.

### 8.9 Child task breakdown and dependency graph

| Order | Owner          | Child outcome                                                                                                                                                   | Depends on                  | Gate                                                              |
| ----- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| 1     | BA             | Approved policy, access matrix, event catalog, metadata rules, API/UI expectations, retention and failure matrix in `references/approved-requirements.md`       | This planning task          | COMPLETE: Saputra approval recorded                               |
| 2     | Backend        | Implement approved list/detail/export API, `audit.read`/`audit.export`, actor snapshots, safe projections, deterministic pagination, OpenAPI, and focused tests | BA                          | `ACCESS-001`, `ACCESS-002`, `READ-001`, `QUERY-001`, `EXPORT-001` |
| 3     | Backend        | Reconcile approved CMS event catalog, add allowlisted before/after data, and convert only approved CMS events to best-effort with failure-policy tests          | BA                          | `CATALOG-001`, `CATALOG-002`, `CHANGE-001`, `WRITE-001`           |
| 4     | Backend/DevOps | Implement approved one-year bounded purge scheduling for both audit tables and operational evidence                                                             | BA                          | `RETENTION-001`                                                   |
| 5     | Frontend       | Implement approved read-only CMS route, filters, list/detail states, permission UX, accessibility, and responsive behavior                                      | BA and backend read API     | Approved UI/API contract                                          |
| 6     | Reviewer       | Review requirement traceability, authorization, redaction, immutability claims, query safety, failure behavior, retention, UI, and tests                        | All implementation children | No unresolved material findings                                   |
| 7     | QA             | Execute end-to-end catalog, authorization, redaction, pagination, failure injection, retention, UI, accessibility, browser, and regression plan                 | Reviewer approval           | Test environment and approved expected results                    |

Dependency graph:

```text
PM plan
  -> BA approval
      -> Backend read API ---------+
      -> Backend event coverage ---+-> Frontend (requires read API)
      -> Retention ops ------------+
                                   -> Reviewer
                                      -> QA
```

Backend read API and event-coverage work may run in parallel after BA approval if they do not edit the same files. Audit service/schema files are collision hotspots; PM must split ownership or serialize work if both children need them.

## 9. Applicable Contracts

### Configuration Contract

No new environment variable is approved. Retention runs on the fixed `RETENTION-001` schedule. Archive, legal hold, external alerting, and durable retry configuration are not applicable in phase 1.

### API Contract

Approved operations are `GET /api/v1/audit-events`, `GET /api/v1/audit-events/:id`, and `GET /api/v1/audit-events/export`. They use `audit.read`, plus `audit.export` for export, explicit redacted projections, approved catalog filtering, bounded Zod query validation, opaque `(createdAt,id)` cursor pagination, UTC timestamps, and the exact query/export rules in `references/approved-requirements.md`. No public audit write/update/delete operation exists.

### Database Contract

Current `audit_events` and separate `auth_audit_events` remain authoritative. `ACTOR-001` requires a focused schema change so new generic CMS rows retain event-time actor ID, nullable display name, and email independently of the live user FK. `CHANGE-001` uses existing bounded JSONB metadata with event-specific before/after allowlists. `RETENTION-001` changes cleanup behavior, not historical migration files. Tenant, impersonation, service-account, archive, legal-hold, retention-class, and auth-table merge fields are not approved. Any required schema/index change needs focused Drizzle UP/DOWN, data-impact review, query evidence, and isolated UP/DOWN/re-apply validation.

### UI Contract

Approved CMS routes are `/audit-trail` and `/audit-trail/:id`, with navigation label `Audit Trail`. The experience is read-only, backend-permission-gated, uses approved projections/filters/pagination/export, displays `WIB (UTC+07:00)`, includes applicable loading/empty/forbidden/error/legacy states, and requires accessibility, responsive behavior, Code/UI Anti-Slop, and browser verification. No tenant control or mutation UI exists.

## 10. File Impact

Planning deliverables created by this task:

- `tasks/be/41-audit-trail/technical.md`
- `tasks/be/41-audit-trail/explanation.md`
- `tasks/be/41-audit-trail/references/current-state-and-gaps.md`
- `tasks/be/41-audit-trail/references/approved-requirements.md` (BA-owned named approval artifact)

Expected implementation areas after BA approval:

- Existing `apps/api/src/modules/audit/` module for query/service/repository additions.
- Existing RBAC permission catalog/seeding and middleware usage.
- Existing app composition and global OpenAPI aggregation plus module-local audit YAML.
- Owning business modules only for approved emitter gaps.
- Existing BullMQ/config/operations paths for approved retention scheduling only; retry/outbox infrastructure remains out of scope.
- Existing CMS router, API client/types, auth permission guards, navigation, and feature-specific views/components.
- Focused API/CMS tests and migration files only if approved schema/index work requires them.

Expected not modified by planning task:

- All application source, configuration, schemas, migrations, tests, manifests, and existing task files.

Implementation must not create a new top-level `apps/api/src` directory. Audit capability remains under `modules/audit`; config and middleware retain existing ownership.

## 11. Runtime Behavior

Target sequence after implementation:

1. Owning CMS use case derives actor snapshot, resource identity, and allowlisted before/after values from trusted server state.
2. CMS state commits. The approved event is then validated and appended best-effort; failure emits one structured sanitized Pino error and does not change the successful owner response.
3. Read request authenticates the principal and checks `audit.read`; export also checks `audit.export`.
4. Query validates bounded filters/search/cursor, limits rows to the approved catalog, applies `(createdAt DESC, id DESC)`, and returns only approved projections.
5. Export validates its 31-day/10,000-row bounds, streams neutralized UTF-8 CSV, retains no server file, then attempts best-effort `audit.exported` without file content or raw search text.
6. CMS renders authorized history and converts UTC instants to `Asia/Jakarta`, labelled `WIB (UTC+07:00)`, without mutation paths or inferred legacy values.
7. Daily retention independently purges rows older than one year from both tables in bounded oldest-first batches, stopping after exhaustion, failure, or 30 seconds.

Until implementation children complete, runtime remains unchanged: current writes continue, no audit reader/UI exists, and cleanup remains unscheduled. Approval changes contract, not current production behavior.

## 12. Error And Edge Cases

| Scenario                                  | Expected Result                                                | Security / Recovery                              |
| ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| Unapproved behavior requested             | Implementation child blocks or omits it                        | No guessed policy                                |
| Unauthorized list/detail/export           | Established generic `401` or `403`; no rows/existence leak     | Backend enforcement                              |
| Hidden/unknown event ID                   | Same not-found response as absent visible event                | No catalog-boundary leak                         |
| Equal timestamps                          | Stable cursor tie-break prevents duplicate/omitted rows        | Test page boundaries                             |
| Invalid/expired cursor or filter          | Safe `400`; no SQL detail                                      | Strict Zod validation                            |
| Deleted actor/resource                    | Preserve event-time snapshot and stable target ID              | No live-row dependency                           |
| Legacy row lacks snapshots                | `Actor unavailable` or `Change details unavailable`            | No fabricated backfill                           |
| Forbidden/oversized metadata              | Existing validation rejects write                              | No secret reaches storage/log                    |
| Approved CMS/export audit write fails     | Owning operation remains successful; one sanitized Pino error  | Accepted missing-history risk; no retry          |
| Existing auth audit write fails           | Preserve current owner-specific behavior                       | No phase 1 conversion                            |
| Read database failure                     | Safe `500`; no partial fabricated rows                         | Retry UX may be offered                          |
| Retention boundary equality               | Row at exact cutoff remains; only strict older-than rows purge | Controllable-clock tests                         |
| Retention run fails or reaches 30 seconds | Keep committed batches and retry remaining rows next schedule  | Sanitized Pino evidence; no broad rollback claim |
| Export exceeds 31 days or 10,000 rows     | Reject request; never silently truncate                        | No partial public file or secret log             |
| Malformed stored metadata                 | API/UI degrades to safe unavailable state                      | Do not render raw JSON or unsafe markup          |

## 13. Security Requirements

- Deny read/export access by default. Require `audit.read` for list/detail and both `audit.read` plus `audit.export` for export.
- Derive actor snapshot, resource context, request ID, and timestamp from trusted server state; never accept them from browser input.
- Preserve application append-only behavior and expose no generic update or selected-row delete operation.
- Treat actor email and managed-user email history as approved PII: expose only through authorized projections/export and purge with the event after one year.
- Use event-specific response and before/after allowlists. Never expose credentials, secrets, token data, headers, cookies, raw request/response bodies, exception stacks, private keys, IP address, user agent, session ID, or raw metadata.
- Keep audit data separate from ordinary Pino/Morgan logs. Audit-write failure logs contain no metadata, actor PII, raw filters, export contents, or stack.
- Validate every path/query/cursor input, enforce list/export cost bounds, and neutralize CSV spreadsheet formulas.
- Prevent HTML/script injection when rendering untrusted snapshot or target strings.
- Do not claim complete history, tenant isolation, legal compliance, WORM storage, non-repudiation, or database tamper proofing.
- Scheduled destructive retention remains internal, least-privileged, bounded, and unavailable through HTTP/CMS.
- Security reviewer must examine authorization, permission seeding, PII snapshots, deleted identities, redaction, cursor integrity, CSV delivery/formula safety, accepted write-loss risk, and permanent purge.

## 14. Test Requirements

### Happy Path

- Every approved catalog trigger emits exactly expected event(s) with trusted actor/action/resource/outcome/time/context.
- Authorized reader lists, filters, paginates, and views approved detail fields.
- CMS renders approved records, metadata, timezone, and navigation.

### Validation

- Filter/date/limit/cursor schemas enforce approved bounds.
- Metadata and event taxonomy retain current validation and approved extensions.
- API response schemas and OpenAPI match runtime.

### Negative / Failure

- Missing/invalid auth, missing either required permission, direct-route access, hidden/unknown event IDs, invalid cursor, unavailable DB, malformed stored metadata, and deleted source rows.
- Forced CMS audit-insert failure proves owner mutation succeeds, one sanitized Pino error appears, and no retry/duplicate row is created.
- Forced `audit.exported` failure proves CSV still succeeds and logs only approved operational identifiers.
- Retention proves strict one-year boundary, 1,000-row batches, 30-second stop, both-table handling, partial committed progress, and next-schedule retry.
- Export rejects a span over 31 days or a result over 10,000 rows rather than truncating.

### Security

- `audit.read` and `audit.export` boundaries reveal no hidden event data; `audit.export` alone cannot export.
- Auth-table and generic `auth.*` rows remain invisible through list, detail-by-ID, search, filters, and export.
- Secret fixtures never appear in DB, API, CSV, UI, or logs; raw free-text search is absent from `audit.exported`.
- CSV formula prefixes are neutralized.
- No API/UI mutation or per-row purge path exists.
- Query injection, stored XSS, mass assignment, unbounded query, and ID enumeration attempts fail safely.
- Tenant, impersonation, service-account, and bulk-action behavior is not added.

### Regression

- Existing auth/password/email-verification audit storage and per-emitter failure semantics remain unchanged.
- Category, role, user, and profile mutations retain business behavior while only their approved audit failure mode changes to best-effort.
- `auth_audit_events` remains separate and receives its approved one-year purge without becoming readable through Audit Trail.
- Existing permission and CMS route guards remain intact.

### Isolation

- Synthetic users/events, deterministic clocks, disposable DB for migration/retention, deterministic cleanup, no order dependence, and no real credentials or production data.

### UI / Browser

- Loading, empty, populated, forbidden, error, deleted-identity, unavailable legacy snapshot, malformed-safe-fallback, and pagination states.
- Desktop and mobile layout, overflow, keyboard order, focus visibility, labels, screen-reader status, contrast, and all interactive filters/pagination/detail/export controls that actually exist.

## 15. Task-Level Expected Results

- Review-ready durable feature plan exists under `tasks/be/41-audit-trail/` without overwriting completed `be/14`.
- Repository reality and gaps distinguish generic and auth-specific audit stores.
- Saputra's named decision set closes phase 1 approval gates; behavior outside it remains blocked.
- BA, backend, frontend, reviewer, and QA lanes have explicit outcomes and dependency order.
- Future implementation can be split into small diffs without rebuilding completed foundation.
- No application behavior changes during this planning task.

## 16. Acceptance Criteria

- [x] Selected ID/path does not conflict with existing tasks and preserves completed `be/14-audit-trail`.
- [x] Current-state evidence names generic `audit_events`, separate `auth_audit_events`, existing emitters, current retention boundary, and absent reader/UI.
- [x] Actor, action, resource, timestamp, outcome, request/session context, actor snapshots, and change-metadata rules match the approved decision IDs.
- [x] History remains append-only/read-only through API/UI; one-year scheduled retention is isolated from generic CRUD.
- [x] Saputra's named approval records access, catalog, PII snapshots, metadata visibility, export, best-effort risk, and irreversible retention policy.
- [x] API, database, and UI contracts match `references/approved-requirements.md` without broadening scope.
- [x] BA, Backend, Frontend, Reviewer, and QA tasks have explicit dependencies and rollout order.
- [x] Test plan covers behavior, authorization, redaction, immutability, pagination, failure injection, retention, regression, UI, accessibility, and isolation as applicable.
- [x] Planning diff changes only new files under `tasks/be/41-audit-trail/`.
- [x] Planning Code Anti-Slop, documentation consistency review, `git diff --check`, path/status review, and secret review pass.

## 17. Anti-Slop Requirements

- Code Anti-Slop for future implementation: reject duplicate audit stores/writers, generic CRUD, speculative tenant/outbox/export abstractions, broad raw-JSON APIs, unbounded queries, fake event coverage, hidden TODO/FIXME/HACK, unjustified `any`/assertions, dead dependencies, audit recursion, and unrelated refactors.
- Planning Anti-Slop: reject invented approvals, vague “add audit” work, one oversized implementation card, stale paths presented as current, and targets presented as implemented facts.
- UI Anti-Slop for frontend child: reject generic admin table without approved information hierarchy, mutation-looking controls, fake sample history, excessive cards/decorations, missing states, inaccessible filters, overflow, and desktop-only behavior.
- Visual Verification is required for meaningful CMS implementation. It is not applicable to this planning-only task.

## 18. Validation Requirements

### Static

- `git diff --check`
- Inspect `git status --short` and `git diff -- tasks/be/41-audit-trail`.
- Confirm no existing task, source, configuration, migration, schema, test, or manifest changed.

### Automated Tests

Not applicable to planning-only artifact creation. Each implementation child must run focused and full applicable API/CMS suites.

### Build

Not applicable to planning-only artifact creation. CMS implementation child requires build; API child follows current scripts.

### Database

Not applicable to planning-only artifact creation. Schema/index/retention children require isolated DB and migration UP/DOWN/re-apply where a migration exists.

### UI

Not applicable to planning-only artifact creation. Frontend child requires browser verification.

### Anti-Slop

Run planning/document Code Anti-Slop and documentation consistency review. Future backend/config changes require Code Anti-Slop; future UI requires Code and UI Anti-Slop.

## 19. Completion Evidence

| Acceptance criterion           | Evidence                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Non-conflicting task path      | Existing task inventory plus `git status --short`                                                               |
| Current state and gap accuracy | `references/current-state-and-gaps.md`, cited source/task paths                                                 |
| Approval gates                 | `references/approved-requirements.md`, approved by Saputra on 2026-10-02, plus sections 8, 9, and 21            |
| Cross-functional breakdown     | Section 8.9 and Kanban child graph                                                                              |
| No production change           | `git diff --name-only` limited to `tasks/be/41-audit-trail/`                                                    |
| Planning quality               | Code Anti-Slop/document consistency review and `git diff --check`                                               |
| Future implementation          | Child-specific tests, OpenAPI diff, migration evidence, browser evidence, reviewer handoff, and QA traceability |

## 20. Traceability

| Trace Type          | References                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| PRD                 | `docs/PRD.md` is unresolved and grants no Audit Trail product policy                                                                            |
| Feature             | Audit Trail successor planning; completed `be/14-audit-trail` foundation                                                                        |
| Requirement         | Kanban tasks `t_7dd020a6` and `t_1e30e289`; decision IDs in `references/approved-requirements.md`                                               |
| Acceptance Criteria | Section 16                                                                                                                                      |
| API Operation       | `GET /api/v1/audit-events`, `GET /api/v1/audit-events/:id`, `GET /api/v1/audit-events/export`                                                   |
| Database            | Existing `audit_events`, separate `auth_audit_events`, approved generic actor-snapshot extension, one-year purge for both                       |
| Test IDs            | Not applicable: project has no test-ID registry                                                                                                 |
| Design/Figma        | Not provided; frontend must reuse current CMS design system and approved routed information architecture without inventing new visual direction |

## 21. Open Points

None for approved phase 1 requirements. `references/approved-requirements.md` is the exact contract. New event types, auth-history visibility, tenant/impersonation/service-account/bulk semantics, durable retry, external alerting, archive, legal hold, asynchronous or alternate-format export, stronger tamper resistance, or compliance claims require separate named human approval.

Implementation remains pending and must not treat this approval artifact as proof that runtime behavior already exists.

## 22. Definition Of Done

Planning task:

- [x] New task directory and all review artifacts exist under `tasks/be/41-audit-trail/`.
- [x] Current source/docs/tasks were reconciled; conflicts and gaps are explicit.
- [x] Saputra's named approvals and child dependency graph are recorded and complete for phase 1.
- [x] No production source/config/schema/migration/test/manifest or existing task changed.
- [x] Planning Anti-Slop and documentation consistency checks pass.
- [x] `git diff --check`, changed-file review, and secret review pass.

Feature delivery after approval:

- [ ] Named human approvals recorded.
- [ ] Approved backend event coverage, read authorization/API, and retention behavior implemented in small tasks.
- [ ] Approved CMS read-only UI implemented with accessibility and responsive states.
- [ ] OpenAPI/docs match runtime.
- [ ] Focused/full tests, lint, typecheck, formatting, applicable build/migration/browser verification, and required Anti-Slop pass.
- [ ] Reviewer approves traceability/security/diff; QA validates approved end-to-end behavior.
- [ ] No secrets, generated junk, false compliance claims, unrelated changes, or unresolved blockers remain.
