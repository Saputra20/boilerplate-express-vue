# API Versioning Rules

## Boundary

Versioning belongs to HTTP transport. Router, controller, validation, and module-specific OpenAPI path contribution may be version-specific. Services, repositories, database access, and business logic remain shared by default.

## v1

Business API base prefix:

```text
/api/v1
```

Auth mount:

```text
/api/v1/auth
```

Routes:

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
```

Individual route definitions must use module-relative paths. They must not repeat `/api/v1/auth`.

## Operational Namespace

Never version these routes:

```text
/health
/ready
/docs
/openapi.json
/ops/queues/*
```

Health/readiness are infrastructure probes. Queue monitor is authenticated operational infrastructure. Documentation routes are global infrastructure.

## Compatibility

- Changing `/auth/*` to `/api/v1/auth/*` is an intentional path migration in be/22.
- Do not retain legacy `/auth/*` duplicates unless a separate compatibility requirement is approved.
- Backward-compatible changes inside v1 do not require v2.
- Adding v2 does not authorize removing v1.
- v1 retirement requires a separate deprecation/removal task.

## v2

Future v2 adds a transport boundary under `modules/auth/v2/` and mounts it at `/api/v2/auth`. It does not automatically create `services/v2`, `repositories/v2`, or `database/v2`.

## OpenAPI

be/22 only keeps current auth path documentation synchronized with v1 routes. Full versioned OpenAPI/Swagger behavior belongs to `be/23-versioned-openapi-swagger`.
