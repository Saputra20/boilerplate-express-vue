# API

API JSON uses camelCase. Request payloads and query parameters validate with Zod. Errors use centralized safe envelopes; production never returns stack traces.

OpenAPI `3.0.3` foundation serves public human-readable Swagger UI at `/docs` and the public machine-readable document at `/openapi.json`. These routes describe application API behavior only and never contain secrets.

`info.version` is documentation metadata. Business auth routes use the `/api/v1` transport prefix; operational routes remain unversioned. The foundation uses relative server URL `/`, not a deployment hostname.

Auth routes are `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, and `POST /api/v1/auth/logout-all`. Services and repositories remain shared across future transport versions by default.

Approved health/readiness contract defines public `GET /health` for process liveness and public `GET /ready` for PostgreSQL/Redis readiness. Health returns minimal liveness status; readiness returns `503` when a required dependency is unavailable. Neither public payload exposes dependency internals.

Protected third-party operational dashboards, including `/ops/queues`, are not public JSON API operations and are excluded from the OpenAPI document.
