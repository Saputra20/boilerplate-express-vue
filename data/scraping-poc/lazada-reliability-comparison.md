# Lazada Indonesia reliability comparison

Date: 2026-10-04 UTC
Marketplace: Lazada Indonesia
Keywords: `baju one set bahan rayon`, `setelan wanita rayon`, `kulot wanita rayon`

## Access boundary

- Static HTTP first. Three public requests returned HTTP `200`; no login required.
- Static responses were application shells. Product cards required ordinary browser rendering.
- Browser rendered 40 cards per tested page for all three keywords in the successful pagination run.
- One ordinary browser attempt for `baju one set bahan rayon` returned a shell with zero cards and no product text. No retry bypass or alternate technique used at that point. Later ordinary navigation succeeded. This is recorded as a transient rendering failure, not hidden.
- No login, user cookies, CAPTCHA handling, anti-bot bypass, private endpoint, token extraction, fingerprint spoofing, proxy rotation, or rate-limit evasion.
- No production collector or source code created.

## Test A — keyword field reliability

| Keyword | Products found | Unique IDs | Duplicate IDs | Missing ID | Missing title | Missing price | Missing raw sold | Missing review | Missing location | Missing URL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `baju one set bahan rayon` | 40 | 40 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `setelan wanita rayon` | 40 | 40 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `kulot wanita rayon` | 40 | 40 | 0 | 0 | 0 | 0 | 3 | 1 | 0 | 0 |
| **Total** | **120** | **120** | **0** | **0** | **0** | **0** | **3** | **1** | **0** | **0** |

Field availability across 120 first-page cards:

| Field | Available | Availability |
|---|---:|---:|
| `externalProductId` | 120 | 100.0% |
| `title` | 120 | 100.0% |
| `price` | 120 | 100.0% |
| `productUrl` | 120 | 100.0% |
| `rawSoldCount` | 117 | 97.5% |
| `reviewCount` | 119 | 99.2% |
| `location` | 120 | 100.0% |
| `rating` | not exposed reliably | unavailable |
| `originalPrice` | not exposed reliably | unavailable |
| `imageUrl` | not asserted stable | unavailable |
| `shopName` | not exposed reliably | unavailable |
| `category` | not exposed reliably | unavailable |

Duplicate rate: `0 / 120 = 0.0%` within each first-page collection. Raw values remain raw, for example `3.0K sold`, `2.8K sold`, and `5.2K sold`; no exact integer conversion or sales inference.

Raw sample artifact: `data/scraping-poc/lazada-reliability-raw-samples.json`.

## Test B — pagination, maximum three pages

| Keyword | Page 1 | Page 2 | Page 3 | Unique IDs/page | Cross-page duplicate IDs | Pagination result |
|---|---:|---:|---:|---|---:|---|
| `baju one set bahan rayon` | 40 | 40 | 40 | 40/40/40 | 0 | stable in tested run |
| `setelan wanita rayon` | 40 | 40 | 40 | 40/40/40 | 0 | stable in tested run |
| `kulot wanita rayon` | 40 | 40 | 40 | 40/40/40 | 0 | stable in tested run |

Search rank is deterministic within each captured page: DOM card order became `searchRank` 1–40. No ranking movement occurred during the same run. Pagination did not become blocked, so first-page-only behavior was not forced by this run. This does not prove long-term pagination stability.

Observed static HTTP redirects:

- `baju one set bahan rayon` stayed on `/catalog/`.
- `setelan wanita rayon` redirected to `/tag/setelan-wanita-rayon/`.
- `kulot wanita rayon` redirected to `/tag/kulot-wanita-rayon/`.

Collector must store final URL and keyword. It must not assume all search terms use the same route shape.

## Test C — repeat collection

Repeated `baju one set bahan rayon` first-page collection twice, with a 15-second separation between successful collections. Both successful collections returned 40 cards.

| Metric | Result |
|---|---:|
| First successful run products | 40 |
| Second successful run products | 40 |
| ID overlap | 40/40 (100%) |
| Added IDs | 0 |
| Removed IDs | 0 |
| Rank changes | 0 |
| Price changes | 0 |
| Raw sold display changes | 0 |
| Review count changes | 0 |
| `externalProductId` stability | stable for all 40 overlapping records |

A prior initial browser render returned zero cards before later success. This counts as one observed transient render failure in the session; it is not treated as product removal and no sales/rank conclusion is drawn from it.

Observed sold values, rank, price, and review changes stay separate. No observed sold movement occurred. Search rank is not sales growth.

## Anti-bot and operational observations

- Static HTTP: 3/3 keyword requests returned `200`; request durations were approximately 0.108s, 0.199s, and 0.159s.
- Ordinary browser: successful pages showed no login wall or CAPTCHA; one transient zero-card shell occurred.
- Pagination: 9/9 tested pages rendered 40 cards; no page 2/3 block.
- Low-volume session: 3 static requests plus ordinary browser page loads, with delays between navigation. This is not a quota or anti-bot limit test.
- Public locale cookies appeared in static response headers in earlier feasibility work. They were not reused or retained as evidence.
- Markup and client-side rendering remain maintenance risks. Selectors, route redirects, lazy loading, locale behavior, and controls can change.

## Once-daily reliability assessment

Once-daily collection is **conditionally viable only for public listing fields** under conservative volume, caching, bounded retries, selector drift monitoring, and explicit null handling. This session proves only a low-volume same-day sample and short-interval repeat. It does not prove day-over-day reliability, historical accuracy, terms permission, quota, or production readiness.

Recommended safe collection volume for next planning: one first-page collection per keyword per day, three keywords, 40 cards each (maximum 120 records/day before deduplication), with page 2/3 disabled by default. Expand only after written approval and longer stability evidence. Do not schedule this work from this POC.

## Maintenance risks

1. Client-side page means static HTTP alone does not expose records.
2. Search terms can redirect to different public routes.
3. One transient zero-card browser shell occurred.
4. Card markup and `data-item-id`/text selectors may drift.
5. Sold displays can be abbreviated and absent; preserve raw value and null.
6. Rating, original price, image URL, shop, and category were not reliable from card surface.
7. Search ordering can change independently of sales; never infer sales from rank.
8. No official API permission, quota, retention, or legal/terms approval was established here.

## Recommendation

**GO — Lazada MVP**

Meaning: candidate for next planning only, not production approval. Scope recommendation: first-page-only public listing collection, three approved keywords, conservative once-daily volume, raw field provenance, null fields, final URL capture, selector drift monitoring, bounded retry, and stop-on-block behavior. Do not add a production `MarketplaceCollector` or `LazadaCollector` yet.

Proposed planning tasks:

1. Human/legal review of Lazada public-access terms, permitted fields, retention, and operational limits.
2. Define first-page-only data contract and field-null/raw-value rules, including `rawSoldCount` and `isApproximation` if any future normalization is approved.
3. Design a disposable reliability harness with cached fixtures, selector-drift alarms, and stop-on-login/CAPTCHA/block behavior.
4. Run multi-day once-daily validation before any production implementation decision.
5. After approval only, plan production boundary `MarketplaceCollector` / `LazadaCollector`; no scheduler, queue, DB, API, CMS, trend, AI, or Design Inspiration work belongs here.

## Repository safety

Only POC artifacts under `data/scraping-poc/` were added in this task. Existing unrelated working-tree changes were preserved. No production source was changed.
