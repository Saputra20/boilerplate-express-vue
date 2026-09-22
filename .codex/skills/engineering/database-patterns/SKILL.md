---
name: database-patterns
description: Design safe Drizzle/PostgreSQL schemas, migrations, and queries.
---
# Database Patterns

Use for schema, migration, repository, or query work.

- Drizzle owns schema and migration history; never substitute manual production DDL.
- Review columns/types/nullability/defaults, foreign keys, unique constraints, indexes, relations, existing data, rollback, and query plans.
- Use snake_case database names and typed camelCase model fields.
- Write transactions for atomic changes; prevent N+1 and unbounded reads; fetch only needed columns.
- Do not delete/rename/type-change data structures or remove constraints/indexes without explicit approved impact plan.
- Do not import Prisma-specific patterns.
