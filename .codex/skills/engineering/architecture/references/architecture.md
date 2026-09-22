# Current Architecture Boundaries

## Purpose
Separate actual source boundaries from planned architecture in docs/ARCHITECTURE.md.

## Current Source Shape
- apps/api/src/server.ts loads environment then listens.
- apps/api/src/app.ts owns Express setup and JSON 404 fallback.
- apps/api/src/config/env.ts is the only real API module boundary.
- apps/cms/src/main.ts validates environment then mounts App.vue.
- App.vue is a shell; no router, Pinia store, composable, API client, or feature module exists.

## Decision Guide
- For configuration, inspect config/env.ts and bootstrap first.
- For HTTP shell work, inspect app.ts and server.ts.
- For first feature, follow approved task plus target flow; do not claim controllers/services/repositories are existing conventions.
- For CMS features, do not create navigation/state/API structure until product/design task defines it.

## Avoid
Do not add generic repositories, controllers, stores, or reusable UI frameworks because docs describe future layers.

## Verify
Check dependency direction against docs/ARCHITECTURE.md, then typecheck/tests/diff.
