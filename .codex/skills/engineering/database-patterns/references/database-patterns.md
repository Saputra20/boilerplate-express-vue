# Database Foundation Evidence

## Purpose
Document actual Drizzle/PostgreSQL foundation and its limits.

## Established Evidence
- Drizzle config: apps/api/drizzle.config.ts.
- Schema entrypoint: apps/api/src/database/schema.ts exports nothing; comment defers schema to task be/03-database-foundation.
- Migration output: apps/api/drizzle; no migrations exist.
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
No tables, relations, repositories, transactions, seeds, runtime DB client, or DB test harness exists. docs/DATABASE.md leaves fields/constraints/indexes for approved design.

## Checklist
Inspect schema/migrations first; do not invent auth columns; create migration only with approved schema contract; assess constraints/indexes/data/rollback; run db scripts only with valid environment.
