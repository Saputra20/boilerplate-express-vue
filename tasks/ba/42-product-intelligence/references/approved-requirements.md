# Product Intelligence Approved Requirements

Approval date: 2026-10-04

Approver: Saputra, project owner/requester

Approval source: Kanban task `t_b3203750` comment thread. Saputra's comments on 2026-10-04 provide the named approval and clarification below. Later clarification supersedes any earlier proposal where they differ.

Implementation status: requirements approved for the feasibility and credential/connector spike only. No marketplace is selected yet. Production Product Intelligence implementation remains gated until the spike produces evidence and Saputra separately approves one source.

## Decision register

| Decision ID | Approved value | Approver | Date |
|---|---|---|---|
| `SCOPE-001` | MVP is Research Keyword, one approved connector, daily collection, immutable historical snapshots, and a basic trend dashboard. | Saputra, project owner/requester | 2026-10-04 |
| `REGION-001` | Target region is Indonesia. A source is eligible only when its documented/account-approved access supports this region and the required fields. | Saputra, project owner/requester | 2026-10-04 |
| `SOURCE-001` | Do not lock the first marketplace yet. Run a feasibility/credential spike, then select only one source after written approval. Allowed sources are official, affiliate, or partner APIs. | Saputra, project owner/requester | 2026-10-04 |
| `SOURCE-002` | Scraping, CAPTCHA bypass, reverse engineering, undocumented endpoints, and unsupported provider access are prohibited. | Saputra, project owner/requester | 2026-10-04 |
| `CREDENTIAL-001` | Marketplace credentials are Safial-owned. Store them in server environment configuration or the approved secret manager. Workers receive only a credential reference. Credentials never enter chat, source control, database rows, logs, API responses, or browser bundles. | Saputra, project owner/requester | 2026-10-04 |
| `METRIC-001` | MVP stores immutable historical daily snapshots, price, source-provided position, and source-native fields. Sold, rating, and review values are included only when the selected provider returns them. | Saputra, project owner/requester | 2026-10-04 |
| `METRIC-002` | Do not infer bestseller status, popularity, demand, rank, sales, or other derived metrics. No ranking formula is approved. | Saputra, project owner/requester | 2026-10-04 |
| `IDENTITY-001` | Product identity is the tuple `(marketplace, sourceProductId)`. There is no cross-marketplace merge. | Saputra, project owner/requester | 2026-10-04 |
| `IDENTITY-002` | Category and other source attributes are nullable. Missing provider fields remain unknown/null; no category inference is approved. | Saputra, project owner/requester | 2026-10-04 |
| `SCHEDULE-001` | Collection runs daily in timezone `Asia/Jakarta`. Retry and rate-limit behavior follows provider policy; no bypass is allowed. | Saputra, project owner/requester | 2026-10-04 |
| `RETENTION-001` | Immutable snapshots are retained for 90 days. No deletion of historical snapshots occurs because a collection fails. | Saputra, project owner/requester | 2026-10-04 |
| `FRESHNESS-001` | On failed or missing collection, retain the last snapshot and show freshness/stale state plus collection error. Historical data remains available. | Saputra, project owner/requester | 2026-10-04 |
| `ACCESS-001` | Use coarse-grained backend RBAC permissions: `product_intelligence.read`, `product_intelligence.create`, `product_intelligence.update`, `product_intelligence.delete`, and `product_intelligence.run`. Backend remains authorization source of truth. | Saputra, project owner/requester | 2026-10-04 |
| `DOMAIN-001` | MVP has no tenant or organization model. Do not add tenant fields, filters, or isolation claims. | Saputra, project owner/requester | 2026-10-04 |
| `FUTURE-001` | Multi-marketplace rollout, design clustering, AI Design Brief, mockups, and estimated popularity formulas are deferred and require separate approval. | Saputra, project owner/requester | 2026-10-04 |

## Feasibility and implementation gate

1. Feasibility/credential spike may inspect provider documentation, account eligibility, permitted fields, quotas/rate limits, terms, historical/snapshot support, and operational cost.
2. Spike may use only approved official, affiliate, or partner API paths and Safial-owned credential references. It must not collect production data or add production schema, routes, workers, or CMS UI.
3. Spike must record source-specific evidence and a recommendation. It must identify whether Indonesia eligibility and required MVP fields are confirmed.
4. No marketplace is approved by this artifact. No production connector or other Product Intelligence implementation starts until Saputra separately approves the selected source after spike evidence.
5. After source approval, implementation must remain within this decision register. Any new provider, metric, ranking formula, tenant behavior, retention rule, or future-phase capability needs separate named approval.

## Source field and history rules

- Preserve source provenance, source product ID, source timestamp, and source-native fields returned by the approved provider where permitted.
- Preserve nullable values as null/unknown; do not convert missing values to zero.
- Use `(marketplace, sourceProductId)` as product identity. Same source product must not create a second identity because category or other nullable attributes change.
- Append immutable daily snapshots. Repeated collection for the same source/product/day must be idempotent and must not overwrite an earlier snapshot.
- Collection failure keeps prior snapshots, marks freshness/stale state, and exposes a sanitized collection error. Raw credentials, tokens, headers, and provider payload dumps never appear in logs or API responses.

## Explicitly deferred

- Selection of first marketplace/provider.
- Multi-marketplace support.
- Inferred or formula-based popularity, bestseller, sales, demand, or ranking metrics.
- Design clustering, AI Design Brief, mockups, recommendations, forecasting, and automated copy.
- Tenant/organization model.
- Any public API, export, alerting, or capability outside approved MVP scope.

## Consistency and authority

`CONSISTENT`: this artifact matches Saputra's named approval comments, the feasibility evidence in `references/marketplace-feasibility.md`, and the planning package's prohibition on scraping and unsupported fields.

`CONFLICT`: the planning package's open decision list names provider, metrics, permissions, retention, and stale policy as unresolved. Authority winner: Saputra's 2026-10-04 approval comments recorded in this artifact. Safe continuation: run only the feasibility/credential spike; keep source selection and production implementation gated.

## Open points

First marketplace/provider remains open pending feasibility evidence and separate Saputra approval. Provider-specific credential shape, permitted source fields, quotas, terms, and exact operational retry bounds remain open until source selection. No other Product Intelligence behavior may be invented to close these points.
