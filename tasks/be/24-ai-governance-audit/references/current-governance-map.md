# Current Governance Map

| Area | Current owner | Current truth | Audit focus |
| --- | --- | --- | --- |
| Authority and hard stops | `AGENTS.md` | Current governance | Preserve hierarchy; remove contradiction only with evidence |
| Durable project/runtime guidance | `docs/**` | Mixed and sparse | Separate current routes from approved targets |
| Reusable execution methods | `.codex/skills/**` | Project skills plus external Anti-Slop | Remove brittle source snapshots and clarify activation |
| Task contracts | `tasks/**` | be/21 Ready; be/22–23 Planned | Status is metadata, not implementation proof |
| Implementation truth | `apps/api/src/**`, tests, manifests | Pre-be/21–23 architecture | Inspect before claiming target state |
| External skill lock | `skills-lock.json` | Upstream lock inventory | Compare with actual installed/project registry |

## Observed source state

- `app.ts` still accepts positional auth services and installs individual routes.
- `server.ts` still constructs individual auth repositories/services.
- Auth routes remain `/auth/*`.
- OpenAPI remains TypeScript-object based and serves `/docs` and `/openapi.json`.
- No source evidence currently proves `/api/v1`, YAML OpenAPI, `/docs/v1`, or `/openapi/v1.json`.

These are current implementation facts, not recommendations for be/24 runtime changes.
