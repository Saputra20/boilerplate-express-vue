# Skill Registry

Canonical registry for project skill discovery, responsibility, and activation. Keep this file aligned with every `SKILL.md` under `.codex/skills/**`.

Catalog paths are relative to `.codex/skills/` and identify exact files on disk.

Skill files define execution methods. `AGENTS.md` defines governance and approval. Source, tests, manifests, and active configuration define implementation truth.

## Catalog

| Skill | Path | Category | Primary responsibility | Activation | Optional support | Final audit | Non-goals |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `api-design` | `engineering/api-design/SKILL.md` | Engineering | REST, error, auth, and OpenAPI contracts | API contract changes | `architecture`, `security-review`, `backend-patterns` | `tdd-workflow`, `verification-loop` | Does not invent endpoints or permissions |
| `architecture` | `engineering/architecture/SKILL.md` | Engineering | Module boundaries and dependency direction | Cross-module or boundary changes | Relevant engineering skill | `code-review`, `verification-loop` | Does not authorize architecture outside approved scope |
| `backend-patterns` | `engineering/backend-patterns/SKILL.md` | Engineering | Express/Bun/Drizzle/Redis/BullMQ implementation | Backend, worker, Redis, or queue work | `api-design`, `database-patterns`, `security-review` | `tdd-workflow`, `verification-loop`, `antislop` | Does not define product behavior |
| `coding-standards` | `engineering/coding-standards/SKILL.md` | Engineering | TypeScript/Vue/Express/Bun code quality | Every code change | Relevant primary skill | `verification-loop`, `antislop` | Does not replace domain-specific patterns |
| `database-patterns` | `engineering/database-patterns/SKILL.md` | Engineering | Drizzle/PostgreSQL schemas, migrations, and queries | Schema, migration, repository, or query work | `backend-patterns`, `security-review` | `tdd-workflow`, `verification-loop`, `antislop` | Does not perform destructive changes without approval |
| `frontend-patterns` | `engineering/frontend-patterns/SKILL.md` | Engineering | Vue 3/Vite/Pinia/Router/Tailwind architecture and implementation | CMS/frontend work | `ui-ux-pro-max`, `design-system`, `ui-styling` only when needed | `tdd-workflow`, `browser-verification`, `verification-loop` | Does not own backend authorization or visual direction |
| `document-planning` | `planning/document-planning/SKILL.md` | Planning | Execution contracts and task planning | New task or planning work | `architecture`, contract-specific skills | `verification-loop`, `antislop` | Does not invent product requirements |
| `code-review` | `quality/code-review/SKILL.md` | Quality | Final diff, scope, security, and maintainability review | Review or handoff | `security-review`, relevant domain skill | `verification-loop` | Does not expand approved scope |
| `refactoring` | `quality/refactoring/SKILL.md` | Quality | Approved behavior-preserving cleanup | Explicit refactor task | `coding-standards`, relevant pattern skill | `tdd-workflow`, `verification-loop`, `antislop` | Does not change behavior without separate approval |
| `verification-loop` | `quality/verification-loop/SKILL.md` | Quality | Applicable checks and completion evidence | Completion of every approved task | `browser-verification`, `code-review` | N/A; final evidence gate | Does not make tests, build, or visual checks equivalent |
| `security-review` | `security/security-review/SKILL.md` | Security | Auth, JWT, RBAC, secrets, input, and endpoint review | Security-sensitive work | `api-design`, `backend-patterns`, `database-patterns` | `code-review`, `verification-loop` | Does not approve product policy or credentials |
| `browser-verification` | `testing/browser-verification/SKILL.md` | Testing | Rendered Vue UI and critical browser-flow verification | Meaningful UI or critical browser flow | `frontend-patterns`, applicable Anti-Slop specialist | `verification-loop` | Does not claim inspection without browser evidence |
| `tdd-workflow` | `testing/tdd-workflow/SKILL.md` | Testing | Focused unit, integration, and component tests | Behavior changes | Relevant engineering skill | `verification-loop`, `antislop` | Does not add coverage theater |
| `antislop` | `antislop/SKILL.md` | Anti-Slop | Core quality filter and delivery gate | Every approved task under project governance | Conditional Anti-Slop specialists | `verification-loop` | Does not replace project governance or approval |
| `antislop-code` | `antislop-code/SKILL.md` | Anti-Slop | Code-comment hygiene | Code comment changes only | `antislop` | `verification-loop` | Does not modify executable code |
| `antislop-copywriting` | `antislop-copywriting/SKILL.md` | Anti-Slop | User-facing copy quality | Copy, prose, CTA, or messaging changes | `antislop`, `brand` when brand source exists | `verification-loop` | Does not define brand identity |
| `antislop-human` | `antislop-human/SKILL.md` | Anti-Slop | Accessibility and inclusive interaction audit | UI accessibility or inclusive-use scope | `antislop`, `antislop-ui` | `browser-verification`, `verification-loop` | Does not replace responsive geometry audit |
| `antislop-layoutmobile` | `antislop-layoutmobile/SKILL.md` | Anti-Slop | Responsive/mobile geometry audit | Responsive or mobile scope | `antislop`, `antislop-human` | `browser-verification`, `verification-loop` | Does not apply to backend-only work |
| `antislop-ui` | `antislop-ui/SKILL.md` | Anti-Slop | Post-implementation visual/UI audit | UI implementation or visual review | `antislop`, conditional human/mobile/copy specialists | `browser-verification`, `verification-loop` | Does not own initial UX or token decisions |
| `banner-design` | `banner-design/SKILL.md` | Creative | Banner, cover, hero, ad, and print asset work | Explicit banner/creative asset request | `brand`, `ui-ux-pro-max` | `antislop-ui`, rendered inspection | Does not activate for normal application UI |
| `brand` | `brand/SKILL.md` | Creative | Brand identity, voice, assets, and consistency | Explicit branding request | `antislop-copywriting`, `design-system` | `verification-loop` | Does not invent product brand requirements |
| `caveman` | `caveman/SKILL.md` | Agent utility | Communication/output compression | Explicit style request only | None | None | Never changes architecture, security, scope, tests, or verification |
| `design` | `design/SKILL.md` | Creative | Creative-production router plus logo, CIP, icon, and social-image capabilities | Explicit creative-production request | `brand`, `design-system`, `banner-design`, `slides`, `ui-ux-pro-max` as routed | `verification-loop` | Does not own UI/UX, tokens, app UI implementation, banners, presentations, or brand identity |
| `design-system` | `design-system/SKILL.md` | UI/UX | Tokens, typography, spacing, component specs, variants, and states | Explicit design-system/token/spec request | `brand`, `ui-ux-pro-max`, `frontend-patterns` | `antislop-ui`, `browser-verification`, `verification-loop` | Does not own final presentation generation |
| `slides` | `slides/SKILL.md` | Creative | Strategic HTML presentations and Chart.js decks | Explicit presentation request | `brand`, `design-system` | `verification-loop` | Does not activate for normal product UI |
| `ui-styling` | `ui-styling/SKILL.md` | UI/UX | Framework-compatible styling implementation | Explicit styling implementation after stack check | `frontend-patterns`, `design-system` | `antislop-ui`, `browser-verification`, `verification-loop` | Does not install React, shadcn, Radix, or other dependencies |
| `ui-ux-pro-max` | `ui-ux-pro-max/SKILL.md` | UI/UX | UI/UX intelligence, research, interaction, accessibility, and responsive recommendations | UI/UX decision or review | `frontend-patterns`, `design-system`, `brand` when applicable | `antislop-ui`, `browser-verification`, `verification-loop` | Does not own Vue architecture, token files, or CSS implementation |

