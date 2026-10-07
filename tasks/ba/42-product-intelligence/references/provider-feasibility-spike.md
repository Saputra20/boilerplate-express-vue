# Product Intelligence Provider Feasibility Spike

Status: recommendation only. No provider or marketplace approved.

Spike date: 2026-10-04
Authority: `references/approved-requirements.md`
Scope: Indonesia, Research Keyword, one official/affiliate/partner connector, daily snapshots.

## Executive result

Recommend TikTok Shop Affiliate Partner API as next account-validation candidate, specifically the Affiliate Partner campaign product-list path. Evidence supports Indonesia partner availability and official product-search/list access, but does not confirm Safial's partner approval, app activation, account eligibility, permitted 90-day snapshot retention, or the complete required field set. This is a conditional recommendation, not source approval.

Do not start production implementation until Saputra separately approves this candidate after account-owner validation.

## Candidate comparison

| Candidate | Indonesia evidence | Access / credential evidence | MVP fields evidenced | Quota / terms | Result |
|---|---|---|---|---|---|
| TikTok Shop Affiliate Partner API | Partner program documentation lists Indonesia among supported local-partner markets. Partner campaign product-list API is official. | Affiliate APIs are inactive by default and require partner/ISV application plus Account Manager or Partner Manager approval. Campaign product-list calls require partner access token, app key, signature, and `category_asset_cipher`. Safial credentials were not available to this spike. | Product campaign list supports product name/ID, category filtering, and campaign data. Creator open-collaboration search documents keywords, category, sales-price range, commission rate, and `units_sold`; source position/rank, ratings, and reviews were not evidenced. | Dynamic QPS. No single fixed quota. Use endpoint limits when published, smooth requests, batch, and exponential backoff with jitter. Terms and data-retention permission require account/legal confirmation. | Best candidate for validation; not approved. |
| Lazada Open Platform seller API | Official product endpoints list Indonesia endpoint `https://api.lazada.co.id/rest`. | Requires app key/app secret and seller-authorized OAuth access token. Terms say access is for approved data and seller account access after seller consent. No Safial account or credential confirmation. | `product/item/get` returns seller-authorized product item data including item ID, title/attributes, category, SKU prices, status, and timestamps. It is a single authorized seller item lookup, not evidence of marketplace-wide keyword research. Rating/reviews/position were not evidenced. | Terms allow Lazada to limit API calls. Public platform rules/search evidence indicated 1,000 calls/day or another imposed limit and API-level QPS error `901`; treat values as non-contractual until account confirmation. | Feasible only for a connected Safial-controlled seller/shop; poor fit for Research Keyword across marketplace. Not selected. |
| Shopee Affiliate | Public Indonesia affiliate pages confirm an Indonesia affiliate program, but no official public API contract for keyword product discovery, required fields, quotas, or partner credentials was verified in this spike. | No credential or API eligibility evidence. | Required MVP fields not confirmed from official API documentation. | Quotas, terms, retention, and cost not verified. | Do not select. |

## TikTok Shop evidence

