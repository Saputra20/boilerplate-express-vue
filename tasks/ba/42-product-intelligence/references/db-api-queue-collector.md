# DB, API, Queue, Collector Proposal

## DB
`marketplace_sources`, `collection_runs`, `product_observations`, and `product_daily_snapshots`. Drizzle schema uses camelCase TypeScript and snake_case PostgreSQL. Historical rows immutable. Unique deterministic run key and source/product/date snapshot key. Exact FK delete semantics require approval.

## API/OpenAPI
Module-local YAML under Product Intelligence. Proposed authenticated reads: `GET /api/v1/product-intelligence/observations` and `/trends`. Bounded date/page/source filters. No public, arbitrary proxy, client snapshot write, or export endpoint. Permission code requires approval.

## BullMQ/Redis
One named collection queue after approval. Scheduler enqueues source/date run. Worker timeout, retry, backoff, retention, and timezone are approval decisions; use existing Redis/BullMQ foundation. Logs contain run ID/status/counts, never payloads or credentials.

## Collector abstraction
Provider-specific connector implements fixed interface: source identity, config reference, bounded input, normalized observations, provenance, and typed provider errors. Response validation rejects unknown/invalid critical shapes. No scraper or undocumented endpoint. Connector does not decide product policy.
