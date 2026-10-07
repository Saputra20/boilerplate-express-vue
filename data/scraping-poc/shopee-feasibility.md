# Shopee public scraping feasibility POC

Date: 2026-10-04T02:58:42Z (UTC)
Keyword: `baju one set bahan rayon`
Marketplace: Shopee Indonesia
Status: BLOCKED — NOT FEASIBLE USING SAFE PUBLIC SCRAPING

## Scope and guardrails

- Public search page only.
- Static HTTP first, then ordinary browser rendering.
- No login, user cookies, CAPTCHA handling, anti-bot bypass, private endpoint, token reverse engineering, fingerprint spoofing, proxy rotation, or rate-limit evasion.
- No production source, schema, route, queue, scheduler, credential, or marketplace integration changed.

## Evidence

### Static HTTP

Command used:

`curl -L --max-time 20 -A 'Mozilla/5.0 (compatible; SafialFeasibilityPOC/1.0)' -sS -D shopee.headers -o shopee.html 'https://shopee.co.id/search?keyword=baju%20one%20set%20bahan%20rayon'`

Observed response:

- HTTP status: `200`
- Final URL: `https://shopee.co.id/search?keyword=baju%20one%20set%20bahan%20rayon`
- Content type: `text/html; charset=utf-8`
- Body size: `198118` bytes
- Server: `SGW`
- `cache-control: no-cache`
- HTML contained an empty application mount (`<div id="main"></div>`) and JavaScript asset loaders.
- Static HTML contained no product cards, JSON-LD product list, or usable serialized search result collection.
- Static HTML also contained runtime configuration; raw response was not preserved as a task artifact to avoid retaining unnecessary configuration values.

### Browser rendering

URL opened in clean browser session with no login, cookies, or user session:

`https://shopee.co.id/search?keyword=baju%20one%20set%20bahan%20rayon`

Observed page title:

`🐴 Shopee Indonesia | Situs Belanja Online Terlengkap & Terpercaya`

Observed body text:

- `Halaman Tidak Tersedia`
- `Maaf, telah terjadi kesalahan. Silakan log in dan coba lagi atau kembali ke Halaman Utama.`
- `Log In`
- `Kembali ke Halaman Utama`

The rendered page exposed no product results. It requested login to recover from the unavailable-page response. No CAPTCHA was observed. No attempt was made to log in or bypass the response.

## Result

| Evidence item | Result |
|---|---|
| Search URL reachable | PASS at HTTP transport level; `200` response |
| Search usable as public product page | FAIL |
| JavaScript required | YES; static response is application shell |
| Login required for usable result | YES, according to rendered page |
| CAPTCHA observed | NO |
| Safe public product count | `0` |
| Target 20–50 products | NOT MET |
| Five sample products | UNAVAILABLE |
| Pagination/infinite scroll | NOT ATTEMPTED after unusable first page |
| Product fields | ALL UNAVAILABLE |
| Duplicate/malformed price checks | NOT APPLICABLE; no products |
| Missing sold/rating checks | NOT APPLICABLE; no products |

No raw product sample is included because no product was returned. No credentials, cookies, tokens, or raw runtime configuration are included.

## Reliability

Low for product collection. HTTP reachability is confirmed by one static request, but the response is only a JavaScript shell. Browser rendering confirms the public search route is unusable in this clean session and presents an unavailable/login response. This does not prove all Shopee access paths fail; it proves this safe public path cannot produce evidence for the requested collection.

## Recommended architecture and normalized contract

Do not implement a Shopee scraper from this result. If a provider is approved later, keep provider details behind an isolated collector boundary and use an official, affiliate, or partner API only. Suggested boundary:

`MarketplaceCollector.collect(input) -> normalized observations + provenance`

The normalized observation contract remains:

- `marketplace`
- `externalProductId`
- `title`
- `productUrl`
- `imageUrl`
- `price`
- `originalPrice`
- `soldCount` (raw display plus approximation marker when provider displays values such as `10K+`; never exactify)
- `rating`
- `reviewCount`
- `shopName`
- `location`
- `category`
- `keyword`
- `searchRank`
- `collectedAt`

Missing provider fields remain unavailable/null. No inferred rank, sales, popularity, or demand metric is allowed. Historical snapshot DB proposal remains unimplemented.

## Recommendation

Daily Shopee collection is not worth pursuing through this safe public scraping path. Stop Shopee investigation here. Re-open only after written approval identifies an eligible official/affiliate/partner access path, permitted Indonesia fields, quotas, terms, credential owner, and historical/snapshot support. Do not silently switch to TikTok Shop or Lazada in this task.

## Approvals needed

- Written selection of one eligible provider/API for Indonesia.
- Provider/account permission and credential ownership confirmation.
- Confirmation that requested fields are permitted and available.
- Rate-limit, terms, retention, and operational-cost approval.

## Repository safety evidence

POC artifact only. No production source was changed. Existing unrelated working-tree changes were preserved.
