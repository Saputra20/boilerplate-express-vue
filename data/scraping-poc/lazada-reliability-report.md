# Lazada Indonesia public collection reliability report

Date: 2026-10-04 UTC
Status: GO — Lazada MVP candidate for planning only

## Scope

Three independent public search keywords tested:

- `baju one set bahan rayon`
- `setelan wanita rayon`
- `kulot wanita rayon`

Static HTTP ran first. Ordinary browser rendering inspected public cards. No login, cookies, CAPTCHA handling, anti-bot bypass, private endpoint/token extraction, fingerprint spoofing, proxy rotation, or rate-limit evasion.

## Result

- Static HTTP: 3/3 keyword requests returned `200`.
- Browser pagination: 9/9 tested pages returned 40 cards.
- First-page total: 120 cards.
- First-page unique IDs: 120/120.
- Within-page duplicate rate: 0/120 (0.0%).
- Cross-page duplicate IDs: 0 across each keyword's pages 1–3.
- First-page stable fields: ID, title, price, product URL, location: 100.0% available.
- `rawSoldCount`: 117/120 (97.5%) available.
- `reviewCount`: 119/120 (99.2%) available.
- Rating, original price, stable image URL, shop name, category: unavailable or unreliable from card surface.

## Repeat reliability

Same keyword `baju one set bahan rayon` collected twice successfully with 15 seconds between collections:

- 40 products in each run.
- ID overlap: 40/40.
- Added/removed IDs: 0/0.
- Rank changes: 0.
- Price changes: 0.
- Raw sold-display changes: 0.
- Review-count changes: 0.
- `externalProductId` stable for all overlapping records.

One earlier ordinary browser render returned a public shell with zero cards. Later normal navigation succeeded. This is recorded as transient rendering failure; no bypass or private technique used.

## Data rules

- Preserve values exactly, such as `rawSoldCount: "3.0K sold"`.
- Never convert abbreviated displays into exact sales counts.
- Keep raw sold display, search rank, price, and review count as separate observations.
- Rank movement never means sales growth.
- Missing fields stay null/unavailable.

## Reliability boundary

Once-daily collection is conditionally viable for public listing fields only. Next planning scope: one first-page collection per keyword per day, three keywords, maximum 120 cards/day before deduplication, caching, bounded retries, selector monitoring, and stop-on-login/CAPTCHA/block behavior. Page 2/3 should stay out of MVP until multi-day evidence exists.

This POC does not establish API permission, terms approval, quotas, retention, day-over-day stability, or production readiness.

## Maintenance risks

Client-side rendering, route redirects, lazy loading, locale behavior, selector drift, abbreviated/absent sold values, and transient zero-card shells can break collection. Search ordering can change independently of sales. No production collector, scheduler, queue, DB, API, CMS, trend engine, AI, or Design Inspiration work was done.

## Next planning tasks

1. Human/legal review of public-access terms, permitted fields, retention, and limits.
2. Approve first-page-only raw/null data contract.
3. Plan disposable cached-fixture reliability harness and selector-drift alarms.
4. Run multi-day once-daily validation.
5. Only after approval, plan `MarketplaceCollector` / `LazadaCollector` boundary.

Detailed metrics and public samples: `data/scraping-poc/lazada-reliability-comparison.md` and `data/scraping-poc/lazada-reliability-raw-samples.json`.
