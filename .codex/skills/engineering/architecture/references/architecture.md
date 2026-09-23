# API Module-First Boundaries

## Purpose
Separate actual source boundaries from planned architecture in docs/ARCHITECTURE.md.

## API Source Shape
- `apps/api/src/app.ts`, `server.ts`, and `shutdown.ts` compose and run API lifecycle.
- `modules/<module>/` owns business routes, controllers, services, repositories, validation, types, and module-specific OpenAPI contributions.
- `middleware/` owns cross-cutting Express middleware.
- `config/` owns environment, database/Drizzle, Redis, BullMQ, logger, JWT, security, and global OpenAPI infrastructure.
- `helpers/` owns small stateless technical helpers. `common/` remains reserved for genuine reusable non-domain primitives.

## Decision Guide
- Compose dependencies from `app.ts`/`server.ts`; keep request flow `middleware → router → controller → service/use case → repository → database`.
- Modules may depend on approved config contracts, never on app/server or another module's private internals.
- Global OpenAPI aggregates module contributions; module-specific definitions remain in their module.
- Operational infrastructure dashboards stay in config when they configure a third-party tool rather than implement a business capability.

## Avoid
Do not add generic repositories, controllers, global technical-layer business folders, or new top-level API feature/infrastructure directories.

## Verify
Check dependency direction against docs/ARCHITECTURE.md, then typecheck/tests/diff.
