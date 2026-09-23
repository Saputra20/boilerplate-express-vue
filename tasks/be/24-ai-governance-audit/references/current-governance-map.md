# Current Governance Map

| Area | Current owner | Current truth | Audit focus |
| --- | --- | --- | --- |
| Authority and hard stops | `AGENTS.md` | Current governance | Preserve hierarchy; remove contradiction only with evidence |
| Durable project/runtime guidance | `docs/**` | Mixed and sparse | Separate current routes from approved targets |
| Reusable execution methods | `.codex/skills/**` | Project skills plus external Anti-Slop | Remove brittle source snapshots and clarify activation |
| Task contracts | `tasks/**` | be/21–23 Complete with recorded evidence; be/24 current execution | Status is metadata; source and evidence still decide implementation |
| Implementation truth | `apps/api/src/**`, tests, manifests | Current source matches be/21–23 recorded targets | Recheck source and validation before extending architecture |
| External skill lock | `skills-lock.json` | Upstream lock inventory | Compare with actual installed/project registry |

## Observed source state

- `app.ts` mounts the auth v1 router at `/api/v1/auth` and keeps operational routes separate.
- `server.ts` composes the auth module at module granularity.
- Auth routes are `/api/v1/auth/*`; legacy `/auth/*` is not mounted.
- OpenAPI loads module-owned YAML and serves `/docs`, `/docs/v1`, and `/openapi/v1.json`.
- be/21–23 source and recorded validation evidence support the current target state; future v2 remains deferred.

These are current implementation facts, not recommendations for be/24 runtime changes.
