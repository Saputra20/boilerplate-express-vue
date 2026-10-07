# Lazada Implementation Task Breakdown

Planning labels only. Every card remains blocked/todo behind one human gate covering legal, data contract, reliability evidence, and production approval. Do not dispatch from this planning task.

## Gate

`G0 — Human legal/data/production approval`: public-page terms, permitted fields, frequency/request estimate, auth/private-data boundary, internal purpose, retention/compliance, raw/normalized contract, harness evidence, zero-card policy, TrendMetrics policy, API/RBAC, and production go/no-go.

Dependency root: every implementation card depends on G0.

## Backend sequence

| Order | Task | Depends on | Output |
|---:|---|---|---|
| B1 | Collector infrastructure contract | G0 | bounded run identity, provenance envelope, typed errors, stop-on-policy signals |
| B2 | Lazada collector | B1 | isolated first-page DOM parser, readiness, final URL, raw fields, null handling |
| B3 | DB/schema design and Drizzle UP/DOWN | G0 | ResearchKeyword, MarketplaceProduct, CollectionRun, ProductSnapshot, TrendMetrics schema; rollback proof |
| B4 | Snapshot persistence | B3, B2 | idempotent immutable daily snapshots; current metadata update; failed-run preservation |
| B5 | Scheduling/queue worker | B1, B3, B4 | daily Asia/Jakarta target, bounded retry/timeout/backoff, sanitized logs |
| B6 | Reliability/retry validation | B2, B5 | fixture tests for zero-card, valid empty, drift, timeout, block, duplicates, stale state |
| B7 | Trend calculation | B4, G0 | only approved formula/version; no rank-as-trend; separate TrendMetrics |
| B8 | API/OpenAPI and permissions | B3, B4, B7, existing API/RBAC | authorized Research Keywords, Product Research, Trending Products, Trend Explorer contracts |
| B9 | Backend verification/reviewer | B1-B8 | security, migration, API, queue, anti-slop, and regression evidence |

## Frontend sequence

| Order | Task | Depends on | Output |
|---:|---|---|---|
| F1 | CMS Research Keywords | B8 | dedicated keyword management page with approved permissions and states |
| F2 | CMS Product Research | B8 | product observations/current metadata, raw-vs-normalized display, freshness/stale/error states |
| F3 | CMS Trending Products | B8, B7 | approved TrendMetrics only; no fabricated values or rank trend |
| F4 | CMS Trend Explorer | B8, B7 | bounded date/source/keyword exploration and explicit metric definitions |
| F5 | Frontend accessibility/responsive/browser verification | F1-F4 | keyboard/focus/mobile/overflow/state evidence |
| F6 | Frontend reviewer and QA | F5, B9 | reviewed release evidence and existing regression pass |

## Dependency graph

`G0 -> B1 -> B2`

`G0 -> B3 -> B4 -> B5 -> B6`

`B4 + G0 -> B7`

`B3 + B4 + B7 + existing RBAC -> B8 -> F1/F2/F3/F4 -> F5 -> F6`

`B9` depends on B1-B8. `F6` depends on B9 and F5. Release remains blocked until both reviewers and QA approve.

## Explicit exclusions

No Shopee, TikTok, page 2/3, private/authenticated marketplace data, scraper bypass, production AI, Design Inspiration, AI Brief, recommendations, forecasting, exports, alerts, public API, or tenant model.
