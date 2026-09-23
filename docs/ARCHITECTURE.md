# Architecture

## Repository

- `apps/api`: Express TypeScript API on Bun.
- `apps/cms`: Vue 3 TypeScript admin CMS on Vite.
- PostgreSQL: durable relational data via Drizzle.
- Redis: cache, session-supporting data, and BullMQ transport.

## Backend Boundaries

`middleware → route → controller → service/use case → repository → database`

Cross-cutting concerns live in focused infrastructure modules. Business modules own their routes, controllers, services, repositories, schemas, and tests. No generic CRUD layer.

## Authorization

`user → role → permission → action`. API enforces permission decisions. CMS only hides unavailable UX.

## Deferred Design

Foundation RBAC enforces coarse-grained action permissions. Resource ownership and row-level rules belong to the business module that owns that resource.

TODO: REQUIREMENT NEEDED — define actual business modules and data ownership.
