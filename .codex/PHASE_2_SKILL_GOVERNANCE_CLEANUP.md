# Phase 2 Skill Governance Cleanup

Date: 2026-09-25

## Summary

- Rebuilt `.codex/skills/REGISTRY.md` as canonical registry.
- Registered all 27 discovered skills with exact paths, categories, responsibilities, activation rules, optional support, final audits, and non-goals.
- Added deterministic `PRIMARY → OPTIONAL SUPPORT → FINAL AUDIT` routing.
- Added UI/UX responsibility boundaries and smallest-complete-skill-set guidance.
- Narrowed `design` into creative routing plus logo, CIP, icon, and social-image capabilities.
- Narrowed `design-system` to tokens, specifications, variants, states, and governance.
- Kept presentation generation owned by `slides`.
- Adapted `ui-styling` to Vue 3 + Vite + Tailwind without automatic React/shadcn/Radix dependencies.
- Clarified Anti-Slop parent/specialist routing and conditional activation.
- Kept `brand`, `banner-design`, and `slides` explicit/on-demand.
- Documented unavailable creative dependencies and unresolved recursive discovery status.
- Preserved `skills-lock.json`; no synchronization behavior was documented.

## Registry

- Skills on disk: **27**
- Skills registered: **27**
- Missing entries: **none**
- Missing registry paths: **none**
- Canonical registry: `.codex/skills/REGISTRY.md`
- `.codex/REGISTRY.md`: not created
- `.codex/README.md`: remains absent

## Routing

- Backend/API: `backend-patterns` → optional `api-design`/`architecture`/`security-review` → tests + verification + `antislop`.
- Database: `database-patterns` → optional backend/security support → tests + verification.
- Authentication/security: `security-review` → backend/API/database support → tests + review + verification.
- Vue frontend: `frontend-patterns` → optional API support → tests + verification.
- UI/UX decisions: `ui-ux-pro-max` → optional frontend support → UI audit + browser verification.
- Design system: `design-system` → optional UX/brand/frontend support → UI audit + verification.
- Tailwind styling: `frontend-patterns` → `ui-styling` only when styling is in scope → UI audit + browser verification.
- Responsive/mobile: `frontend-patterns` → `antislop-layoutmobile` and optional `antislop-human` → browser verification.
- Accessibility: `antislop-human` → optional frontend/UX support → browser verification.
- UI review: `code-review` → applicable UI specialists → browser verification.
- Testing: `tdd-workflow` → relevant implementation skill → verification.
- Creative: `brand`, `banner-design`, and `slides` activate only on explicit requests.
- Communication compression: `caveman` is opt-in only.

## Responsibility Changes

### `design`

No longer owns UI/UX decisions, tokens, app UI implementation, banners, presentations, or brand identity. Routes those responsibilities to owning skills. Preserves logo, CIP, icon, and social-image capabilities.

### `design-system`

Owns primitive/semantic/component tokens, typography, spacing, component specifications, variants, states, and design-system governance. Slide datasets remain supporting material. `slides` owns final presentation output.

### `ui-styling`

Defaults to Vue SFCs, Tailwind, semantic HTML, existing project components, and framework-neutral styling guidance. Does not install or automatically route to React, shadcn/ui, Radix UI, or another component library.

### Anti-Slop

- `antislop`: core project quality gate.
- `antislop-ui`: visual UI audit.
- `antislop-human`: accessibility/inclusive interaction audit.
- `antislop-layoutmobile`: responsive/mobile audit.
- `antislop-copywriting`: user-facing copy audit.
- `antislop-code`: comments-only audit.

Execution order:

```text
implementation
  → antislop
  → applicable specialist audit
  → browser-verification when rendered behavior matters
  → verification-loop
```

## Dependency Problems

Unavailable creative dependencies remain documented, not replaced:

- `frontend-design`
- `ai-artist`
- `ai-multimodal`
- `chrome-devtools`

Normal application workflows do not require these dependencies. Existing `.claude/skills/...` references belonging to unavailable external tools remain documented as unresolved. Local `design` script paths were updated to `.codex/skills/...` where equivalent files exist.

`brand` still expects these absent product files:

- `docs/brand-guidelines.md`
- `assets/design-tokens.json`
- `assets/design-tokens.css`

No brand requirements were invented.

## Discovery

**UNVERIFIED**

All 27 `SKILL.md` files exist and have valid frontmatter. Registry paths identify exact files. Repository evidence does not prove recursive Codex discovery for nested category folders. No skill directories were flattened, moved, or deleted.

## Verification

| Check | Result |
|---|---|
| Every `SKILL.md` appears in registry | PASS |
| Every registry path exists | PASS |
| No registry entry references nonexistent skill | PASS |
| Automatic routing requires no unavailable creative dependency | PASS |
| UI routing has deterministic primary/support/audit semantics | PASS |
| Anti-Slop specialist activation is conditional | PASS |
| `design` no longer competes with specialist ownership | PASS |
| `design-system` no longer owns presentation generation | PASS |
| `ui-styling` no longer assumes incompatible dependencies by default | PASS |
| `caveman` remains opt-in | PASS |
| No skill directories moved | PASS |
| No skill directories deleted | PASS |
| No application source code changed | PASS |
| Existing unrelated working-tree changes preserved | PASS |
| `git diff --check` | PASS |
| Markdown-specific validator | NOT RUN — no configured validator found |

## Git Scope

Modified by Phase 2:

- `AGENTS.md`
- `.codex/skills/README.md`
- `.codex/skills/REGISTRY.md`
- `.codex/skills/antislop/SKILL.md`
- `.codex/skills/banner-design/SKILL.md`
- `.codex/skills/design/SKILL.md`
- `.codex/skills/design-system/SKILL.md`
- `.codex/skills/ui-styling/SKILL.md`

Not modified:

- `.codex/agents/**`
- `apps/**`
- `skills-lock.json`
- skill directories moved/deleted: none
- packages installed/uninstalled: none

Pre-existing changes to `apps/api/package.json`, `bun.lock`, and untracked audit/creative files remain preserved.

PHASE 2 PASS — skill governance cleanup complete
