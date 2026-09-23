# Stale Guidance Findings

| Finding | Current evidence | Required governance treatment |
| --- | --- | --- |
| API docs described `/docs` and `/openapi.json` as current foundation | `docs/API.md`; `apps/api/src/config/openapi/openapi.ts` | Corrected to `/docs`, `/docs/v1`, and `/openapi/v1.json` with current source evidence |
| Approved be/22 target used `/api/v1/auth/*` | `tasks/be/22-api-versioning-foundation`; current routers | Target is now implemented and evidenced; verify source before future changes |
| be/21 metadata and source could diverge | `tasks/be/21...`; `app.ts`; `server.ts` | Current source/evidence reconciled; retain source-first verification rule |
| be/22 and be/23 metadata could be mistaken for proof | Their metadata and evidence | Completion status remains metadata; evidence and source are required |
| Skill references may snapshot paths/source state | `.codex/skills/quality/verification-loop/references/verification-loop.md`; `.codex/skills/security/security-review/references/security-review.md` | Prefer inspect-source/active-config/evidence workflow |
| Product/domain/design docs are placeholders | `docs/PRD.md`, `PRODUCT.md`, `DOMAIN.md`, `DESIGN.md` | Preserve `TODO: REQUIREMENT NEEDED`; do not invent content |
| External lock contains upstream skills beyond local registry | `skills-lock.json` vs `.codex/skills/` | Distinguish installed/locked upstream metadata from project activation |

## Required classification rule

No secondary document may state an approved future path or architecture as `CURRENT IMPLEMENTATION` without source and validation evidence. Current be/21–23 paths may be classified as current only because their source and recorded validation evidence exist.
