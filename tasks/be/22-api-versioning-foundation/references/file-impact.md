# File Impact

## Composition

| Current File | Planned Impact | Reason |
| --- | --- | --- |
| `apps/api/src/server.ts` | Modify | Compose `authModule` and pass named app dependencies; stop constructing auth internals individually. |
| `apps/api/src/app.ts` | Modify | Mount routers and operational routes from named dependencies; remove positional auth services. |
| `apps/api/src/modules/auth/auth.module.ts` | Create | Own auth repository/service/v1 router composition. |
| `apps/api/src/modules/auth/auth.router.ts` | Move or replace under `modules/auth/v1/` | Use `express.Router()` and module-relative paths. |
| `apps/api/src/modules/auth/controllers/*` | Move under `modules/auth/v1/controllers/` only if transport responsibility remains | Keep controller validation/status behavior; do not create empty files. |
| `apps/api/src/modules/auth/services/*` | Keep shared | Business behavior is not versioned by default. |
| `apps/api/src/modules/auth/repositories/*` | Keep shared | Database access is not versioned by default. |
| `apps/api/src/modules/auth/auth.openapi.ts` | Modify minimally | Synchronize documented auth paths with `/api/v1/auth/*`. |

## Operational Boundaries

| File | Planned Impact | Rule |
| --- | --- | --- |
| `apps/api/src/modules/health/health.router.ts` | Keep route behavior; expose through named app router dependency | Preserve `/health` and `/ready`. |
| `apps/api/src/config/openapi/openapi.ts` | Minimal compatibility update only if required | Preserve global aggregation; defer versioned document design. |
| `apps/api/src/config/queue/queue-monitor.ts` | Keep | Preserve `/ops/queues` and auth/read-only policy. |

## Tests

| Test File | Planned Evidence |
| --- | --- |
| `apps/api/tests/login-session.test.ts` | v1 login path and unchanged behavior |
| `apps/api/tests/refresh-token.test.ts` | v1 refresh path and unchanged behavior |
| `apps/api/tests/logout-revocation.test.ts` | v1 logout paths and auth semantics |
| `apps/api/tests/app.test.ts` | Router mount and legacy 404 behavior |
| `apps/api/tests/openapi.test.ts` | v1 auth paths; operational paths unchanged |
| `apps/api/tests/health-readiness.test.ts` | No `/api/v1/health`; existing health paths remain |
| `apps/api/tests/queue-monitor.test.ts` | No `/api/v1/ops/queues`; existing monitor remains |

## Guidance

Implementation may update `AGENTS.md` and `docs/ARCHITECTURE.md` with concise rules: server is composition root, app mounts module routers, routers own relative paths, composition owns `/api/vN/<module>`, business logic is not versioned automatically, and operational routes stay outside business version prefixes. No unrelated skill or documentation update is required.
