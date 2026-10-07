# Product Intelligence — Lazada Indonesia Production Readiness Plan

## 1. Metadata

| Field | Value |
|---|---|
| Task ID | `ba/43-product-intelligence-lazada` |
| Batch | Product Intelligence MVP — Lazada planning successor |
| Owning Feature | Product Intelligence |
| Workstream | BA, Backend, Frontend, QA, Reviewer |
| Task Category | Production-readiness planning |
| Repository/App | `apps/api`, `apps/cms`, PostgreSQL, Redis/BullMQ |
| Status | PLANNING ONLY — implementation blocked by human gate |
| Priority | High after legal/data approval |
| Suggested Size | Epic; execute child tasks sequentially |
| Depends On | `ba/42-product-intelligence`; Lazada POC artifacts under `data/scraping-poc/`; existing auth/RBAC, Drizzle, Redis/BullMQ, OpenAPI, CMS foundations |
| Blocks | Lazada implementation tasks listed in `references/task-breakdown.md` |
| Execution Order | 43 |

## 2. Outcome

Create an implementation-ready, evidence-bounded plan for Lazada Indonesia public first-page Product Intelligence collection. Plan defines legal/data gates, public contract, retention, disposable multi-day reliability harness, zero-card failure handling, production flow, and dependency-ordered implementation tasks. No production implementation is approved by this document.

## 3. Context

- Parent planning contract: `tasks/ba/42-product-intelligence/technical.md` and `references/approved-requirements.md`.
- POC evidence: `data/scraping-poc/lazada-feasibility.md`, `lazada-reliability-report.md`, `lazada-reliability-comparison.md`, `lazada-reliability-raw-samples.json`.
- Existing architecture requires module-first API, Drizzle/PostgreSQL, Redis/BullMQ, backend-owned authorization, and OpenAPI beside modules.
- POC proves only low-volume public card rendering and short-interval repeat. It does not prove terms permission, quota, retention permission, day-over-day stability, or production readiness.
- Shopee and TikTok are explicitly excluded.

## 4. Dependencies

- Human legal review and written approval of Lazada public-page access, fields, frequency, request estimate, authentication, personal/private data boundary, internal purpose, retention, and compliance.
- Human data-contract approval, including raw values, nullable fields, approximation semantics, provenance, and no-invention rules.
- Disposable harness evidence across multiple days before production implementation approval.
- Human production approval after legal/data/harness gates. Existing implementation placeholders stay blocked/todo until gate completion.

## 5. In Scope

- Lazada Indonesia only; public catalog/search first page only.
- Maximum 3 fixed Research Keywords and approximately 120 observations/day: 40 cards per keyword target, not a guaranteed result.
- Legal review checklist and explicit `HUMAN LEGAL REVIEW REQUIRED` status.
- Public normalized observation contract and provenance.
- Retention classes for identity/current data, immutable snapshots, raw values, diagnostics, and logs/errors.
- Disposable multi-day reliability harness and measurable acceptance gates.
- Zero-card classification and bounded retry proposal.
- Production architecture/data flow and dependency graph.
- Planning cards for collector infrastructure, Lazada collector, DB/schema, snapshot persistence, scheduling/queue, reliability/retry, trend calculation, API, and CMS surfaces.
- Acceptance criteria, risks, unresolved decisions, and human approval gates.

## 6. Out of Scope

- Production scheduler, queue, migration, API, collector, trend engine, CMS, AI, or Design Inspiration.
- Shopee, TikTok, multi-marketplace rollout, cross-marketplace identity merge.
- Login, private data, user cookies, CAPTCHA handling, anti-bot bypass, private endpoints, token extraction, proxy rotation, fingerprint spoofing, or rate-limit evasion.
- Page 2/3 collection, detail-page collection, seller intelligence, category inference, rating inference, exact sales conversion, rank-as-trend, popularity, demand, or bestseller claims.
- Design Inspiration, AI Brief, clustering, recommendations, forecasting, automated copy, mockups, alerts, exports, and public API.

## 7. Existing Implementation

- Parent package: `tasks/ba/42-product-intelligence/`.
- POC artifacts: `data/scraping-poc/`.
- Backend module conventions: `apps/api/src/modules/`, existing OpenAPI YAML beside modules.
- Database/migration conventions: `apps/api/src/config/drizzle/`, `docs/DATABASE.md`.
- Queue foundation: existing Redis/BullMQ work and `tasks/be/15-bullmq-foundation`.
- CMS routing/API/views: `apps/cms/src/router`, `apps/cms/src/api`, `apps/cms/src/views`.
- Existing `tasks/be/42-product-intelligence/` and `tasks/fe/42-product-intelligence/` are placeholders, not runnable implementation contracts; they require this gate and later decomposition.

