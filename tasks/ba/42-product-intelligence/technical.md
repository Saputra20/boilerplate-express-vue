# Product Intelligence Planning Package

## 1. Metadata

| Field | Value |
|---|---|
| Task ID | `ba/42-product-intelligence` |
| Batch | Product Intelligence MVP planning |
| Owning Feature | Product Intelligence |
| Workstream | BA, Backend, Frontend, QA, Reviewer |
| Task Category | Product and technical planning |
| Repository/App | `apps/api`, `apps/cms`, PostgreSQL, Redis/BullMQ |
| Status | PLANNING ONLY — human approval required before implementation |
| Priority | Pending product approval |
| Suggested Size | Epic; execute children in dependency order |
| Depends On | `t_b6b2f517`, `t_32c6b060`; existing auth/RBAC, Drizzle, Redis/BullMQ, OpenAPI, CMS foundations |
| Blocks | Product Intelligence implementation children |
| Execution Order | 42 |

## 2. Outcome

Create a repository-grounded plan for collecting marketplace product observations, preserving daily historical snapshots, and showing basic trend data in CMS. MVP recommendation: one approved marketplace connector, daily snapshots, provenance, and read-only trend dashboard. No implementation is authorized until human gate `t_6d76a4f4` is approved.

## 3. Context

- `docs/PRD.md` and `docs/PRODUCT.md` remain requirement placeholders; this package is a proposal, not product approval.
- `docs/ARCHITECTURE.md` requires module-first API boundaries, Drizzle/PostgreSQL, Redis/BullMQ, and API-owned authorization.
- `docs/DATABASE.md` requires Drizzle migrations, snake_case PostgreSQL fields, and durable historical audit-style data.
- Parent repository inspection found existing API/CMS foundations and no Product Intelligence module.
- Marketplace feasibility parent found no verified unrestricted cross-marketplace feed. Official APIs are gated; TikTok Research metrics have documented EU scope. Indonesia requires an approval spike for Shopee Affiliate/TikTok Affiliate or a connected-shop Lazada/TikTok integration.
- External evidence and confidence are recorded in `references/marketplace-feasibility.md`.

## 4. Dependencies

- Human approval of product scope, marketplace, geography, credential ownership, metric definitions, retention, and refresh schedule.
- Approved marketplace access and terms-compliant credentials. No scraper, CAPTCHA bypass, or undocumented endpoint.
- Existing authenticated principal/RBAC, versioned OpenAPI aggregation, PostgreSQL/Drizzle, Redis/BullMQ foundations.
- Backend contract before frontend implementation; reviewer before QA/release.

## 5. In Scope

- Product problem, user journey, MVP boundary, and trend dashboard proposal.
- One connector abstraction with normalized observations and source provenance.
- First-class immutable daily snapshots with idempotent run identity.
- Proposed schema, API boundaries/OpenAPI plan, queue/schedule/worker design, and FE routes/pages.
- Backend/frontend task breakdown, dependency graph, acceptance criteria, risks, open decisions, and approval gates.

## 6. Out of Scope

- Production code, migrations, API credentials, marketplace account setup, or deployment.
- Multi-marketplace rollout before connector feasibility approval.
- Scraping, CAPTCHA bypass, reverse engineering, undocumented APIs, or unsupported bestseller/ranking claims.
- Product clustering, AI recommendations, automated copy, mockup generation, forecasting, or image intelligence.
- Tenant/organization model, new authorization policy, export, alerts, or public API unless separately approved.

## 7. Existing Implementation

- API module architecture and route composition: `docs/ARCHITECTURE.md`, `apps/api/src/modules/`.
- Drizzle/PostgreSQL schema and migration conventions: `docs/DATABASE.md`, `apps/api/src/config/drizzle/`.
- Redis/BullMQ foundation: existing queue config and `tasks/be/15-bullmq-foundation`, `tasks/be/33-email-queue-worker`.
- OpenAPI module contracts: `tasks/be/22-api-versioning-foundation`, `apps/api/src/modules/*/v1/*.openapi.yaml`.
- CMS Vue routing/API patterns: `apps/cms/src/router`, `apps/cms/src/api`, `apps/cms/src/views`.
- Exact source paths must be re-inspected by each implementation child.

