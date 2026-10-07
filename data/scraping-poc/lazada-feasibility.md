# Lazada Indonesia public scraping feasibility POC

Date: 2026-10-04T03:08:16Z (UTC)
Keyword: `baju one set bahan rayon`
Marketplace: Lazada Indonesia
Status: PASS — public first-page collection feasible, with field limitations

## Scope and guardrails

- Public catalog/search page only.
- Static HTTP first, then ordinary browser rendering because the static response is an application shell and product cards are rendered client-side.
- One small page/batch tested: 40 product cards; no extra page requests needed.
- No login, user cookies/session reuse, CAPTCHA handling, anti-bot bypass, private endpoint, token extraction, fingerprint spoofing, proxy rotation, or rate-limit evasion.
- No production source, schema, route, queue, scheduler, credential, or marketplace integration changed.

## Evidence

### Public search URL

`https://www.lazada.co.id/catalog/?q=baju%20one%20set%20bahan%20rayon`

### Static HTTP first

Command used:

`curl -L --max-time 25 -A 'Mozilla/5.0 (compatible; SafialFeasibilityPOC/1.0)' -sS -D lazada.headers -o lazada.html 'https://www.lazada.co.id/catalog/?q=baju%20one%20set%20bahan%20rayon'`

Observed response:

- HTTP status: `200`
- Content type: `text/html; charset=utf-8`
- Body size: `61702` bytes.
- Final URL remained the requested Lazada catalog URL.
- Static response contained page metadata and application scripts, including the Lazada search frontend asset.
- Product cards were not treated as static evidence; ordinary browser rendering was required to inspect rendered cards.
- Response headers set public locale cookies (`hng`, `hng.sig`). These were not reused across requests or retained as evidence.

### Ordinary browser rendering

Clean browser session, no login, cookies, or user session:

`https://www.lazada.co.id/catalog/?q=baju%20one%20set%20bahan%20rayon`

Observed page:

- Title: `baju one set bahan rayon - Membeli baju one set bahan rayon Harga Terbaik di Indonesia | www.lazada.co.id`
- Rendered product cards: `40`
- Search page exposed `data-qa-locator="product-item"`, `data-item-id`, product links, image elements, title text, price, sold display, review count, and location.
- No login wall or CAPTCHA was observed.
- No private endpoint was called or reverse-engineered. The browser's normal public rendering was used only.

## Five public samples

Values below are transcribed from rendered public cards. `originalPrice`, `shopName`, `category`, and a stable remote `imageUrl` were not exposed reliably in the inspected card surface and remain unavailable. `soldCount` preserves the displayed value; `3.0K sold` is not converted to an exact integer.

| Rank | externalProductId | title | productUrl | price | originalPrice | soldCount (raw) | rating | reviewCount | location |
|---:|---|---|---|---:|---|---|---|---:|---|
| 1 | `18859608699` | Tania Women's Suit Rayon Mix Premium Striped Cotton Blouse Culottes Busui Friendly Oneset Jumbo Contemporary 2026 | https://www.lazada.co.id/products/pdp-i18859608699.html | `Rp72.800` | unavailable | `36 sold` | unavailable | 28 | Kab. Cirebon |
| 2 | `18888583444` | One Set New Motif Premium Rayon Rubber Sleeves Jumbo Culot Pants Recent Set | https://www.lazada.co.id/products/pdp-i18888583444.html | `Rp24.500` | unavailable | `174 sold` | unavailable | 64 | Kab. Cirebon |
| 3 | `18884471078` | Adult Jumbo Kriwil Set Full Buttons Premium Rayon Material Women's Culot Pants Soft, Smooth, Lightweight Clothes | https://www.lazada.co.id/products/pdp-i18884471078.html | `Rp24.500` | unavailable | `237 sold` | unavailable | 82 | Kab. Cirebon |
| 4 | `8621120811` | Queen Motif Set, Rayon Material, Really Cool, Cool and Comfortable | https://www.lazada.co.id/products/pdp-i8621120811.html | `Rp95.000` | unavailable | `3.0K sold` | unavailable | 1061 | Kab. Pekalongan |
| 5 | `18886823799` | Lauria Set for Adult Women's Jumbo Pajamas, Premium Rayon Material, Latest Trendy Setcel | https://www.lazada.co.id/products/pdp-i18886823799.html | `Rp24.500` | unavailable | `72 sold` | unavailable | 40 | Kab. Cirebon |

Normalized per-record values:

- `marketplace`: `lazada-id`
- `keyword`: `baju one set bahan rayon`
- `searchRank`: 1–40 from rendered card order
- `collectedAt`: `2026-10-04T03:08:16Z`
- `externalProductId`, `title`, `productUrl`, `price`, `reviewCount`, `location`: available for inspected cards.
- `soldCount`: available as raw display; do not exactify abbreviated values.
- `rating`, `originalPrice`, `imageUrl`, `shopName`, `category`: unavailable or unreliable from this public card surface.

## Quality checks

- Product count: `40` (within requested 20–50 target).
- Duplicate IDs: none in 40 cards.
- Missing IDs: `0`.
- Missing titles: `0`.
- Missing product URLs: `0`.
- Malformed/missing displayed price: `0` in 40 cards; all inspected cards had `Rp` price text.
- Missing sold display or review count: `0` in 40 cards.
- Rating field: unavailable, not substituted with review count.
- Original price: unavailable; discount text was present on cards but not promoted to `originalPrice`.
- Sold values: raw display preserved; values such as `3.0K sold` remain approximations, not exact counts.
- Image field: rendered `img` used a data placeholder in inspected DOM; no stable remote `imageUrl` was asserted.
- Seller/shop, category: not reliably exposed in inspected card surface.
- Login requirement: none observed.
- CAPTCHA/anti-bot: none observed.

## Reliability and maintenance risk

Reliability for first-page public search: medium-high for the tested session. HTTP transport returned `200`; ordinary browser rendering exposed 40 product cards and the requested keyword produced relevant rayon-set listings. Reliability is lower for fields absent from cards and for long-term automation because markup, lazy loading, locale behavior, and anti-bot controls can change.

Maintenance risk: medium-high. The page depends on client-side rendering and marketplace markup selectors. A production collector would need selector drift monitoring, bounded retries, no bypass behavior, and explicit null handling for missing fields. This POC does not prove multi-page, historical, detail-page, or daily stability.

## Recommendation

Lazada Indonesia is feasible for a narrowly scoped safe public first-page POC. Daily collection may be viable only for public listing fields with conservative request limits, caching, selector monitoring, and raw-value provenance. Do not claim complete normalized records: preserve unavailable fields as null and preserve abbreviated sold displays without exactification.

No production collector, scheduler, queue, schema, API, or CMS work is approved by this result.

## Repository safety evidence

POC artifact only. No production source was changed. Existing unrelated working-tree changes were preserved.
