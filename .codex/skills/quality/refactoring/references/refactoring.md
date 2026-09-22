# Refactoring Boundaries In Foundation State

## Purpose
Avoid creating hypothetical architecture while cleaning a small foundation repository.

## Current Candidates
API has app.ts, server.ts, config/env.ts, empty schema entrypoint, and one app test. CMS has main.ts, env.ts, App.vue, styles.css, and one component test. No feature modules, repositories, stores, composables, controllers, services, or schema exist.

## Workflow
1. Confirm approved task permits cleanup.
2. State invariant: unknown API route still returns JSON 404, or CMS shell still renders heading.
3. Make smallest structural change.
4. Run relevant test/typecheck/lint/Anti-Slop/diff review.

## Avoid
Do not extract generic middleware/service/repository/store/UI primitive from one use. Do not combine feature work with upgrades or mass formatting. Do not remove schema/config placeholders without checking tasks.

## Existing Examples
apps/api/tests/app.test.ts and apps/cms/tests/App.test.ts define current behavior invariants.