## 8. Implementation Requirements

- Collector interface accepts approved source configuration and returns normalized observations plus raw-source provenance metadata; it must not expose credentials or accept client-supplied arbitrary URLs.
- Observation fields must distinguish source-native values from normalized values and must retain `observed_at`, source, source item ID/URL where permitted, title, category/path when available, price/currency when available, rank only when source explicitly supplies it, and availability only when source supplies it.
- Historical snapshots are append-only. Re-running same connector/date/source cursor must be idempotent through a deterministic run key or uniqueness constraint; no overwrite of prior snapshots.
- Missing source fields remain null/unknown. No inferred ranking, sales, demand, or trend values without documented formula and approval.
- API uses module-relative routes mounted under existing `/api/v1` composition. Read endpoints are authenticated and permission-protected; exact permission code requires approval. No client write endpoint for snapshots.
- Queue worker uses approved schedule/timezone, bounded retries, backoff, timeout, retention, and sanitized logs. One failed source run must not erase prior snapshots. Exact values require approval.
- Dashboard displays source, observation date, freshness, metric definitions, loading/empty/error/success/disabled/focus/responsive states. It must label unavailable metrics instead of fabricating values.
- Secrets stay in runtime configuration/secret manager; never persist or log raw credentials, tokens, headers, or payload dumps.

## 9. Applicable Contracts

### Configuration Contract

| Variable | Required | Type | Validation | Default | Secret |
|---|---|---|---|---|---|
| Marketplace credential/config | Yes after source approval | approved provider-specific shape | provider contract; fail closed | None — no collection without approved access | Yes |
| Collection schedule/timezone | Yes | string | approved IANA timezone and cron | None — human approval required | No |
| Source enablement | Yes | boolean/config | only approved connectors | Disabled until approval | No |

### API Contract (proposal; approval required)

- `GET /api/v1/product-intelligence/observations`: authenticated, approved read permission; bounded filters and pagination; normalized observations with provenance and freshness.
- `GET /api/v1/product-intelligence/trends`: authenticated, approved read permission; date range/source/category filters; daily snapshot series and metric definitions.
- No public route, client snapshot write route, export route, or arbitrary source proxy.

### Database Contract (proposal; approval required)

- `marketplace_sources`: approved source identity/config reference, enabled state, provider key, created/updated timestamps. No raw secret.
- `collection_runs`: source, deterministic run key, started/completed status, bounded counts, sanitized error code, timestamps; unique source/run key.
- `product_observations`: immutable source observations and provenance; source item key where available; observed timestamp; normalized nullable fields.
- `product_daily_snapshots`: immutable daily aggregate/observation records keyed by source/product/snapshot date; metric definition/version; source and collection run references.
- Indexes: source + observed time, source/product + snapshot date, run status/time. FK delete behavior must preserve approved historical records or be explicitly decided.
- Every schema change requires focused Drizzle UP/DOWN validation against isolated PostgreSQL.

### UI Contract (proposal; approval required)

- Route `/product-intelligence` lists trend summary and source freshness.
- Route `/product-intelligence/trends` shows bounded date/source/category trend view.
- Dedicated read-only pages, no modal as primary workflow, no fake charts/data, accessible labels/focus, mobile-safe table/chart overflow handling.

## 10. File Impact

Expected Create after approval: one API module, focused Drizzle schema/migrations, worker/scheduler integration, OpenAPI YAML, CMS API types/client, views/components, tests.

Expected Modify after approval: route composition, permission seed/catalog, queue registration, CMS navigation only where required.

Expected Not Modified now: all production source, migrations, lockfiles, deployment configuration.

## 11. Runtime Behavior

