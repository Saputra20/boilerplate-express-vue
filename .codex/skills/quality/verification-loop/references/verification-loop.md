# Project Verification Commands

## Root Commands
~~~sh
bun run lint
bun run typecheck
bun run test
bun run format:check
bun run --cwd apps/cms build
git diff --check
docker compose config
~~~
Source: root package.json, app package manifests, docker-compose.yml.

## App Commands
API supports lint, typecheck, test, format:check, db:generate, db:migrate. CMS supports lint, typecheck, test, build, format:check. DB commands require approved DB work and valid environment because no current schema/migration exists.

## Evidence Rules
Lint, typecheck, tests, build, Compose validation, browser inspection, migration validation, and Anti-Slop prove different things. Anti-Slop plugin is unavailable in current runtime; report NOT RUN until installed.

## Checklist
Select task-applicable commands; run required Anti-Slop; inspect diff/status and secrets; report PASS/FAIL/NOT RUN/NOT APPLICABLE exactly.