## 8. Implementation Requirements

- Source boundary is fixed to public Lazada Indonesia catalog/search pages through ordinary browser rendering approved by legal review. Stop on login, CAPTCHA, block, or policy signal.
- ResearchKeyword owns one of at most 3 approved fixed keyword values. Collector receives bounded keyword/run input, never arbitrary client URLs.
- Lazada parsing stays isolated behind `LazadaCollector`; shared `MarketplaceCollector` owns lifecycle contract only.
- Preserve raw marketplace strings and source response provenance. Normalize only fields with explicit rules. Every normalized approximation carries `isApproximation: true`; no exact sales value may be derived from abbreviated displays.
- Required identity fields: marketplace, externalProductId, productUrl, title, observedAt, researchKeyword, searchRank when DOM order is accepted as source position. Missing non-identity fields remain null.
- Price, rawSoldCount, reviewCount, and searchRank are separate observations. Rank never becomes trend. No invented metric or zero substitution for unavailable data.
- Product identity is `(marketplace, externalProductId)`. Product current metadata may update; historical ProductSnapshot rows remain immutable and idempotent per product/date/run key.
- TrendMetrics is separate from source observations and requires an approved formula/version. MVP may expose no trend metric until formula approval; raw change comparisons do not equal demand.
- Failed run preserves prior data, records sanitized run error, marks freshness stale, and never presents zero cards as a valid empty result without validation.
- Credentials, cookies, tokens, headers, raw payloads, and private/personal data never persist or enter logs/API/CMS.

## 9. Applicable Contracts

### Configuration Contract

| Variable | Required | Type | Validation | Default | Secret |
|---|---|---|---|---|---|
| Lazada source enablement | After production approval | boolean | disabled unless all gates pass | Disabled | No |
| Research keywords | Yes for enabled run | bounded list, max 3 | exact approved values; no arbitrary URLs | None — run blocked | No |
| Collection timezone | Yes | IANA timezone | `Asia/Jakarta` | Approved value only | No |
| Lazada credential/reference | Only if approved access requires it | secret reference | provider contract; never raw credential in worker payload | None | Yes |
| Daily run target | Yes | bounded integer | approximately 120 max observations before dedupe | Human-approved value | No |

### Public Data Contract

| Field | Required | Raw value | Normalized value | Approximation/provenance |
|---|---|---|---|---|
| `marketplace` | Yes | `lazada-id` | same | `isApproximation=false`; source page/run |
| `externalProductId` | Yes | source ID | stable string | identity provenance |
| `productUrl` | Yes when card link exists | final public URL | canonicalized only by approved rule | final URL captured |
| `title` | Yes when card text exists | exact text | trimmed only | source selector/provenance |
| `price` / currency | Yes when exposed | displayed price | parsed numeric only if unambiguous | raw retained; no inferred currency |
| `rawSoldCount` | Nullable | exact display, e.g. `3.0K sold` | nullable; never exactified | `isApproximation=true` only for any approved display approximation |
| `reviewCount` | Nullable | displayed count | numeric only when unambiguous | raw retained |
| `searchRank` | Nullable | card order | source position | not a trend metric |
| `location` | Nullable | displayed location | nullable string | source provenance |
| `rating`, `originalPrice`, `imageUrl`, `shopName`, `category` | Nullable | preserve only if approved and reliable | otherwise null | no inference |
| `observedAt`, `researchKeyword`, `finalUrl`, `collectorVersion` | Yes | run metadata | typed metadata | run ID and selector version |

### Retention Contract

| Class | Rule |
|---|---|
| Product identity/current metadata | Retain while product is known; updates do not rewrite historical snapshots. Exact deletion/lifecycle needs approval. |
| ProductSnapshot | Immutable, 90 days per approved parent requirement; idempotent by product/date/run identity. Failed runs do not delete snapshots. |
| Raw marketplace values | Retain with snapshot only where legal approval permits; preserve raw sold display and raw source field separately from normalized value. |
| Temporary diagnostics | Harness HTML/DOM/selector evidence is disposable, bounded, access-controlled, and deleted per approved short TTL. Never production payload dump. |
| Collector logs/errors | Sanitized run ID/status/counts/error code and timestamps; no credentials, headers, cookies, raw payloads, or personal/private data. |

