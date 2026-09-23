# Module Ownership

## Auth

`modules/auth` owns current login, refresh rotation, logout/session revocation, access-token authentication services/repositories, auth router/controllers, and auth-specific OpenAPI contribution. It owns no generic RBAC permission lookup.

## RBAC

`modules/rbac` owns persistent user-role-permission lookup and permission resolution. It has no HTTP endpoint. `middleware/permission.middleware.ts` remains the cross-cutting Express enforcement boundary.

## Audit

`modules/audit` owns generic audit event validation, recording, cleanup, and persistence. It has no HTTP endpoint. Existing auth-specific audit writes remain inside their current auth repository transaction ownership; this task does not merge audit domains or change writes.

## Health

`modules/health` owns liveness and readiness routes plus the health/readiness OpenAPI contribution. It does not own PostgreSQL clients, Redis clients, the global OpenAPI document, or application security middleware.

## OpenAPI

`config/openapi` owns global document generation, Swagger UI, contribution aggregation, and reusable global security/error components. Modules retain API documentation for their own routes.

## Queue Monitor

`config/queue` owns bull-board adapter setup, operational monitor authentication, and read-only monitor mounting. Future feature/module tasks own business queue processors.

## Config

`config` owns startup/configuration and lifecycle infrastructure: environment, PostgreSQL/Drizzle, Redis, confirmed BullMQ queue infrastructure, logger, JWT/key initialization, HTTP security policy configuration, global OpenAPI infrastructure, and queue monitor infrastructure. It must not import business modules.

## Middleware

`middleware` owns Express-specific cross-cutting execution only: authentication, permission enforcement, HTTP security installation, and centralized error handling. It cannot become a repository or business-service location.

## Helpers and Common

`helpers` owns small stateless technical functions: Argon2 password operations and deterministic token fingerprinting. `common` may hold only a real multi-consumer non-domain primitive; no current file qualifies, so no empty folder is created.
