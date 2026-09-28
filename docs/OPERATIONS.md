# Operations

## Local Services

Run PostgreSQL and Redis through the repository Compose configuration:

```sh
docker compose up -d
```

Use the separate `postgres-test` and `redis-test` services for opted-in integration tests. Never point integration tests at developer data.

## API Startup

`apps/api/src/server.ts` validates environment and initializes logging, PostgreSQL, Redis, JWT, BullMQ, and the SMTP transport when `EMAIL_ENABLED=true` before listening. SMTP transport creation does not check live connectivity; SMTP outages affect email delivery only and do not make the API fail startup.

Transactional email is disabled by default. When enabled, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, and `PUBLIC_APP_URL`. `PUBLIC_APP_URL` is the canonical frontend base URL for verification and password-reset links; it is independent of `CORS_ORIGINS` and is never derived from it. Production requires an absolute HTTPS URL without credentials, query, or fragment. Development/test may use HTTP only for localhost or loopback. Trailing slashes are normalized. `SMTP_USERNAME` and `SMTP_PASSWORD` are optional but must be configured together. Enabled email requires complete valid configuration at startup. Development/test runs may leave email disabled and use injected fake transports or an isolated test SMTP service. Never use real external email in automated tests.

### Email delivery recipient migration

`email_deliveries` stores recipient addresses using the existing `EMAIL_DELIVERY_ENCRYPTION_KEY`; plaintext recipient storage is removed after existing rows are encrypted and verified. For an existing database, stop the API and email worker, then run `bun run db:migrate-email-recipient-phase-a`, `bun run db:backfill-email-recipients`, and finally `bun run db:migrate` before restarting the application. The phase-A migration uses Drizzle through migration 0017 only; the backfill encrypts recipients in bounded batches, verifies decrypted values against existing recipients, and prints counts only. The final migration refuses to drop the plaintext column when an existing non-null recipient lacks its encrypted fields. Use the same encryption key throughout the backfill and delivery runtime; never include it in migration files or logs.

For a new empty database, `bun run db:migrate` applies the full migration chain directly; the final migration's guard succeeds because there are no legacy recipient rows.

Migration 0018 is intentionally irreversible. Reverting it would require decrypting and persisting recipient email addresses in plaintext, which violates the approved email-delivery storage security contract. Its DOWN file fails before changing schema or migration state. After 0018, application rollback must preserve the encrypted-recipient schema: patch older code to support that schema or do not deploy it against the migrated database. Do not use database DOWN as recovery. Take a database backup/snapshot before migration; restore that backup if a true database rollback is required.

## Probes And Operational Routes

- `GET /health` is public liveness and returns minimal process status.
- `GET /ready` is public readiness. It checks PostgreSQL and Redis with bounded probes and returns `503` when a required dependency is unavailable. SMTP is not part of general readiness.
- `GET /ops/queues` is an internal operational dashboard. It remains outside the public OpenAPI document and requires its configured authentication.
- `/docs` redirects to `/docs/v1`; `/openapi/v1.json` serves the validated v1 OpenAPI document.

## Logging And Shutdown

Morgan handles HTTP access logging; Pino handles application logging. Logs must not contain credentials, tokens, private keys, secrets, complete sensitive email bodies, or raw request credentials. Graceful shutdown closes the HTTP server, queue resources, enabled email transport, and other initialized infrastructure through `shutdown.ts`.

## Evidence Rule

Operational claims require current source and validation evidence. Documentation or task status alone does not prove a route, dependency, dashboard, or recovery behavior exists.