### Architecture/Data Flow Contract

`ResearchKeyword -> MarketplaceCollector -> LazadaCollector -> NormalizedObservation -> MarketplaceProduct -> ProductSnapshot -> separate TrendMetrics -> API -> CMS`.

`LazadaCollector` owns Lazada selectors, route redirects, DOM extraction, readiness checks, and source-specific errors. Shared lifecycle, run identity, provenance envelope, and persistence contracts stay marketplace-neutral without adding Shopee/TikTok behavior.

### API Contract

Proposal only after production approval: authenticated, permission-protected read routes for Research Keywords, Product Research, snapshots, and approved TrendMetrics. No public route, arbitrary source proxy, client snapshot write, or unsupported metric. Exact paths and permission use existing API versioning/RBAC conventions and require human approval before implementation.

### Database Contract

Proposal only after approval: `research_keywords`, `marketplace_products`, immutable `product_snapshots`, `collection_runs`, and separate `trend_metrics`; source-specific fields/provenance are nullable and bounded. Drizzle UP/DOWN migration pair required. Foreign keys and delete semantics must preserve approved historical snapshots. No schema is created by this task.

### UI Contract

Proposal only after backend contract: dedicated pages for `Research Keywords`, `Product Research`, `Trending Products`, and `Trend Explorer`. Read/write operations use approved permissions. Show loading, success, empty, error, stale, disabled, focus, responsive, and mobile states as applicable. Display raw/source values distinctly from approximations; never show rank as trend.

## 10. File Impact

Expected Create now:

- `tasks/ba/43-product-intelligence-lazada/technical.md`
- `tasks/ba/43-product-intelligence-lazada/explanation.md`
- `tasks/ba/43-product-intelligence-lazada/references/operational-contract.md`
- `tasks/ba/43-product-intelligence-lazada/references/task-breakdown.md`

Expected Modify now: none outside this planning directory.

Expected Not Modified: all production source, migrations, lockfiles, deployment files, existing task packages, and POC artifacts.

## 11. Runtime Behavior

Planning target only. After every gate, approved configuration loads; daily Asia/Jakarta run selects at most 3 fixed keywords; collector validates public page readiness and DOM; bounded retries handle transient render failure; valid cards normalize with raw/provenance values; product identity/current metadata upserts; immutable snapshots append idempotently; separate approved trend calculation runs; API serves authorized data; CMS labels freshness and approximation. Failure records sanitized status, preserves history, and marks stale. No run starts while approval gate is incomplete.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
|---|---|---|
| Legal/data/production gate incomplete | No production task runnable; source disabled | Human approval required |
| Login/CAPTCHA/block/private signal | Stop run; no bypass; sanitized blocked status | Preserve prior snapshot; escalate policy review |
| Zero-card shell | Do not classify as valid empty; bounded retry after readiness check | Failed run if checks remain invalid |
| Valid empty result | Readiness and DOM checks pass; minimum card structure confirms empty | Mark successful empty separately from failure |
| Missing required card ID/title/URL | Reject malformed card or whole run per approved threshold | No partial false success; record validation counts |
| Missing optional field | Store null, not zero or inferred value | Preserve raw if permitted |
| Duplicate card IDs | Deduplicate by source identity; record duplicate count | Never create duplicate product identity |
| Selector drift | Validation fails safely; no silent remap | Alert/diagnostic fixture review |
| Timeout/render incomplete | Bounded retry; then failed/stale run | No deletion of history |
| Price/raw sold/review/rank change | Store each separately | No sales/demand/rank inference |
| API unauthorized | Existing 401/403 convention | Backend remains authorization source |

## 13. Security Requirements

Legal approval governs collection. No auth bypass, CAPTCHA bypass, private data, personal data, token extraction, SSRF, arbitrary URL input, proxy rotation, or rate-limit evasion. Secrets stay in approved runtime secret storage. Validate DOM/provider data at trust boundary. Redact credentials, cookies, headers, raw payloads, and private data. Enforce backend RBAC and bounded filters. Do not claim tenant isolation.

## 14. Test Requirements

