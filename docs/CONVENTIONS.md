# Conventions

## Source Layout

- `apps/api/src/modules/<module>/` owns business capabilities and module-local controllers, routers, services, repositories, validation, schemas, types, and OpenAPI contributions.
- `apps/api/src/middleware/` owns cross-cutting Express middleware.
- `apps/api/src/config/` owns environment, database, Redis, BullMQ, logging, JWT, HTTP security, and global OpenAPI infrastructure.
- `apps/api/src/helpers/` owns small stateless technical helpers. Do not add global business-layer folders or new top-level feature directories.
- `app.ts`, `server.ts`, and `shutdown.ts` compose and run API lifecycle.

## Naming And Data

- TypeScript symbols and API JSON use camelCase.
- PostgreSQL identifiers use snake_case.
- Environment variables use UPPER_SNAKE_CASE.
- Validate trust-boundary input with existing Zod patterns.
- Keep request flow `middleware → router → controller → service/use case → repository → database`.

## API And OpenAPI

- Application composition owns `/api/vN/<module>` prefixes; routers define module-relative paths.
- `/health`, `/ready`, `/docs`, `/docs/v1`, `/openapi/v1.json`, and `/ops/queues` remain outside business API version prefixes.
- OpenAPI module contracts live beside owning modules as YAML. `config/openapi` loads, validates, aggregates, and serves them.
- OpenAPI documents describe actual routes only. Exclude operational dashboards and secrets.

## Tests And Changes

- Tests prove behavior, not coverage targets. Keep fixtures synthetic and cleanup deterministic.
- Select only validation relevant to approved scope. Record actual results for Anti-Slop, lint, typecheck, tests, build, migration, browser, and diff checks.
- Do not modify application behavior, dependencies, migrations, generated files, or secrets outside approved task scope.
