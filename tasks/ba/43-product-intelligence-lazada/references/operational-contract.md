# Lazada Operational Contract

Status: `HUMAN LEGAL REVIEW REQUIRED`

This contract is planning-only. No collection may run until human legal, data, and production approvals are recorded.

## Legal and compliance gate

Reviewer must decide, in writing:

| Topic | Required answer |
|---|---|
| Public page | Is ordinary access to Lazada Indonesia public catalog/search page permitted for internal Product Intelligence? |
| Fields | Are product ID, title, public URL, displayed price/currency, location, raw sold display, review count, DOM position, final URL, and timestamps permitted? |
| Frequency | Is one first-page collection per approved keyword per day permitted? |
| Request estimate | Approve maximum 3 fixed keywords and approximately 120 card observations/day, plus bounded retry requests. |
| Authentication | Is no-auth public access required? If auth is permitted, define exact approved credential and data boundary. No user cookies or private account data. |
| Personal/private data | Confirm no private account, checkout, seller-private, user-identifying, cookie, token, or credential data is collected. |
| Internal purpose | Confirm internal marketplace research purpose and approved users. |
| Retention | Approve 90-day immutable snapshots and separate short-lived diagnostics/raw-value handling. |
| Compliance | Confirm terms, privacy, security, access control, deletion, and incident/escalation obligations. |

Until every answer is approved: `HUMAN LEGAL REVIEW REQUIRED`; source disabled; no implementation card runnable.

## Disposable multi-day reliability harness

Harness uses fixed keywords only:

1. `baju one set bahan rayon`
2. `setelan wanita rayon`
3. `kulot wanita rayon`

Run once daily in `Asia/Jakarta`, first page only, target 40 cards/keyword and approximately 120 observations/day before deduplication. Store fixtures and summary metrics, not unrestricted production payloads. Harness must run across multiple consecutive days approved by owner; exact day count remains open.

Each run records:

- duration: request, render, readiness, extraction, total;
- final URL and route shape;
- card count, minimum/maximum, valid-card count, malformed-card count;
- ID presence, ID stability across days, duplicate IDs within run, duplicate IDs across keyword results;
- required fields: ID, title, URL, price/currency;
- nullable fields: raw sold, review, location; unavailable fields remain null;
- zero-card classification: valid empty or failed render;
- add/remove IDs versus prior successful run;
- price changes separately;
- raw sold-display changes separately, without exact conversion;
- review-count changes separately;
- search-rank changes separately, never as trend;
- selector/version and sanitized failure code.

Harness stops on login, CAPTCHA, block, private/auth signal, or policy signal. No bypass. Diagnostic artifacts use approved short TTL and access control.

## Zero-card decision

Readiness must verify page load completion, expected Lazada route/final URL, no login/CAPTCHA/block marker, expected product-list container, and render state settled. Minimum data validation must verify expected card selector, card count state, source IDs, and a bounded proportion of cards with required ID/title/URL. Exact threshold requires human approval.

- Zero cards before readiness passes: transient render/incomplete state; bounded retry.
- Zero cards after readiness passes and valid empty markers/search state: valid empty result.
- Cards missing minimum identity threshold: failed run, not valid empty.
- Timeout or retry exhaustion: failed run; preserve prior snapshots; mark stale; store sanitized error.
- Successful empty result: fresh successful run with zero observations, clearly distinct from failure.

Retry count, backoff, timeout, and minimum-card threshold remain open approval decisions. Retry must not bypass rate limits or policy controls.

## Data and trend rules

Raw marketplace display remains separate from normalized value. Missing means null, never zero. `isApproximation` is true only where normalization is explicitly approved as approximate. Price, raw sold display, review count, and rank remain independent observations. Rank is source position only and never demand, popularity, sales, or trend. TrendMetrics requires separately approved formula and version; absent approval, expose raw change observations only.