1. Indonesia partner availability: [Affiliate Partner program](https://partner.tiktokshop.com/docv2/page/non-us-tiktok-shop-affiliate-partner-tap) lists Indonesia among current markets.
2. Product access: [Get Affiliate Partner Campaign Product List](https://partner.tiktokshop.com/docv2/page/get-affiliate-partner-campaign-product-list-202405) documents `GET /affiliate_partner/202405/campaigns/{campaign_id}/products`, product/campaign filters, pagination, partner access token, app key, request signature, and `category_asset_cipher`.
3. Keyword/product fields: [Creator Search Open Collaboration Product](https://partner.tiktokshop.com/docv2/page/creator-search-open-collaboration-product-202405) documents product search by keywords, category, sales-price range, commission range, and `units_sold` sort. This proves source-native availability only for that endpoint and access context; it does not prove campaign-list responses contain every field.
4. Activation gate: [Affiliate integration](https://partner.tiktokshop.com/docv2/page/affiliate-integration) says Affiliate API is inactive by default and requires application plus Account Manager or Partner Manager approval.
5. Quotas: [Rate limits](https://partner.tiktokshop.com/docv2/page/rate-limits) says capacity is dynamic by authorized-shop scale, API resource, endpoint, and platform load. It recommends smoothing, batching, caching, and exponential backoff with jitter. Published starting ranges are not guaranteed quotas.
6. Indonesia region/localization: [Regions and languages](https://partner.tiktokshop.com/docv2/page/regions-and-languages) lists Indonesia (`ID`) and `id-ID`; endpoint-specific documentation remains authoritative.
7. Developer flow: [TikTok Shop developer guide](https://partner.tiktokshop.com/docv2/page/tts-developer-guide) documents app registration, scope enablement, authorization, token exchange, and API calls.

## MVP field disposition

| Approved MVP field | TikTok evidence | Spike disposition |
|---|---|---|
| `sourceProductId` / product identity | Product-list/search docs expose product IDs. | Likely available; confirm exact response field and stability in approved account. |
| title / keyword match | Search docs expose title keywords and product names. | Confirmed for documented search endpoint. |
| category | Search docs expose category filter; Indonesia category docs exist. | Confirmed as source-native category capability; exact response shape needs account test. |
| price / currency | Search docs expose sales-price range; product API docs expose price-related product data. | Price capability evidenced; confirm currency field/locale in target endpoint. |
| source-provided position | No documented position/rank field found. | Keep null; do not infer from sort order or page position. |
| sold / `units_sold` | Creator open-collaboration search documents `units_sold` as a sort field. | Potentially available only on that endpoint/context; confirm returned field and terms before storing. |
| rating / review count | No official evidence found in reviewed endpoint documentation. | Unknown/null until explicit response-field evidence. |
| source timestamp / provenance | API requests include timestamps; response semantics and permitted provenance storage need confirmation. | Record only fields allowed by final provider terms and endpoint contract. |

No bestseller, popularity, demand, sales, rank, or trend metric may be inferred. `units_sold` is source-native only if returned by selected endpoint and permitted by provider terms.

## Credential and eligibility spike

Safial must obtain written/account-console confirmation for all items below. No secret was requested, copied, logged, or stored.

- Safial-owned TikTok Shop Partner Center account is eligible to register/service Indonesia.
- Affiliate Partner app category and required target market are available to Safial.
- Affiliate API activation is granted by the relevant manager.
- Required scopes include the selected product-list/search endpoint.
- Partner OAuth flow can issue a partner access token and the required `category_asset_cipher`.
- App key and signing credentials can live in the approved secret manager or server environment only.
- Token refresh, revocation, expiry, and rotation behavior are documented.
- Provider terms permit the Research Keyword use case and immutable 90-day daily snapshots.
- Provider terms permit retaining source product ID, title, category, price, source-native `units_sold` when returned, collection timestamp, and provenance.
- Provider terms permit internal CMS display to authorized Safial users.

Suggested secret references after approval; values must never enter this artifact:

- `TTS_APP_KEY_REF`
- `TTS_APP_SECRET_REF`
- `TTS_PARTNER_ACCESS_TOKEN_REF`
- `TTS_CATEGORY_ASSET_CIPHER_REF`

These names are placeholders for a future credential contract, not runtime configuration or approval.

## Daily snapshot feasibility

Daily collection is technically plausible for a bounded Research Keyword set: issue bounded official API searches, paginate within provider limits, normalize only returned fields, and append one immutable snapshot per `(marketplace, sourceProductId, snapshotDate)`. The provider's dynamic quota means capacity must be measured after activation; no fixed daily product count is claimed here.

Operational controls required after approval:

- fixed official API base/path, never arbitrary URLs;
- bounded keywords, categories, pages, response size, and run duration;
- per-app/per-partner and endpoint-aware throttling;
- `429`/provider throttle backoff with jitter and no bypass;
- sanitized errors and no payload/credential logging;
- idempotent daily snapshot key;
- retain prior snapshots on failed or missing runs;
- verify provider terms before applying approved 90-day retention.

## Cost and commercial evidence

No recurring API price, quota purchase, or paid access fee was published in reviewed official material. TikTok's developer article states zero listing fees for its App Store, but this does not establish partner onboarding, API, legal, hosting, or operational cost as zero. Cost remains `unconfirmed`.

Known cost categories:

- partner/app onboarding and compliance effort;
- possible commercial or account-specific terms;
- application hosting, queue, database, and 90-day snapshot storage;
- monitoring and support for dynamic throttling/provider changes;
- implementation effort for signing, OAuth/token rotation, and endpoint contract validation.

Saputra should approve budget only after TikTok confirms account-specific commercial terms and access.

## Decision

`RECOMMENDATION: TikTok Shop Affiliate Partner API — conditional candidate for account validation.`

`MARKETPLACE STATUS: unapproved.`

Evidence is sufficient to proceed with a credential/account validation conversation, not sufficient to implement a collector or declare the provider eligible. If TikTok cannot confirm access, fields, retention, and terms, keep marketplace selection open and run no production collection. Lazada remains a fallback only for a Safial-authorized connected shop. Shopee remains unverified.

## Evidence gaps requiring Saputra/provider confirmation

1. Safial account/partner registration and Indonesia eligibility.
2. Activation approval for Affiliate Partner API and exact scopes.
3. Exact response schema for selected endpoint, especially source product ID, title, category, price/currency, timestamp, and optional `units_sold`.
4. Whether keyword research may span products/campaigns not owned by Safial or requires seller/creator/partner authorization boundaries.
5. Permission to store/display fields for 90 days and immutable historical snapshots.
6. Quota values for selected endpoint, pagination ceiling, and retry guidance.
7. Commercial fees, contract, data-use restrictions, and provider change/deprecation policy.
8. Test/sandbox account availability for an Indonesia end-to-end dry run without production data collection.

## Scope and repository check

Spike changed planning evidence only. No production schema, migration, route, worker, collector, API, CMS UI, or production data collection was added.

At completion, verify with `git status --short` and `git diff --check`. Existing modified production files belong to other work and were not touched by this spike.
