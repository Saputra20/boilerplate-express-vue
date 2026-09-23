# Development

## Local Services

`docker compose up -d` starts PostgreSQL and Redis. Apps run locally through Bun.

## Environment

Copy each app's `.env.example` to `.env`. Never create root `.env`. Generate local RS256 keys under `apps/api/secrets/`; key material is ignored.

## Quality Gate

Run only checks relevant to approved task: selected anti-slop checks, lint, typecheck, tests, build if relevant, `git diff --check`, and manual diff review. Record actual command outcomes.

## API tests

Run the default API suite with isolated temp files and no live infrastructure:

```bash
bun run --cwd apps/api test
```

PostgreSQL, Redis, and BullMQ integration tests are opt-in. They use the disposable `postgres-test` and `redis-test` Compose services, never the developer services or data:

```bash
docker compose --profile test up -d postgres-test redis-test
API_INTEGRATION=true bun run --cwd apps/api test -- tests/database-integration.test.ts tests/redis-integration.test.ts tests/bullmq-foundation.test.ts --detectOpenHandles
docker compose --profile test stop postgres-test redis-test
```

Integration tests create synthetic rows, keys, and queue names, then clean them after every test. Do not set `API_INTEGRATION=true` against a shared or developer database/Redis service.

## API logging

With `NODE_ENV=development`, API terminal logs use `pino-pretty`. Application and access log files remain JSON, as does terminal output outside development. Pino redaction applies before every destination.