- Happy Path: fixture with 40 valid cards; 3-keyword harness reaches approximately 120/day; stable IDs and provenance persist.
- Validation: malformed/missing ID, title, URL; unavailable optional fields; redirect/final URL; duplicate IDs; raw abbreviated sold display.
- Negative / Failure: zero-card shell, valid empty result, timeout, incomplete render, selector drift, login/CAPTCHA/block signal, rate limit, retry exhaustion, duplicate run, DB failure.
- Security: no credentials/raw payloads in logs or artifacts; no arbitrary URL; stop-on-private/auth/policy signal; RBAC denial.
- Regression: existing API/CMS/queue tests unaffected; no source files changed by planning task.
- Isolation: disposable fixtures, fixed 3 keywords, deterministic run key, isolated data, repeatable multi-day runs, deterministic cleanup of diagnostics.

## 15. Task-Level Expected Results

- Successor planning package exists at exact path.
- Legal/data/production gate explicitly blocks implementation.
- Contract separates raw, normalized, approximate, null, and provenance data.
- Retention classes distinguish current identity, immutable history, raw values, diagnostics, and logs.
- Harness proves multi-day reliability signals before production approval.
- Zero-card handling distinguishes transient failure from valid empty.
- Architecture preserves Lazada parsing isolation and separate TrendMetrics.
- Implementation work is decomposed without dispatching runnable implementation cards.

## 16. Acceptance Criteria

- [ ] Legal review covers public page, fields, frequency, request estimate, auth, personal/private data, internal purpose, retention, and compliance; status says `HUMAN LEGAL REVIEW REQUIRED`.
- [ ] Contract lists required/nullable fields, raw values, normalized values, `isApproximation`, provenance, validation, and no-invention rules.
- [ ] Retention contract separates all five required data classes.
- [ ] Harness defines 3 fixed keywords, first page only, approximately 120/day, ID stability, fields, duplicates, zero-card vs valid zero, duration, add/remove, and separate price/raw sold/review/rank changes.
- [ ] Zero-card proposal defines readiness/DOM signals, minimum checks, timeout/render state, bounded retry, valid-empty distinction, failed-run behavior, and stale handling.
- [ ] Flow exactly preserves `ResearchKeyword -> MarketplaceCollector -> LazadaCollector -> NormalizedObservation -> MarketplaceProduct -> ProductSnapshot -> separate TrendMetrics -> API -> CMS`.
- [ ] Breakdown covers collector infrastructure, Lazada collector, DB/schema, snapshots, scheduling/queue, reliability/retry, trend calculation, API, Research Keywords, Product Research, Trending Products, and Trend Explorer.
- [ ] Shopee/TikTok and Design Inspiration/AI Brief remain out of scope.
- [ ] No production implementation or unrelated dirty work changes.
- [ ] `git diff --check` passes; changed-file review proves planning-only changes.

## 17. Anti-Slop Requirements

Code Anti-Slop: manual planning review checks no speculative provider support, invented metrics, duplicate ownership, fake approval, hidden TODO/FIXME/HACK, secrets, or production files. UI Anti-Slop: not applicable; no UI implementation. Visual Verification: not applicable; planning only.

## 18. Validation Requirements

Static: inspect exact new paths, internal consistency, secret absence, `git diff --check`, `git status --short`, and diff changed-file list.

Automated Tests: not applicable; no production implementation.

Build/Database/UI: not applicable; no source, migration, API, queue, or UI changed.

Anti-Slop: manual evidence/scope/approval/dependency review.

## 19. Completion Evidence

- New package files at `tasks/ba/43-product-intelligence-lazada/`.
- POC references reviewed and cited.
- Human gate card ID recorded in Kanban handoff.
- `git diff --check` clean.
- Changed-file review confirms only new planning files changed by this task; unrelated pre-existing changes preserved.

## 20. Traceability

Not applicable — project has no traceability ID system.

## 21. Open Points

- Lazada terms/legal permission, permitted fields, retention, and compliance: human legal review required.
- Whether any authentication or credential is permitted/needed for approved public collection.
- Exact request estimate, timeout, retry, diagnostic TTL, and alert channel.
- Minimum valid-card threshold and exact valid-empty definition.
- Exact DB names, FK delete behavior, TrendMetrics formula/version, API paths, and permission mapping.
- Production approval after harness evidence.

## 22. Definition Of Done

- [ ] All acceptance criteria documented and internally consistent.
- [ ] Legal/data/production gates explicit.
- [ ] POC evidence bounded; no unsupported claim.
- [ ] Implementation breakdown dependency-ordered and not dispatched.
- [ ] Anti-Slop review complete.
- [ ] `git diff --check` passes.
- [ ] Changed-file/status review confirms planning-only diff and no secret exposure.
