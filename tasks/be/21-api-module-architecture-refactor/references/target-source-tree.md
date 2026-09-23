# Target API Source Tree

Target after implementation. File names are fixed by `technical.md` section 10.1.

```text
apps/api/src/
  app.ts
  server.ts
  shutdown.ts
  config/
    env.ts
    database/
      client.ts
      config.ts
    drizzle/
      rollback.ts
      schema.ts
    jwt/
      jwt.ts
    logger/
      logger.ts
    redis/
      client.ts
      config.ts
    queue/
      queue.ts
    security/
      http-security.config.ts
  common/
    (reserved; no tracked file until a real multi-consumer non-domain primitive exists)
  helpers/
    password.helper.ts
    token-fingerprint.helper.ts
  middleware/
    authentication.middleware.ts
    error.middleware.ts
    permission.middleware.ts
    security.middleware.ts
  modules/
    audit/
      repositories/
        audit.repository.ts
      services/
        audit.service.ts
    auth/
      auth.router.ts
      controllers/
        login.controller.ts
        logout.controller.ts
        refresh.controller.ts
      repositories/
        access-auth.repository.ts
        login.repository.ts
        logout.repository.ts
        refresh-token.repository.ts
      services/
        access-auth.service.ts
        login.service.ts
        logout.service.ts
        refresh-token.service.ts
    rbac/
      repositories/
        permission.repository.ts
      services/
        permission.service.ts
```

`common/` is architectural reserved space, not a tracked empty directory. Current code has no qualifying multi-consumer non-domain primitive. Create it only with a future approved concrete shared primitive.
