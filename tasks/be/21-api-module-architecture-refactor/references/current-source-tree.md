# Current API Source Tree

Inspected on September 23, 2026. This is the complete current `apps/api/src` file tree used by the migration matrix.

```text
apps/api/src/
  app.ts
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
  jwt/
    index.ts
  logging/
    index.ts
  password/
    index.ts
  queue/
    index.ts
  redis/
    client.ts
    config.ts
  security/
    index.ts
  server.ts
  shutdown.ts
```

Count: 32 TypeScript files. `technical.md` section 10.1 maps each file exactly once.
