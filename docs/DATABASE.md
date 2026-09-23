# Database

PostgreSQL is primary store. Drizzle owns schema and migrations. TypeScript fields use camelCase; table and column names use snake_case.

Foundation entities include users, roles, permissions, role_permissions, and user_roles. Login/session work creates initial `auth_sessions`, `refresh_tokens`, and focused `auth_audit_events`: sessions and refresh metadata retain 30 days after becoming unusable, login audit events retain 90 days, raw refresh/access tokens are never stored, and login audit rows contain no credential data. `be/11-refresh-token` owns refresh-token rotation and replay/reuse detection. `be/12-logout-revocation` owns explicit logout and general revocation behavior; later tasks own generic audit expansion.
