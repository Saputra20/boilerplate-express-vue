# TikTok Shop Indonesia public scraping feasibility POC

Date: 2026-10-04T03:08:15Z (UTC)
Keyword: `baju one set bahan rayon`
Marketplace: TikTok Shop Indonesia
Status: BLOCKED — NOT FEASIBLE USING SAFE PUBLIC SCRAPING

## Scope and guardrails

- Public search/discovery pages only.
- Static HTTP first, then ordinary browser rendering.
- No login, user cookies, CAPTCHA handling, anti-bot bypass, private endpoint, token extraction, fingerprint spoofing, proxy rotation, or rate-limit evasion.
- No production source, schema, route, queue, scheduler, credential, or marketplace integration changed.

## Evidence

### Public discovery URL

`https://shop.tiktok.com/id/search?q=baju%20one%20set%20bahan%20rayon`

The Indonesia storefront search route was tested directly. A separate ordinary public discovery attempt against the current Indonesia commerce route was also tested:

`https://www.tokopedia.com/search?st=product&q=baju%20one%20set%20bahan%20rayon`

Search was not redirected into a usable public product result page.

### Static HTTP first

Command used:

`curl -L --max-time 25 -A 'Mozilla/5.0 (compatible; SafialFeasibilityPOC/1.0)' -sS -D tiktok.headers -o tiktok.html 'https://shop.tiktok.com/id/search?q=baju%20one%20set%20bahan%20rayon'`

Observed response:

- HTTP status: `404`
- Content type: `text/html`
- Body size: `144` bytes.
- Body title: `404 Not Found`.
- Server: `TLB`.
- No product cards, JSON-LD product list, or usable public serialized search collection.
- No login or CAPTCHA was observed in this response.

### Ordinary browser rendering

Clean browser session, no login, cookies, or user session:

`https://shop.tiktok.com/id/search?q=baju%20one%20set%20bahan%20rayon`

Observed page:

- Title: `🐴 404 Not Found`
- Body: `404 Not Found`, `TLB`
- Product count: `0`

A browser attempt against Tokopedia's public search URL ended at `chrome-error://chromewebdata/` with `ERR_HTTP2_PROTOCOL_ERROR`, without product results. No retry, bypass, or private endpoint was attempted.

## Result

| Evidence item | Result |
|---|---|
| Public search URL transport reachable | FAIL; HTTP `404` |
| Public search usable as product page | FAIL |
| Static HTML contains products | FAIL |
| JSON-LD / public serialized product state | UNAVAILABLE |
| Ordinary browser rendering produces products | FAIL |
| Login required | NOT OBSERVED; route failed before login surface |
| CAPTCHA / anti-bot challenge | NOT OBSERVED |
| Safe public product count | `0` |
| Target 20–50 products | NOT MET |
| Five sample products | UNAVAILABLE |
| Requested product fields | ALL UNAVAILABLE |
| Duplicate/malformed price checks | NOT APPLICABLE; no products |
| Missing sold/rating checks | NOT APPLICABLE; no products |

No raw response is preserved here because it contained no product evidence and no further retention was necessary.

## Reliability and maintenance risk

Reliability for collection: none demonstrated. One static request and one clean browser rendering both failed at public discovery. Indonesia TikTok Shop routing appears coupled to Tokopedia, but this POC did not treat third-party search snippets or scraper documentation as product evidence. Any future route change would require a new approved POC.

Maintenance risk: high. Public route behavior and regional storefront ownership are unstable; safe public evidence cannot currently establish a supported collection path.

## Normalized contract

No product observations were produced. The requested normalized fields remain unavailable: `marketplace`, `externalProductId`, `title`, `productUrl`, `imageUrl`, `price`, `originalPrice`, `soldCount`, `rating`, `reviewCount`, `shopName`, `location`, `category`, `keyword`, `searchRank`, and `collectedAt`.

No sales, rating, rank, or demand values were inferred.

## Recommendation

Do not implement a TikTok Shop scraper from this result. Mark TikTok Shop Indonesia `NOT FEASIBLE USING SAFE PUBLIC SCRAPING`. Daily collection is not viable through the tested public path. Re-open only after written approval identifies an eligible official/affiliate/partner path, permitted fields, quotas, terms, credential owner, and historical/snapshot support. Do not bypass login, CAPTCHA, anti-bot controls, or private APIs.

## Repository safety evidence

POC artifact only. No production source was changed. Existing unrelated working-tree changes were preserved.
