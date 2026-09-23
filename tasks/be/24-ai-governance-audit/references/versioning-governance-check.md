# Versioning and OpenAPI Governance Check

## Current implementation classification

Before be/22 and be/23 execute, source currently remains unversioned for business auth routes and TypeScript-object based for OpenAPI. Current operational routes include `/health`, `/ready`, `/docs`, `/openapi.json`, and `/ops/queues`.

## Approved target classification

be/22 targets `/api/v1/auth/*` while keeping health/readiness, docs, OpenAPI, and queue monitor operational. be/23 targets `/docs/v1`, `/openapi/v1.json`, module/version-owned YAML, and Swagger as browser testing surface. These targets are not implementation facts until source and evidence confirm them.

## Audit checks

- Confirm `server.ts` composes modules, not individual auth internals.
- Confirm `app.ts` mounts module routers and owns `/api/v1` prefixes.
- Confirm module routers use relative paths.
- Confirm services/repositories remain shared unless business incompatibility requires separation.
- Confirm `/docs/v1` renders the v1 document and `/openapi/v1.json` serves it.
- Confirm `info.version` is document metadata, not URL major version.
- Confirm `/ops/queues` stays outside public OpenAPI.
- Confirm adding v2 does not remove v1 without separate approval.
