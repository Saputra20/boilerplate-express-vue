# TikTok Shop Affiliate Partner Account Validation

Status: BLOCKED / NOT RUN for account and credential validation.

Validation date: 2026-10-04
Candidate: TikTok Shop Affiliate Partner API, Indonesia
Authority: `tasks/ba/42-product-intelligence/references/approved-requirements.md`

## Result

Public TikTok Shop Partner Center documentation supports this candidate as a conditional next step, but cannot prove Safial account eligibility, app activation, granted scopes, or usable credentials. No Partner Center login, console inspection, credential request, token exchange, API call, sandbox call, or production data collection was performed.

Marketplace remains unapproved. No collector, schema, migration, worker, route, CMS UI, or scraping fallback may start.

## Public evidence reviewed

| Question | Public evidence | Disposition |
|---|---|---|
| Indonesia availability | [Affiliate Partner markets](https://partner.tiktokshop.com/docv2/page/non-us-tiktok-shop-affiliate-partner-tap) lists `ID` among supported local-partner markets. | Region evidence exists; Safial eligibility is not confirmed. |
| API activation | [Affiliate integration](https://partner.tiktokshop.com/docv2/page/affiliate-integration) says Affiliate API is inactive by default and requires application plus Account Manager or Partner Manager approval. | Account gate remains open. |
| Partner authorization | [Partner authorization guide](https://partner.tiktokshop.com/docv2/page/partner-authorization-guide) describes partner authorization, backend token exchange, token refresh, and secure server-side token storage. | Owner authorization is required; not run. |
| Category asset access | [Get Authorized Category Assets](https://partner.tiktokshop.com/docv2/page/get-authorized-category-assets-202405) requires partner authorization and returns `category_assets[].cipher` for partner-category APIs. | `category_asset_cipher` cannot be verified without approved account access. |
| Product-list endpoint | [Get Affiliate Partner Campaign Product List](https://partner.tiktokshop.com/docv2/page/get-affiliate-partner-campaign-product-list-202405) documents `GET /affiliate_partner/202405/campaigns/{campaign_id}/products`, partner access token, app key, signature, `category_asset_cipher`, opaque `page_token`, and `page_size` range `[1,100]`. | Request and pagination shape is documented; usable access and response contract are not verified. |
| Search fields | [Creator Search Open Collaboration Product](https://partner.tiktokshop.com/docv2/page/creator-search-open-collaboration-product-202405) documents keyword, category, sales-price, commission filters, and `units_sold` sort for that creator endpoint. | Does not prove those fields are returned by the selected partner campaign endpoint or permitted for Safial's use case. |
| Rate limits | [Rate limits](https://partner.tiktokshop.com/docv2/page/rate-limits) says QPS is dynamic by authorization scale, resource, endpoint, and platform load. `429` or business code `36009002` requires backoff; published starting ranges are not guarantees. | No fixed daily capacity can be claimed. Measure only after activation with approved test traffic. |
| Data use and retention | [Partner Center Terms](https://partner.tiktokshop.com/docv2/page/66063c677be39902c7774b24) limits TikTok Data use to planning/managing Partner Center use and says retention must not exceed what is strictly necessary or legally required. | Does not approve immutable 90-day snapshots or internal CMS display. Legal/provider confirmation required. |
| Security review | [Data security and privacy review](https://partner.tiktokshop.com/docv2/page/data-security-and-privacy-review) describes possible DSPR review and requires retention/deletion processes for Protected Data. | Safial review obligations and approval state are unknown. |
| API cost | Reviewed public documentation did not publish an account-specific API price or quota purchase fee. | Cost is unconfirmed, not zero. |

## MVP field disposition

| Required field or behavior | Current status | Unblock evidence |
|---|---|---|
| `sourceProductId` | Public product examples expose product IDs, but selected endpoint response was not tested. | Authorized test response and provider schema. |
| Title / keyword match | Keyword search is documented for creator open-collaboration API. | Confirm selected endpoint response and permitted use. |
| Category | Category filtering and category assets are documented. | Confirm returned category shape for Indonesia endpoint. |
| Price / currency | Public affiliate examples expose price and currency fields. | Confirm selected endpoint response, locale, and storage/display rights. |
| Source-provided position | No evidence found. | Keep null unless provider explicitly returns position. |
| Sold / `units_sold` | Documented as a sort field on creator search; not confirmed on partner campaign product list. | Authorized response schema plus terms approval. |
| Rating / review count | No reviewed official evidence. | Keep null unless explicit endpoint evidence appears. |
| Source timestamp / provenance | Request timestamp is documented; response timestamp and retention permission are not confirmed. | Authorized response schema and written terms confirmation. |
| Product image URL / detail URL | Public examples show `main_image_url` and `detail_link`; field presence does not grant display rights. | Written image/URL display, caching, and internal CMS permission. |

No rank, bestseller, popularity, demand, sales, or trend value may be inferred from ordering, page position, `units_sold` sort, or any other proxy.

## Exact onboarding inputs needed

Safial/provider owner must supply or confirm these through Partner Center, provider support, or written account documentation. No secret values belong in chat or this file.

1. Safial legal entity, company details, authorized contact, and accurate Partner Center onboarding information.
2. Partner Center account and selected role: confirm whether Safial is registering as an Affiliate Partner/TAP, an ISV/app developer, or both. Public docs expose both partner and app-developer paths; the chosen path controls scope and authorization.
3. Indonesia target market eligibility for the selected role and Affiliate Partner category.
4. App registration status: public or custom Affiliate app, app review/registration review requirements, configured redirect URL, and test/sandbox availability.
5. Account Manager or Partner Manager approval that activates Affiliate APIs for Safial.
6. Exact enabled scope for the selected endpoint, including `Read Affiliate Partner Campaigns` / scope `733508` when applicable.
7. Partner authorization result and authorization code handled by the owner; backend token exchange must yield a partner access token and documented expiry/refresh behavior.
8. Authorized category asset result for Indonesia, including the provider-issued `category_asset_cipher` reference. Never paste its value into chat or source control.
9. Provider-confirmed response schema for the selected endpoint: product ID, title, category, price/currency, timestamp, image/detail URL, and optional source-native `units_sold`.
10. Written permission covering Research Keyword use, internal authorized CMS display, image/URL use, source provenance, immutable daily snapshots, and the approved 90-day retention rule.
11. Endpoint-specific pagination ceiling, dynamic quota/capacity guidance, throttle signals, retry policy, and approved daily volume for the intended keyword set.
12. Account-specific commercial terms: onboarding, API, review, partner, support, hosting/data, and any quota or transaction fees.
13. Provider change/deprecation notice policy and contact/support route.

## Unblock test plan

After written approval and secure credential setup only:

1. Inspect Partner Center account metadata without exposing secrets.
2. Verify Indonesia target market, selected partner role, app status, enabled scope, and review status.
3. Complete partner authorization through the owner-controlled redirect flow; keep tokens server-side.
4. Call `Get Authorized Category Assets` in an approved test context and verify a non-empty Indonesia category asset result.
5. Call the selected product-list endpoint against a provider-approved test campaign or sandbox, with bounded `page_size`, one `page_token` continuation, and sanitized response validation.
6. Compare returned fields against the approved MVP field matrix. Do not persist data until terms, display rights, and retention are confirmed.
7. Record observed throttle behavior and stable capacity as an operational measurement, never as a provider guarantee.

## Decision

`RECOMMENDATION: retain TikTok Shop Affiliate Partner API as conditional validation candidate.`

`ACCOUNT VALIDATION: NOT RUN / BLOCKED — no Safial Partner Center access or credentials available.`

`MARKETPLACE STATUS: UNAPPROVED.`

Proceed only after all onboarding inputs and unblock evidence are recorded. If account eligibility, endpoint fields, terms, retention, display rights, quota, or cost remain unverified, keep marketplace selection open and do not use scraping or undocumented endpoints.

## Scope evidence

This artifact changes planning evidence only. No production files, credentials, API calls, provider data, schema, migration, route, worker, collector, CMS UI, or deployment configuration was changed.
