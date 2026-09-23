# Target Route Composition

## Runtime

```text
server.ts
  ↓
initialize infrastructure
  ↓
create auth module
  ↓
create app with named module routers
  ↓
app.use('/api/v1/auth', auth.v1.router)
  ↓
mount operational routes
  ↓
listen
```

## Auth Module

```text
modules/auth/
  auth.module.ts
  v1/
    auth.router.ts
    controllers/
    validation/
  services/
  repositories/
  types/
```

Only files with real responsibility are created. Existing services and repositories remain shared. Existing controllers/validation files move into `v1/` only where they are transport-specific.

## Public Composition

Conceptual interface:

```ts
const auth = createAuthModule({ db, jwt });

createApp({
  logging,
  security,
  routers: {
    authV1: auth.v1.router,
    health: healthRouter,
  },
  queueMonitor,
});
```

Equivalent plain TypeScript structure is allowed if it keeps named dependencies and module internals private.

## Mounts

```ts
app.use('/api/v1/auth', auth.v1.router);
app.use('/health', healthRouter);
app.use('/ready', healthRouter);
app.use('/docs', docsRoutes);
app.use('/openapi.json', openApiJsonRoute);
app.use('/ops/queues', queueMonitor);
```

The auth router itself defines only `/login`, `/refresh`, `/logout`, and `/logout-all`.

## Future Extension

```ts
app.use('/api/v1/auth', auth.v1.router);
app.use('/api/v2/auth', auth.v2.router);
```

The second router is not created by be/22. Both versions may use shared services/repositories until an approved business incompatibility requires separation.