Sources/origins are documented in `.codex/skills/UPSTREAM_AUDIT.md` and individual skill metadata. Project engineering skills are adapted from ECC/project sources; Anti-Slop skills are external/additive; creative skills contain upstream metadata where present.

## Deterministic Routing

Principle: **load the smallest complete skill set**. Do not activate overlapping skills only because they share keywords.

| Task type | PRIMARY | OPTIONAL SUPPORT | FINAL AUDIT |
| --- | --- | --- | --- |
| Backend/API | `backend-patterns` | `api-design`, `architecture`, `security-review` when applicable | `tdd-workflow`, `verification-loop`, `antislop` |
| Database | `database-patterns` | `backend-patterns`, `security-review` when sensitive | `tdd-workflow`, `verification-loop`, `antislop` |
| Authentication/security | `security-review` | `backend-patterns`, `api-design`, `database-patterns` | `tdd-workflow`, `code-review`, `verification-loop`, `antislop` |
| Vue frontend implementation | `frontend-patterns` | `coding-standards`; `api-design` for API contract changes | `tdd-workflow`, `verification-loop`, `antislop` |
| UI/UX design decision | `ui-ux-pro-max` | `frontend-patterns` when implementation follows; `brand` when approved brand source exists | `antislop-ui`, `browser-verification`, `verification-loop` |
| Design-system changes | `design-system` | `ui-ux-pro-max`, `brand`, `frontend-patterns` when implemented | `antislop-ui`, `browser-verification`, `verification-loop` |
| Tailwind styling | `frontend-patterns` | `ui-styling`, `design-system` when tokens change | `antislop-ui`, `browser-verification`, `verification-loop` |
| Responsive/mobile fix | `frontend-patterns` | `antislop-layoutmobile`, `antislop-human` when accessibility applies | `browser-verification`, `verification-loop` |
| Accessibility | `antislop-human` | `frontend-patterns`, `ui-ux-pro-max` when design changes | `browser-verification`, `verification-loop` |
| UI review | `code-review` | `ui-ux-pro-max`, `antislop-ui`, `antislop-human`, `antislop-layoutmobile` as applicable | `browser-verification`, `verification-loop` |
| Code review | `code-review` | `security-review` when sensitive | `verification-loop`, `antislop` |
| Refactoring | `refactoring` | `coding-standards`, relevant engineering skill | `tdd-workflow`, `verification-loop`, `antislop` |
| Testing | `tdd-workflow` | Relevant implementation skill | `verification-loop`, `antislop` |
| Browser verification | `browser-verification` | Relevant frontend/UI specialist | `verification-loop` |
| Branding | `brand` | `antislop-copywriting`, `design-system` when tokens are explicitly in scope | `verification-loop` |
| Banner creation | `banner-design` | `brand`, `ui-ux-pro-max` | `antislop-ui`, rendered inspection, `verification-loop` |
| Presentation creation | `slides` | `brand`, `design-system` | `verification-loop` |
| Copywriting | `antislop-copywriting` | `brand` when brand voice exists | `verification-loop` |
| Task planning | `document-planning` | `architecture` and contract-specific skills | `verification-loop`, `antislop` |
| Communication compression | `caveman` | None | None |

