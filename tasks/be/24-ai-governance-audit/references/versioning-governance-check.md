# Versioning and OpenAPI Governance Check

## Current implementation classification

Current source uses `/api/v1/auth/*`, module-owned YAML OpenAPI contracts, `/docs` → `/docs/v1`, `/openapi/v1.json`, and operational routes `/health`, `/ready`, and `/ops/queues` outside the business version namespace.

## Approved target classification

be/22 and be/23 targets are implemented and supported by recorded source/test evidence. Future v2 remains an approved extension point only and is not implemented.

## Audit checks

- Confirm `server.ts` composes modules, not individual auth internals.
- Confirm `app.ts` mounts module routers and owns `/api/v1` prefixes.
- Confirm module routers use relative paths.
- Confirm services/repositories remain shared unless business incompatibility requires separation.
- Confirm `/docs/v1` renders the v1 document and `/openapi/v1.json` serves it.
- Confirm `info.version` is document metadata, not URL major version.
- Confirm `/ops/queues` stays outside public OpenAPI.
- Confirm adding v2 does not remove v1 without separate approval.
