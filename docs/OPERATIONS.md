# Operations

## Local Services

Run PostgreSQL and Redis through the repository Compose configuration:

```sh
docker compose up -d
```

Use the separate `postgres-test` and `redis-test` services for opted-in integration tests. Never point integration tests at developer data.

## API Startup

`apps/api/src/server.ts` validates environment and initializes logging, PostgreSQL, Redis, JWT, and BullMQ before listening. A failed required initialization closes resources, logs a sanitized phase, and prevents the server from starting.

## Probes And Operational Routes

- `GET /health` is public liveness and returns minimal process status.
- `GET /ready` is public readiness. It checks PostgreSQL and Redis with bounded probes and returns `503` when a required dependency is unavailable.
- `GET /ops/queues` is an internal operational dashboard. It remains outside the public OpenAPI document and requires its configured authentication.
- `/docs` redirects to `/docs/v1`; `/openapi/v1.json` serves the validated v1 OpenAPI document.

## Logging And Shutdown

Morgan handles HTTP access logging; Pino handles application logging. Logs must not contain credentials, tokens, private keys, secrets, or raw request credentials. Graceful shutdown closes the HTTP server and initialized infrastructure through `shutdown.ts`.

## Evidence Rule

Operational claims require current source and validation evidence. Documentation or task status alone does not prove a route, dependency, dashboard, or recovery behavior exists.
