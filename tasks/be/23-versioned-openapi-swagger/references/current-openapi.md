# Current OpenAPI State

## Global Infrastructure

`apps/api/src/config/openapi/openapi.ts` currently owns:

- OpenAPI document generation through TypeScript objects and `swagger-jsdoc`.
- Swagger UI mounting through `swagger-ui-express`.
- `/docs`.
- `/openapi.json`.
- OpenAPI 3.0.3 metadata and relative server `/`.
- Shared bearer security scheme and generic error responses.
- Contribution aggregation from auth and health.
- Exclusion of `/ops/queues` from the JSON document.

## Module Contributions

- `apps/api/src/modules/auth/auth.openapi.ts` owns auth schemas and `/auth/*` path objects before be/22 route migration.
- `apps/api/src/modules/health/health.openapi.ts` owns `/health` and `/ready` path objects.

After be/22, auth routes are expected at `/api/v1/auth/*`; be/23 must inspect actual resulting locations before editing.

## Current Tests

- `apps/api/tests/openapi.test.ts` checks document paths, schemas, security, and queue-monitor exclusion.
- `apps/api/tests/health-readiness.test.ts` checks health/readiness behavior and documented paths.
- `apps/api/tests/queue-monitor.test.ts` checks operational monitor behavior and OpenAPI exclusion.
- Auth tests check runtime route behavior and become v1-path evidence after be/22.

## Migration Problem

The current TypeScript object model mixes module contract definitions with global loading and serving. It has no `/docs/v1`, `/openapi/v1.json`, YAML ownership, document isolation, browser verification, or v1/v2 coexistence boundary.
