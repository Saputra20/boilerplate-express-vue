# API

API JSON uses camelCase. Request payloads and query parameters validate with Zod. Errors use centralized safe envelopes; production never returns stack traces.

OpenAPI `3.0.3` foundation serves public human-readable Swagger UI at `/docs` and the public machine-readable document at `/openapi.json`. These routes describe application API behavior only and never contain secrets.

`info.version` is documentation metadata. It does not introduce URL versioning; existing API paths remain unchanged. The foundation uses relative server URL `/`, not a deployment hostname.

Protected third-party operational dashboards, including `/ops/queues`, are not public JSON API operations and are excluded from the OpenAPI document.
