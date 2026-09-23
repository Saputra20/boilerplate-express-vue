# Stale Guidance Findings

| Finding | Current evidence | Required governance treatment |
| --- | --- | --- |
| API docs describe `/docs` and `/openapi.json` as current foundation | `docs/API.md`; `apps/api/src/config/openapi/openapi.ts` | Keep as current until be/23 executes; label `/docs/v1` and `/openapi/v1.json` as approved target |
| Approved be/22 target uses `/api/v1/auth/*` | `tasks/be/22-api-versioning-foundation`; source still uses `/auth/*` | Do not claim versioned routes are live |
| be/21 says Ready but source still has pre-refactor composition | `tasks/be/21...`; `app.ts`; `server.ts` | Require source/evidence verification before successor work |
| be/22 and be/23 are Planned | Their metadata | Treat as contracts only |
| Skill references may snapshot paths/source state | `.codex/skills/quality/verification-loop/references/verification-loop.md`; `.codex/skills/security/security-review/references/security-review.md` | Prefer inspect-source/active-config/evidence workflow |
| Product/domain/design docs are placeholders | `docs/PRD.md`, `PRODUCT.md`, `DOMAIN.md`, `DESIGN.md` | Preserve `TODO: REQUIREMENT NEEDED`; do not invent content |
| External lock contains upstream skills beyond local registry | `skills-lock.json` vs `.codex/skills/` | Distinguish installed/locked upstream metadata from project activation |

## Required classification rule

No secondary document may state an approved future path or architecture as `CURRENT IMPLEMENTATION` without source and validation evidence.