Approved configuration loads before collection. Worker validates source access and starts one bounded run. Connector fetches only terms-compliant provider data, normalizes allowed fields, records provenance, writes run and immutable observations/snapshots transactionally where applicable, and emits sanitized outcome. Retryable provider failures retry within approved bounds; invalid credentials or policy failures stop that run without deleting history. API reads only stored data through authorized service/repository paths. CMS renders freshness and historical series, including empty/stale/error states.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
|---|---|---|
| No approved credential | Collection disabled/fails startup or run validation per approved policy | Never log secret; no partial claim |
| Provider rate limit | Bounded retry/backoff; preserve prior snapshots | Do not bypass limits |
| Duplicate run | Idempotent no duplicate snapshot | Unique key and safe retry |
| Missing metric | Null/unknown and visible unavailable state | No inference |
| Provider schema change | Run fails safely with sanitized error; alert/ops evidence per approval | No silent remapping |
| Empty source result | Successful empty run with freshness/status | Preserve prior history |
| Unauthorized API request | 401/403 using existing auth conventions | API remains authority |

## 13. Security Requirements

Provider credentials and tokens never enter DB rows, logs, API responses, browser bundles, or task docs. Validate provider responses at trust boundary. Enforce auth/RBAC server-side, bound pagination/date ranges, prevent SSRF by fixed approved connectors, redact payloads, and isolate worker permissions. No tenant isolation claim until approved.

## 14. Test Requirements

- Happy Path: approved connector normalizes one source response; daily snapshot persists; API and CMS display historical data.
- Validation: malformed provider response, unsupported source, invalid dates, oversized pagination, missing required config.
- Negative / Failure: auth failure, rate limit, timeout, duplicate run, DB transaction failure, schema drift.
- Security: secret redaction, SSRF prevention, permission denial, no client write path.
- Regression: existing API/CMS tests and queue health remain green.
- Isolation: deterministic run keys, isolated DB, repeatable worker tests, no order dependence.

## 15. Task-Level Expected Results

Planning package exists; feasibility evidence and confidence are cited; schema/API/queue/collector/UI proposals are explicit; implementation is decomposed; human gate blocks all implementation children; unresolved decisions are visible.

## 16. Acceptance Criteria

- [ ] Product problem, user journey, MVP, non-goals, and future phases documented.
- [ ] Marketplace recommendation follows documented evidence and confidence; unsupported claims excluded.
- [ ] Historical snapshots are first-class and immutable in data/API/runtime design.
- [ ] Proposed DB model aligns Drizzle/PostgreSQL and migration rollback rules.
- [ ] API/OpenAPI, queue/worker, connector, FE routes, task breakdown, dependency graph, risks, and approval gates documented.
- [ ] No production source or existing task overwritten.
- [ ] Implementation child cards cannot become runnable before approval card completes.
- [ ] `git diff --check` passes and only planning files are changed by this task.

## 17. Anti-Slop Requirements

Code Anti-Slop: planning must avoid speculative APIs, fields, dependencies, fake provider support, hidden TODOs, and duplicated task ownership. UI Anti-Slop applies only after UI implementation. Visual Verification: not applicable to planning-only task.

## 18. Validation Requirements

Static: inspect new planning files; `git diff --check`.
Automated Tests: not applicable to planning-only task.
Build/Database/UI: not applicable; no implementation changed.
Anti-Slop: manual review of evidence, scope, unsupported claims, task dependencies, and secret absence.

## 19. Completion Evidence

- `references/marketplace-feasibility.md` contains parent evidence and confidence.
- `references/product-requirement.md`, `user-journey.md`, `architecture-and-data-flow.md`, `db-api-queue-collector.md`, `fe-routes-and-breakdown.md`, and `dependency-graph.md` contain package artifacts.
- Human gate and gated implementation child IDs recorded in task handoff.
- `git diff --check` output is clean; changed-file review confirms planning-only changes.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

Marketplace/provider and Indonesia eligibility; credential owner; exact metrics and ranking semantics; category/product identity rules; schedule/timezone; retention; stale-data policy; permission codes; source terms; alerting; tenant/organization scope; dashboard chart library/UX; approval of all implementation cards.

## 22. Definition Of Done

- [ ] Package artifacts complete and internally consistent.
- [ ] Scope, non-goals, risks, decisions, and evidence explicit.
- [ ] No unsupported marketplace/API/field claims.
- [ ] Human gate exists; implementation cards remain dependency-gated.
- [ ] `git diff --check` passes.
- [ ] Changed-file review confirms no production implementation or unrelated changes.
