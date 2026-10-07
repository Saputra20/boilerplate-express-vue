# Architecture and Data Flow

Approved config/credential reference loads. Scheduler enqueues bounded source run. Worker claims deterministic run key, calls fixed approved connector, validates response, normalizes fields, records provenance, and writes collection run plus immutable observations/daily snapshots. Sanitized outcome logs only. API controller validates query, service enforces permission and bounds, repository reads historical data. CMS calls API and renders freshness/trends.

Boundaries: scheduler/worker infrastructure does not own product policy; connector does not expose raw provider payload to client; controller has transport concerns only; service owns business rules; repository owns DB access; CMS does not compute authorization or unsupported metrics.

Failure leaves previous history intact. Duplicate run is idempotent. Provider data is never silently backfilled or inferred.
