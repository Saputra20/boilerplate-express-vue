# Marketplace public scraping POC comparison

Date: 2026-10-04 (UTC)
Keyword: `baju one set bahan rayon`
Scope: Shopee Indonesia, TikTok Shop Indonesia, Lazada Indonesia

## Decision summary

| Marketplace | Status | Safe public product count | Target 20–50 | Daily public scraping recommendation |
|---|---|---:|---|---|
| Shopee Indonesia | BLOCKED — NOT FEASIBLE USING SAFE PUBLIC SCRAPING | 0 | Not met | Do not pursue through tested public route |
| TikTok Shop Indonesia | BLOCKED — NOT FEASIBLE USING SAFE PUBLIC SCRAPING | 0 | Not met | Do not pursue through tested public route |
| Lazada Indonesia | PASS — first-page POC feasible with field limits | 40 | Met | Conditional; listing fields only, conservative operations |

## Evidence comparison

### Shopee Indonesia

- URL: `https://shopee.co.id/search?keyword=baju%20one%20set%20bahan%20rayon`
- Static HTTP first: `200`, JavaScript shell, no product cards or usable product state.
- Ordinary browser rendering: unavailable page with Indonesian login prompt.
- No login, CAPTCHA, bypass, or private endpoint attempt.
- Evidence: `data/scraping-poc/shopee-feasibility.md`.

### TikTok Shop Indonesia

- URL: `https://shop.tiktok.com/id/search?q=baju%20one%20set%20bahan%20rayon`
- Static HTTP first: `404 Not Found`, 144-byte `TLB` response.
- Ordinary browser rendering: `404 Not Found`, `TLB`, zero products.
- Additional public Tokopedia discovery attempt ended with `ERR_HTTP2_PROTOCOL_ERROR`; no retry or bypass.
- No login, CAPTCHA, bypass, or private endpoint attempt.
- Evidence: `data/scraping-poc/tiktok-shop-feasibility.md`.

### Lazada Indonesia

- URL: `https://www.lazada.co.id/catalog/?q=baju%20one%20set%20bahan%20rayon`
- Static HTTP first: `200`, application shell and search scripts; product cards needed ordinary browser rendering.
- Ordinary browser rendering: 40 product cards, no login wall or CAPTCHA.
- Reliable public card fields: product ID, title, product URL, displayed price, raw sold display, review count, location, rank.
- Unavailable/unreliable in inspected card surface: rating, original price, stable remote image URL, shop name, category.
- No private endpoint was called or reverse-engineered.
- Evidence: `data/scraping-poc/lazada-feasibility.md`.

## Normalized contract outcome

Requested fields were assessed for each marketplace:

`marketplace`, `externalProductId`, `title`, `productUrl`, `imageUrl`, `price`, `originalPrice`, `soldCount`, `rating`, `reviewCount`, `shopName`, `location`, `category`, `keyword`, `searchRank`, `collectedAt`.

- Shopee and TikTok Shop: all product fields unavailable because no public products were returned.
- Lazada: ID, title, URL, price, raw sold display, review count, location, keyword, rank, and collection timestamp available for the tested first page; remaining fields remain unavailable/null.
- No metric was invented. `3.0K sold` remains raw/approximate and must not be converted to exact `3000`.

## Final recommendation and approval gate

Stop POCs here. Do not change production architecture or switch to official APIs from this task. Request human approval before any next step.

If approved, only Lazada warrants a narrowly scoped follow-up feasibility task for public first-page listing collection. That task must define terms/permission review, rate limits, caching, selector drift handling, null fields, raw sold-value provenance, and daily stability validation. Shopee and TikTok Shop require an explicitly approved eligible official/affiliate/partner access path before further work.

No production readiness is claimed.

## Repository safety

Only evidence artifacts under `data/scraping-poc/` were created by this task. Existing unrelated working-tree changes were preserved.
