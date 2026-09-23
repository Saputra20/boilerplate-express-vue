# OpenAPI Migration Map

| Current Source | Target Source | Action | Notes |
| --- | --- | --- | --- |
| `apps/api/src/config/openapi/openapi.ts` | `apps/api/src/config/openapi/openapi.ts` | MODIFY | Keep global loading, validation, aggregation, serving, `/docs` redirect, and Swagger UI setup. |
| `apps/api/src/modules/auth/auth.openapi.ts` | `apps/api/src/modules/auth/v1/auth.openapi.yaml` | DELETE AFTER MOVE | Move auth paths/schemas/security to YAML; remove duplicate TS contract. |
| `apps/api/src/modules/health/health.openapi.ts` | `apps/api/src/modules/health/health.openapi.yaml` | DELETE AFTER MOVE | Move health/readiness paths/schemas to YAML; keep health router unchanged. |
| `apps/api/src/modules/auth/v1/auth.router.ts` | `apps/api/src/modules/auth/v1/auth.router.ts` | KEEP/MODIFY ONLY IF NEEDED | Runtime route source comes from be/22; YAML must match it exactly. |
| `apps/api/src/config/queue/queue-monitor.ts` | No OpenAPI target | KEEP | Preserve `/ops/queues`; do not document bull-board in JSON API spec. |
| `apps/api/tests/openapi.test.ts` | Same file | MODIFY | Add v1 serving, redirect, schema, operation ID, security, and exclusion assertions. |
| `apps/api/tests/health-readiness.test.ts` | Same file | MODIFY | Preserve operational paths and document assertions. |
| `apps/api/tests/queue-monitor.test.ts` | Same file | MODIFY | Preserve monitor and absence from OpenAPI. |

## Contract Source Rule

After migration, YAML is the sole source for module OpenAPI paths/schemas. TypeScript owns runtime loading, validation, aggregation, and serving only. No stale old object definitions remain.

## Dependency Decision

Current package stack has no YAML parser or dedicated OpenAPI resolver. During execution, evaluate the smallest compatible set:

- `yaml` for YAML parsing.
- `@apidevtools/swagger-parser` only if validation and local `$ref` bundling/resolution cannot remain simpler with existing tooling.

Do not install either package during planning. Confirm exact versions, ESM/Bun compatibility, security posture, and necessity before adding any dependency.
