# Database

PostgreSQL is primary store. Drizzle owns schema and migrations. TypeScript fields use camelCase; table and column names use snake_case.

Foundation entities include users, roles, permissions, role_permissions, and user_roles. `be/10-login-session` creates initial `auth_sessions`, `refresh_tokens`, and focused `auth_audit_events`: sessions and refresh metadata retain 30 days after becoming unusable, auth audit events retain 90 days, raw refresh/access tokens are never stored, and auth audit rows contain no credential data. `be/11-refresh-token` owns refresh-token rotation and replay/reuse detection. `be/12-logout-revocation` owns explicit logout, session revocation, and access-JTI revocation. `be/13-rbac-permissions` reuses existing RBAC relations for coarse-grained permission checks; it adds no duplicate tables or schema migration.

`auth_audit_events` remains auth-specific. `be/14-audit-trail` owns separate generic append-only `audit_events` with a 90-day retention baseline. Deleting source records must not cascade-delete audit history. Later tasks own public read/viewer contracts and cleanup scheduling; task 14 does not migrate historical auth audit records or dual-write them.
