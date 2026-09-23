# Actual API Source Tree After Partial be/21 Execution

Actual source inventory checked during be/21 reconciliation. Composition finalization adds `modules/auth/auth.module.ts`; no tracked empty `common/` directory exists.

```text
apps/api/src/
  app.ts
  config/database/client.ts
  config/database/config.ts
  config/drizzle/rollback.ts
  config/drizzle/schema.ts
  config/env.ts
  config/jwt/jwt.ts
  config/logger/logger.ts
  config/openapi/openapi.ts
  config/queue/queue-monitor.ts
  config/queue/queue.ts
  config/redis/client.ts
  config/redis/config.ts
  config/security/http-security.config.ts
  helpers/password.helper.ts
  helpers/token-fingerprint.helper.ts
  middleware/authentication.middleware.ts
  middleware/error.middleware.ts
  middleware/permission.middleware.ts
  middleware/security.middleware.ts
  modules/audit/repositories/audit.repository.ts
  modules/audit/services/audit.service.ts
  modules/auth/auth.module.ts
  modules/auth/auth.openapi.ts
  modules/auth/auth.router.ts
  modules/auth/controllers/login.controller.ts
  modules/auth/controllers/logout.controller.ts
  modules/auth/controllers/refresh.controller.ts
  modules/auth/repositories/access-auth.repository.ts
  modules/auth/repositories/login.repository.ts
  modules/auth/repositories/logout.repository.ts
  modules/auth/repositories/refresh-token.repository.ts
  modules/auth/services/access-auth.service.ts
  modules/auth/services/login.service.ts
  modules/auth/services/logout.service.ts
  modules/auth/services/refresh-token.service.ts
  modules/health/health.openapi.ts
  modules/health/health.router.ts
  modules/rbac/repositories/permission.repository.ts
  modules/rbac/services/permission.service.ts
  server.ts
  shutdown.ts
```

Count: 42 TypeScript files.
