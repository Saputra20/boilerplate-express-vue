# Current Route Composition

## Runtime

Current runtime flow:

```text
server.ts
  initializes env, logger, database, Redis, JWT, BullMQ
  creates login/refresh/access/logout repositories
  creates login/refresh/access/logout services
  calls createApp with positional optional dependencies
  listens
```

`app.ts` currently installs security and logging middleware, health routes, OpenAPI routes, three auth route installers, queue monitor, fallback 404, and error middleware.

## Current Auth Boundary

`apps/api/src/modules/auth/auth.router.ts` exports three installers:

- `installLoginRoute` registers `/auth/login`.
- `installRefreshRoute` registers `/auth/refresh`.
- `installLogoutRoutes` registers `/auth/logout` and `/auth/logout-all`.

The router receives individual services from `app.ts`. It does not use `express.Router()` or a module-level public interface.

## Current Composition Problem

- `server.ts` imports and constructs every auth repository and service individually.
- `app.ts` accepts positional `loginService`, `refreshService`, `accessAuthService`, `logoutService`, queue monitor, and health options.
- Auth route definitions contain their own global logical path strings.
- No single auth module owns repository/service/router composition.
- Adding a future API version would require changing global composition without a clear version boundary.

## Current Operational Paths

- `GET /health`
- `GET /ready`
- `GET /docs`
- `GET /openapi.json`
- `/ops/queues/*`

These are operational paths and must remain outside the business API version prefix.

## Current Tests

- `apps/api/tests/login-session.test.ts`
- `apps/api/tests/refresh-token.test.ts`
- `apps/api/tests/logout-revocation.test.ts`
- `apps/api/tests/openapi.test.ts`
- `apps/api/tests/health-readiness.test.ts`
- `apps/api/tests/queue-monitor.test.ts`
- `apps/api/tests/app.test.ts`
