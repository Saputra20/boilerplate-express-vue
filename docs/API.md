# API

API JSON uses camelCase. Request payloads and query parameters validate with Zod. Errors use centralized safe envelopes; production never returns stack traces.

OpenAPI infrastructure is added before endpoint reference documentation. Approved backend task contracts define business routes until that infrastructure exists; do not create a parallel endpoint reference.
