# Database

PostgreSQL is primary store. Drizzle owns schema and migrations. TypeScript fields use camelCase; table and column names use snake_case.

Foundation entities include users, roles, permissions, role_permissions, and user_roles. Login/session work uses `auth_sessions`, `refresh_tokens`, and focused `auth_audit_events`: sessions and refresh metadata retain 30 days after becoming unusable, login audit events retain 90 days, raw refresh/access tokens are never stored, and login audit rows contain no credential data. `be/12-logout-revocation` owns `token_revocations`; later tasks own refresh rotation and generic audit expansion.
