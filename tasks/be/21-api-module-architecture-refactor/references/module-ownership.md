# Module Ownership

## Auth

`modules/auth` owns current login, refresh rotation, logout/session revocation, and access-token authentication services/repositories plus auth router/controllers. It owns no generic RBAC permission lookup.

## RBAC

`modules/rbac` owns persistent user-role-permission lookup and permission resolution. It has no HTTP endpoint. `middleware/permission.middleware.ts` remains the cross-cutting Express enforcement boundary.

## Audit

`modules/audit` owns generic audit event validation, recording, cleanup, and persistence. It has no HTTP endpoint. Existing auth-specific audit writes remain inside their current auth repository transaction ownership; this task does not merge audit domains or change writes.

## Config

`config` owns startup/configuration and lifecycle infrastructure: environment, PostgreSQL/Drizzle, Redis, confirmed BullMQ queue infrastructure, logger, JWT/key initialization, and HTTP security policy configuration. It must not import business modules.

## Middleware

`middleware` owns Express-specific cross-cutting execution only: authentication, permission enforcement, HTTP security installation, and centralized error handling. It cannot become a repository or business-service location.

## Helpers and Common

`helpers` owns small stateless technical functions: Argon2 password operations and deterministic token fingerprinting. `common` may hold only a real multi-consumer non-domain primitive; no current file qualifies, so no empty folder is created.
