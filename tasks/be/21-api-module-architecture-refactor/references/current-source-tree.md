# Current API Source Tree

Current live source inventory before the be/21 refactor. Every listed file is represented once in `technical.md` section 10.1.

```text
apps/api/src/
  app.ts
  server.ts
  shutdown.ts
  audit/
    audit-repository.ts
    audit-service.ts
  auth/
    access-auth-middleware.ts
    access-auth-repository.ts
    access-auth-service.ts
    login-repository.ts
    login-route.ts
    login-service.ts
    logout-repository.ts
    logout-route.ts
    logout-service.ts
    openapi.ts
    permission-middleware.ts
    permission-repository.ts
    permission-service.ts
    refresh-repository.ts
    refresh-route.ts
    refresh-service.ts
  config/
    env.ts
  database/
    client.ts
    config.ts
    rollback.ts
    schema.ts
  health/
    index.ts
    openapi.ts
  jwt/
    index.ts
  logging/
    index.ts
  openapi/
    index.ts
  password/
    index.ts
  queue/
    index.ts
    monitor.ts
  redis/
    client.ts
    config.ts
  security/
    index.ts
```

Count: 37 TypeScript files.
