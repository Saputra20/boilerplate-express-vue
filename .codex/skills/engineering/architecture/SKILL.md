---
name: architecture
description: Preserve documented module boundaries and dependency direction.
---
# Architecture

Use for cross-module, API, database, or task-planning changes.

- API flow: middleware → route → controller → service/use case → repository → database.
- CMS flow: page → business component → composable/state → API client → backend API.
- Controllers handle transport only. Services own behavior. Repositories own data access.
- Keep cross-cutting concerns focused; no generic CRUD, microservices, event systems, factories, or DI layers without approved need.
- Existing docs/code outrank generic patterns. Flag boundary conflict; do not silently redesign architecture.
