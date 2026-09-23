# Architecture

## Repository

- `apps/api`: Express TypeScript API on Bun.
- `apps/cms`: Vue 3 TypeScript admin CMS on Vite.
- PostgreSQL: durable relational data via Drizzle.
- Redis: cache, session-supporting data, and BullMQ transport.

## Backend Boundaries

`middleware → route → controller → service/use case → repository → database`

`apps/api/src/modules/<module>/` owns business capabilities. Auth owns authentication/session behavior, RBAC owns permission resolution, audit owns audit persistence, and health owns liveness/readiness routes plus its OpenAPI contribution. A module may omit layers it does not need.

`apps/api/src/middleware/` owns cross-cutting Express enforcement. `apps/api/src/config/` owns infrastructure setup: environment, database/Drizzle, Redis, BullMQ, logger, JWT, HTTP security, and global OpenAPI aggregation. `apps/api/src/helpers/` owns small stateless technical helpers. `common/` is reserved for genuine non-domain primitives, not a dumping ground.

Dependencies flow inward: app/server compose config, middleware, and module routers; controllers depend on module services; services depend on module repositories and approved infrastructure contracts; repositories depend on database schema/client. Modules do not import app/server, infrastructure does not import business services, and global OpenAPI aggregation imports module contributions without owning module API definitions. No generic CRUD layer.

API versioning belongs at HTTP transport boundaries. Application composition mounts versioned module routers, such as `/api/v1/auth`, while routers define only relative paths such as `/login`. URL versioning does not create versioned services, repositories, database access, or authorization policy by default. Operational routes remain outside business version prefixes.

OpenAPI contracts live beside owning modules in YAML. `config/openapi` owns loading, validation, aggregation, and serving. Versioned documents must stay isolated; v2 documentation does not appear until v2 is explicitly approved.

Operational dashboards mount inside the API only after baseline security middleware and use explicit queue/resource registration. They are internal tooling, not business API or CMS capabilities.

## Authorization

`user → role → permission → action`. API enforces permission decisions. CMS only hides unavailable UX.

## Deferred Design

Foundation RBAC enforces coarse-grained action permissions. Resource ownership and row-level rules belong to the business module that owns that resource.

TODO: REQUIREMENT NEEDED — define actual business modules and data ownership.
