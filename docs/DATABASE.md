# Database

PostgreSQL is primary store. Drizzle owns schema and migrations. TypeScript fields use camelCase; table and column names use snake_case.

Foundation target entities: users, roles, permissions, role_permissions, user_roles, auth sessions/refresh-token records, token revocations, and audit records. Exact fields, retention, indexes, and constraints need approved task design.