### UI execution order

```text
frontend-patterns
  → ui-ux-pro-max when UI/UX decisions are in scope
  → design-system only when tokens/specifications change
  → ui-styling only when styling implementation is in scope and stack-compatible
  → antislop-ui
  → antislop-human when accessibility applies
  → antislop-layoutmobile when responsive/mobile applies
  → browser-verification
  → verification-loop
```

Example: adding API data to an existing Vue table normally uses `frontend-patterns`, relevant API/testing skills, and final verification. It does not automatically load `ui-ux-pro-max`, `design-system`, or `ui-styling`.

### Anti-Slop execution order

```text
implementation
  → antislop
  → applicable specialist audit
  → browser-verification when rendered behavior matters
  → verification-loop
```

Specialists are conditional: `antislop-ui` for visual UI, `antislop-human` for accessibility, `antislop-layoutmobile` for responsive/mobile scope, `antislop-copywriting` for user-facing copy, and `antislop-code` for comments only.

## Physical and Logical Organization

Physical filesystem grouping is independent from logical registry categories. Current nested groups under `engineering/`, `planning/`, `quality/`, `security/`, and `testing/` remain unchanged. Direct creative and Anti-Slop directories also remain unchanged.

Native recursive skill listing is **VERIFIED for `codex-cli 0.156.1`** by `codex debug prompt-input`: direct and nested `SKILL.md` paths appeared in model-visible prompt context. End-to-end task-triggered activation remains **NOT VERIFIED** because the Phase 3 `codex exec` probe failed during authentication/model initialization. This is verified host-runtime behavior for the tested Codex version, not a cross-version guarantee. The registry records exact relative paths for deterministic project governance and routing; do not flatten or move directories.

## Lockfile

`skills-lock.json` is not an activation registry. Its absent local upstream entries are not changed here because repository tooling does not document safe synchronization behavior. Treat lockfile reconciliation as follow-up work.

Load only applicable skills. `AGENTS.md` and approved task scope remain higher authority.
