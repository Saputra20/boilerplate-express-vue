# Database Foundation Evidence

## Purpose
Document actual Drizzle/PostgreSQL foundation and its limits.

## Established Evidence
- Drizzle config: apps/api/drizzle.config.ts.
- Schema entrypoint: apps/api/src/database/schema.ts exports identity tables plus `auth_sessions`, `refresh_tokens`, and `auth_audit_events`.
- Migration output: apps/api/drizzle contains entity-scoped forward and matching reverse migrations through `0009_extend-auth-audit-event-vocabulary`.
- .env.example defines separated DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_SSL.
- docker-compose.yml provides PostgreSQL 18 local service.

~~~ts
export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
});
~~~
Derived from apps/api/drizzle.config.ts.

## Not Established
No token-revocation table exists yet. `apps/api/src/database/client.ts` provides the runtime Drizzle/pg client lifecycle. Login/session schema details exist in `tasks/be/10-login-session/technical.md`; `be/11-refresh-token` owns refresh lineage/replay schema changes and `be/12` owns token revocations.

## Migration Discipline
- Follow `AGENTS.md` as policy: Drizzle owns schema and forward migration history; migrations are entity-scoped or tightly coupled concern-scoped.
- Current output root is `apps/api/drizzle`; generated Drizzle forward migration `<tag>.sql` requires matching reviewed reverse SQL `<tag>.down.sql` in the same directory.
- Drizzle journal tracks forward migrations only. Before task completion, prove sibling `.down.sql` files do not alter Drizzle forward execution and execute rollback through a repository-compatible isolated-database path.
- Create a new migration for every applied/shared schema change. Name the operation precisely; preserve FK dependency order for UP and reverse it for DOWN.
- Do not pretend an irreversible data operation has a safe rollback. Document it and require approval.

## Checklist
Inspect schema/migrations first; use approved schema contract; assess columns, constraints, indexes, data impact, and rollback; keep junction tables separate; run DB scripts only with valid environment; execute and record UP, DOWN, and re-apply evidence when tooling/environment allows.
