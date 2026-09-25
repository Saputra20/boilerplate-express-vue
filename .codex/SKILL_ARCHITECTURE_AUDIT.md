# Skill Architecture Audit

Audit date: 2026-09-25

## 1. Executive Summary

- Skills discovered: 27 `SKILL.md` files.
- Structurally valid skill files: 27. All contain frontmatter `name` and `description`.
- Malformed skill directories: 0.
- `.codex/README.md` does not exist.
- `.codex/REGISTRY.md` does not exist. Actual registry lives at `.codex/skills/REGISTRY.md`.
- Registry documents 19 skills while 27 skills exist on disk.
- Eight creative/UI skills are absent from registry routing: `banner-design`, `brand`, `caveman`, `design`, `design-system`, `slides`, `ui-styling`, and `ui-ux-pro-max`.
- Physical structure is mixed: 14 direct skill directories and 13 nested project skills.
- Repository contains no explicit recursive-discovery contract.
- Major overlap exists among `design`, `design-system`, `ui-styling`, `ui-ux-pro-max`, `slides`, `brand`, and `banner-design`.
- Creative skills reference unavailable skills and stale `.claude/skills` paths.
- Anti-Slop has a valid parent/specialist model, but routing conflicts exist between the core skill, registry, and `AGENTS.md`.
- Backend and Vue engineering skills match this repository well. Several creative skills are currently low-value or externally dependent.

Evidence:

- `.codex/skills/REGISTRY.md:3-43`
- `.codex/skills/README.md:1-5`
- `AGENTS.md:19-21,59-65`
- `README.md:7-13`
- `apps/api/package.json`
- `apps/cms/package.json`

## 2. Skill Inventory

| Skill | Purpose | Trigger | Project Relevance | Status |
|---|---|---|---|---|
| `antislop` | Core anti-slop filter and delivery gate | UI work; registry says every task | Specialized quality gate | Valid; routing conflict |
| `antislop-code` | Code-comment hygiene only | Editing comments | Specialized | Valid; correctly scoped |
| `antislop-copywriting` | Copy and prose quality | Marketing/product/user-facing copy | Optional | Valid; overlaps `brand` |
| `antislop-human` | Accessibility, contrast, focus, states | UI work | Specialized | Valid; overlaps UI/mobile audits |
| `antislop-layoutmobile` | Responsive/mobile audit | Responsive layout work | Specialized | Valid; overlaps UI/human audits |
| `antislop-ui` | Visual/UI anti-slop audit | Interface work | Specialized | Valid; parent specialist |
| `banner-design` | Banner and campaign asset generation | Banner, cover, hero, ad, print banner | Low-value/specialized | Partially broken external references |
| `brand` | Brand identity, voice, asset governance | Brand or style-guide work | Low-value currently | Partially broken; missing brand files |
| `caveman` | Compressed communication style | Explicit terse-output request | Optional utility | Valid; not engineering skill |
| `design` | Broad design orchestrator for brand, tokens, UI, slides, banners, logos | General design request | Redundant-candidate | Over-broad router |
| `design-system` | Tokens, component specs, Tailwind theme, slide generation | Design-system/token work | Specialized | Valid; slide overlap |
| `slides` | HTML presentations and Chart.js decks | Presentation/pitch-deck request | Optional | Valid; absent from registry |
| `ui-styling` | Tailwind/shadcn/Radix UI implementation | UI styling/components | Specialized but stack mismatch | React/shadcn assumptions conflict with CMS |
| `ui-ux-pro-max` | UI/UX research, patterns, accessibility, responsive and stack guidance | UI design/review/build | Specialized/core for UI | Valid; broad overlap |
| `api-design` | REST/OpenAPI/error/auth contract design | API contract changes | Core | Valid |
| `architecture` | Module boundaries and dependency direction | Cross-module/API/DB/planning work | Core | Valid |
| `backend-patterns` | Express/Bun/Drizzle/Redis/BullMQ implementation | Backend work | Core | Valid |
| `coding-standards` | TypeScript/Vue/Express/Bun quality | Every code change | Core | Valid |
| `database-patterns` | Drizzle/PostgreSQL schema/query/migration safety | Database work | Core | Valid |
| `frontend-patterns` | Vue/Vite/Pinia/Router/Tailwind implementation | CMS/frontend work | Core | Valid |
| `document-planning` | Converts requirements into execution contracts | Planning/task generation | Core governance | Valid |
| `code-review` | Final diff and scope review | Review/handoff | Core | Valid |
| `refactoring` | Approved behavior-preserving cleanup | Refactor task | Specialized | Valid |
| `verification-loop` | Final validation and evidence mapping | Completion | Core | Valid |
| `security-review` | Auth, JWT, RBAC, secrets, input and endpoint review | Security-sensitive work | Core | Valid |
| `browser-verification` | Rendered browser/UI verification | Meaningful UI/critical flow | Core for UI | Valid |
| `tdd-workflow` | Focused behavior tests | Behavior changes | Core | Valid |

### Required-file results

- Every discovered skill has `SKILL.md`.
- Nested project skills have local `references/` files.
- `antislop-human` has `contrast-check.py` and `contrast-mcp.py`.
- Creative skills have scripts, references, or data, but several instructions point outside this repository.
- `.codex/README.md` is missing.
- `.codex/REGISTRY.md` is missing.
- No repository-local document explicitly defines whether discovery is recursive.

## 3. Overlap Matrix

| Skill A | Skill B | Overlap | Conflict | Recommendation |
|---|---|---:|---|---|
| `design` | `ui-ux-pro-max` | HIGH | Both claim broad UI/design decision responsibility. | Make `design` a narrow router or activate only for creative asset work. |
| `design` | `design-system` | HIGH | `design` routes token work to `design-system` but also claims token ownership. | `design-system` owns tokens. |
| `design` | `ui-styling` | HIGH | Both claim UI styling responsibility. | `ui-styling` owns implementation; `design` routes only. |
| `design` | `brand` | MEDIUM | `design` routes brand work to `brand` but advertises brand identity as its own scope. | `brand` owns identity and voice. |
| `design` | `banner-design` | HIGH | `design` has built-in banner workflow and a dedicated banner skill exists. | Keep `banner-design` as specialist; remove duplicate routing later. |
| `design` | `slides` | HIGH | `design` and `design-system` both describe slide generation. | `slides` owns presentation output. |
| `design-system` | `slides` | MEDIUM | Both explicitly support slide generation. | `design-system` supplies tokens; `slides` generates decks. |
| `ui-ux-pro-max` | `ui-styling` | HIGH | Both trigger for UI building, components, responsive layouts, accessibility, and design systems. | `ui-ux-pro-max` advises; `ui-styling` implements only when compatible. |
| `ui-ux-pro-max` | `design-system` | MEDIUM | Both cover design systems, tokens, typography, and spacing. | `design-system` owns project tokens. |
| `ui-ux-pro-max` | `antislop-ui` | MEDIUM | Both audit visual quality, hierarchy, color, layout, and motion. | Design guidance first; anti-slop audit last. |
| `ui-ux-pro-max` | `antislop-human` | MEDIUM | Both cover accessibility, contrast, keyboard, focus, targets, and states. | UX guidance first; human audit last. |
| `ui-ux-pro-max` | `antislop-layoutmobile` | MEDIUM | Both cover responsive layout, breakpoints, overflow, and touch targets. | Use layout specialist only when responsive scope exists. |
| `ui-styling` | `frontend-patterns` | MEDIUM | Both influence Vue UI implementation, states, components, and responsive behavior. | `frontend-patterns` owns Vue architecture; styling skill owns CSS/components. |
| `brand` | `antislop-copywriting` | MEDIUM | Both cover tone, messaging, voice, and copy quality. | `brand` defines voice; copywriting audits output. |
| `antislop-ui` | `antislop-human` | MEDIUM | Both inspect UI quality and accessibility states. | Keep; define human as accessibility specialist. |
| `antislop-ui` | `antislop-layoutmobile` | MEDIUM | Both inspect layout and responsive behavior. | Use layoutmobile only for mobile/responsive scope. |
| `antislop-human` | `antislop-layoutmobile` | LOW/MEDIUM | Both include touch targets and mobile usability. | Human owns accessibility; layoutmobile owns responsive geometry. |
| `coding-standards` | `backend-patterns` | LOW | Both constrain code quality and backend implementation. | Keep; different abstraction levels. |
| `tdd-workflow` | `verification-loop` | MEDIUM | Both define validation and evidence. | TDD owns test design; verification owns final reporting. |
| `code-review` | `verification-loop` | MEDIUM | Both inspect diff, tests, and completion evidence. | Review owns judgment; verification owns evidence sequence. |
| `security-review` | `.codex/agents/security.md` | LOW | Both cover security. | Keep; agent is role, skill is reusable checklist. |
| `document-planning` | `.codex/agents/product.md` | LOW/MEDIUM | Both cover scope, requirements, acceptance criteria, and task breakdown. | Product protects intent; planning produces contract. |
| `caveman` | All skills | NONE | Communication style affects output, not engineering decisions. | Keep opt-in only. |

## 4. UI/UX Architecture

The intended responsibility model is sound, but current files use broad triggers and duplicate orchestration.

```text
UI request
  ↓
frontend-patterns
  ↓
ui-ux-pro-max
  ↓
design-system          only when tokens/specs change
  ↓
ui-styling             only when styling implementation is needed
  ↓
antislop-ui
  ↓
antislop-human         when accessibility matters
  ↓
antislop-layoutmobile  when responsive/mobile matters
  ↓
browser-verification
```

Boundaries:

- `frontend-patterns` owns Vue architecture, Pinia, Router, API integration, and component state. Evidence: `.codex/skills/engineering/frontend-patterns/SKILL.md`.
- `ui-ux-pro-max` owns UI/UX decision intelligence and stack-specific research. Evidence: `.codex/skills/ui-ux-pro-max/SKILL.md:7-35`.
- `design-system` owns primitive, semantic, and component tokens plus state/variant specifications. Evidence: `.codex/skills/design-system/SKILL.md:11-37`.
- `ui-styling` owns component styling and Tailwind implementation, but currently centers React, shadcn/ui, and Radix. Evidence: `.codex/skills/ui-styling/SKILL.md:20-42`.
- `antislop-ui` owns final visual anti-slop audit. Evidence: `.codex/skills/antislop-ui/SKILL.md:10-16`.
- `antislop-human` owns accessibility and inclusive interaction audit. Evidence: `.codex/skills/antislop-human/SKILL.md:10-16`.
- `antislop-layoutmobile` owns responsive/mobile audit. Evidence: `.codex/skills/antislop-layoutmobile/SKILL.md:10-14`.
- `brand` owns brand identity and voice, but expected brand source files are absent.
- `banner-design` owns banner-specific output.
- `slides` owns presentation output.
- `design` should become a routing facade or opt-in creative-production skill.

## 5. Anti-Slop Architecture

Actual model:

```text
antislop
  ├── antislop-ui
  ├── antislop-human
  ├── antislop-layoutmobile
  ├── antislop-copywriting
  └── antislop-code
```

Evidence:

- `.codex/skills/antislop/SKILL.md:16-30`
- `.codex/skills/antislop-ui/SKILL.md:10-17`
- `.codex/skills/antislop-human/SKILL.md:10-15`
- `.codex/skills/antislop-layoutmobile/SKILL.md:10-14`
- `.codex/skills/antislop-code/SKILL.md:10-17`

The specialists are complementary, not mutually exclusive:

- `antislop-ui`: visual/UI audit.
- `antislop-human`: accessibility and inclusive-use audit.
- `antislop-layoutmobile`: responsive/mobile audit.
- `antislop-copywriting`: user-facing copy audit.
- `antislop-code`: comments-only audit.

Routing conflict:

- `.codex/skills/antislop/SKILL.md:10-12` describes UI-focused use.
- `.codex/skills/REGISTRY.md:22` activates it for every approved task.
- `AGENTS.md:392-402` requires Code Anti-Slop for backend, database, refactor, configuration, and bug-fix work.

Recommended execution:

- Backend/API/database: `antislop` only; add `antislop-code` only when comments change.
- UI: `antislop` + `antislop-ui`; add human, mobile, copy, or code specialists only when scope requires them.
- Run specialists after implementation as audits, not as competing design authorities.

## 6. Recommended Classification

### CORE

- `coding-standards` — applies to every code change.
- `architecture` — matches module-boundary rules.
- `backend-patterns` — directly matches Express, Bun, Drizzle, Redis, BullMQ, Pino, and Morgan.
- `frontend-patterns` — directly matches Vue 3, Vite, Pinia, Router, Axios, and Tailwind.
- `api-design` — needed for API/OpenAPI work.
- `database-patterns` — needed for Drizzle/PostgreSQL work.
- `security-review` — needed for JWT, Argon2id, RBAC, audit, Redis, and endpoint exposure.
- `tdd-workflow` — matches Jest and Vitest.
- `verification-loop` — required by governance.
- `code-review` — final diff gate.
- `browser-verification` — required for meaningful rendered UI.
- `document-planning` — required for task-contract work.

### SPECIALIZED

- `refactoring` — approved refactor scope only.
- `antislop` — universal project quality gate.
- `antislop-ui` — UI visual audit.
- `antislop-human` — accessibility audit.
- `antislop-layoutmobile` — responsive/mobile audit.
- `antislop-copywriting` — copy audit.
- `antislop-code` — comment-only audit.
- `ui-ux-pro-max` — UI decisions and Vue-stack research.
- `design-system` — token/spec work.
- `brand` — brand identity once source files exist.
- `banner-design` — campaign assets.
- `slides` — presentation deliverables.

### OPTIONAL

- `caveman` — communication utility.
- `design` — only for creative routing or logo/CIP/icon/social work.

### LOW-VALUE

- `ui-styling` — current skill centers React, shadcn/ui, and Radix, while CMS uses Vue 3 and Tailwind without those dependencies.
- `brand` — no current brand-guideline source or design-token assets.
- `slides` — no current presentation requirement.
- `banner-design` — no current marketing-asset requirement.
- `design` — broad creative scope is not tied to current implementation work.

### REDUNDANT-CANDIDATE

- `design` — duplicates routing responsibilities of five specialist skills.
- Slide generation in `design-system` — duplicates `slides`.
- Built-in banner/slides workflows in `design` — duplicate dedicated skills.
- Implementation language in `ui-ux-pro-max` — overlaps `frontend-patterns` and `ui-styling`.
- Design-system language in `ui-styling` — overlaps `design-system`.

### BROKEN/INVALID

No malformed `SKILL.md` files found.

Partially broken operational content:

- `design` and `banner-design` reference unavailable `frontend-design`, `ai-artist`, `ai-multimodal`, and `chrome-devtools` skills.
- `design` and `brand` reference `.claude/skills/...` paths instead of `.codex/skills/...` paths.
- `brand` expects missing `docs/brand-guidelines.md`, `assets/design-tokens.json`, and `assets/design-tokens.css`.
- `skills-lock.json` records many upstream skills absent from `.codex/skills`.

Evidence:

- `.codex/skills/design/SKILL.md:26-38,134-143,219-230,253-312`
- `.codex/skills/banner-design/SKILL.md:40-65`
- `.codex/skills/brand/SKILL.md:23-50`
- `skills-lock.json`
- `apps/cms/package.json`

## 7. Routing Rules

| Task type | Primary skill | Optional support | Final audit |
|---|---|---|---|
| Build API endpoint | `backend-patterns` | `api-design`, `security-review`, `architecture` | `tdd-workflow`, `verification-loop`, `antislop` |
| Implement authentication | `backend-patterns` | `security-review`, `api-design`, `database-patterns` | `tdd-workflow`, `code-review`, `verification-loop`, `antislop` |
| Database schema/migration | `database-patterns` | `backend-patterns`, `security-review` | `tdd-workflow`, `verification-loop`, `antislop` |
| Build Vue page/component | `frontend-patterns` | `ui-ux-pro-max`, `design-system`, `ui-styling` only if needed | `antislop-ui`, `antislop-human`, `browser-verification` |
| Build dashboard | `frontend-patterns` | `ui-ux-pro-max`; `design-system` only for tokens | `antislop-ui`, `antislop-human`, `browser-verification` |
| Improve dashboard UI | `ui-ux-pro-max` | `frontend-patterns`, `design-system` | `antislop-ui`, `antislop-human`, `browser-verification` |
| Fix responsive layout | `frontend-patterns` | `antislop-layoutmobile`, `antislop-human` | `browser-verification`, `verification-loop` |
| Create design system | `design-system` | `ui-ux-pro-max`, `brand` if source exists | `antislop-ui`, `antislop-human`, `browser-verification` |
| Implement Tailwind styling | `frontend-patterns` | `design-system`; `ui-styling` only after compatibility check | `antislop-ui`, `browser-verification` |
| Create logo/brand identity | `brand` | `design` only for logo/CIP tooling | `antislop-copywriting` for voice/copy |
| Create banner/hero asset | `banner-design` | `brand`, `ui-ux-pro-max` | `antislop-ui`, rendered inspection |
| Create presentation | `slides` | `design-system`, `brand` | `verification-loop` |
| Review component | `code-review` | `ui-ux-pro-max`, human/mobile specialists as applicable | `browser-verification` when rendered behavior matters |
| Refactor frontend | `refactoring` | `coding-standards`, `frontend-patterns`, `tdd-workflow` | `verification-loop`, `antislop` |
| Review code quality | `code-review` | `coding-standards`, `security-review` if relevant | `verification-loop`, `antislop` |
| Generate task contract | `document-planning` | `architecture`, API/database/security skills as applicable | `verification-loop`, `antislop` |
| Compress response style | `caveman` | None | None |

Do not automatically activate `design`, `ui-ux-pro-max`, `design-system`, and `ui-styling` together. Do not automatically activate every Anti-Slop specialist for every UI task.

## 8. Proposed Logical Groups

### Engineering

`architecture`, `coding-standards`, `backend-patterns`, `frontend-patterns`, `api-design`, `database-patterns`

### Planning

`document-planning`

### Quality

`code-review`, `refactoring`, `verification-loop`

### Testing

`tdd-workflow`, `browser-verification`

### Security

`security-review`

### Anti-Slop

`antislop`, `antislop-code`, `antislop-copywriting`, `antislop-human`, `antislop-layoutmobile`, `antislop-ui`

### UI/UX

`ui-ux-pro-max`, `design-system`, `ui-styling`

### Creative

`brand`, `design`, `banner-design`, `slides`

### Agent Utilities

`caveman`

The existing nested structure reflects these groups. It should remain unchanged until discovery behavior is explicitly documented.

## 9. Proposed Changes

### P0 — Correctness / discovery

#### Establish one canonical registry path

- **Why:** `AGENTS.md` and `.codex/skills/README.md` point to `.codex/skills/REGISTRY.md`, while requested scope references `.codex/REGISTRY.md`; only the former exists.
- **Risk:** path changes can break agent assumptions.
- **Files:** `.codex/skills/REGISTRY.md`, `.codex/skills/README.md`, `AGENTS.md`, possibly `.codex/README.md`.

#### Document discovery behavior

- **Why:** nested skills exist, but no local document proves recursive discovery.
- **Risk:** flattening could break references; leaving ambiguity can cause silent non-discovery.
- **Files:** `.codex/skills/README.md`, `.codex/skills/REGISTRY.md`.

#### Reconcile registry with disk

- **Why:** eight creative/UI skills are absent from registry routing.
- **Risk:** adding broad skills without boundaries may increase activation noise.
- **Files:** `.codex/skills/REGISTRY.md`.

### P1 — Conflicting or highly redundant skills

#### Narrow `design` into an explicit router

- **Why:** it duplicates `brand`, `design-system`, `ui-styling`, `banner-design`, and `slides`.
- **Risk:** current creative workflows may depend on orchestration.
- **Files:** `.codex/skills/design/SKILL.md`, `.codex/skills/REGISTRY.md`.

#### Remove slide ownership from `design-system`

- **Why:** presentation output belongs to `slides`.
- **Risk:** existing slide workflows may rely on token activation.
- **Files:** `.codex/skills/design-system/SKILL.md`, `.codex/skills/slides/SKILL.md`.

#### Narrow `ui-styling` to Vue/Tailwind-compatible implementation

- **Why:** current skill says React-based frameworks and centers shadcn/Radix, while CMS uses Vue 3/Tailwind.
- **Risk:** shadcn guidance may be needed if stack changes later.
- **Files:** `.codex/skills/ui-styling/SKILL.md`.

#### Resolve creative external dependencies

- **Why:** `design` and `banner-design` invoke unavailable skills and stale paths.
- **Risk:** replacement tooling requires a deliberate choice.
- **Files:** `.codex/skills/design/SKILL.md`, `.codex/skills/banner-design/SKILL.md`, related references.

### P2 — Routing/governance

#### Add deterministic task routing table

- **Why:** current registry lacks primary, optional, and final-audit precedence.
- **Files:** `.codex/skills/REGISTRY.md`, possibly `AGENTS.md`.

#### Define Anti-Slop parent/specialist routing

- **Why:** skill files define parent/child behavior, but registry lists independent triggers.
- **Files:** `.codex/skills/REGISTRY.md`, `AGENTS.md`.

#### Map role agents to reusable skills

- **Why:** `.codex/agents/*.md` define roles but do not map to skills.
- **Files:** `.codex/agents/*.md`, `.codex/skills/REGISTRY.md`.

### P3 — Cleanup/documentation

#### Reconcile `skills-lock.json`

- **Why:** lockfile contains many upstream skills absent locally.
- **Risk:** lockfile changes may affect installation tooling.
- **Files:** `skills-lock.json`.

#### Remove stale `.claude/skills` paths

- **Why:** repository uses `.codex/skills`; stale commands are not reproducible.
- **Risk:** some upstream scripts may intentionally expect Claude-compatible paths.
- **Files:** creative skill files and references.

#### Resolve brand source-of-truth gap

- **Why:** `brand` expects files that do not exist.
- **Risk:** creating brand files would invent product direction.
- **Files:** `brand` documentation only unless branding is approved.

## 10. KEEP / REVIEW / REMOVE-CANDIDATE

| Skill | Decision | Reason | Replacement/Relationship |
|---|---|---|---|
| `antislop` | KEEP | Required project quality gate. | Parent of Anti-Slop specialists |
| `antislop-code` | KEEP-SPECIALIZED | Narrow comments-only responsibility. | Load only for comment changes |
| `antislop-copywriting` | KEEP-SPECIALIZED | Distinct copy audit. | Pair with `brand` when brand voice exists |
| `antislop-human` | KEEP-SPECIALIZED | Distinct accessibility audit. | Pair with UI work |
| `antislop-layoutmobile` | KEEP-SPECIALIZED | Distinct responsive audit. | Pair with responsive work |
| `antislop-ui` | KEEP-SPECIALIZED | Distinct visual audit. | Final UI audit |
| `api-design` | KEEP | Direct API/OpenAPI value. | Engineering core |
| `architecture` | KEEP | Direct module-boundary value. | Engineering core |
| `backend-patterns` | KEEP | Direct stack match. | Engineering core |
| `browser-verification` | KEEP | Required rendered UI verification. | Testing core |
| `brand` | KEEP-SPECIALIZED | Valid distinct domain, currently unused. | Review missing source files |
| `banner-design` | KEEP-SPECIALIZED | Narrow creative output. | Review unavailable dependencies |
| `caveman` | KEEP-SPECIALIZED | Communication utility. | Never auto-load |
| `code-review` | KEEP | Final diff gate. | Quality core |
| `coding-standards` | KEEP | Applies to every code change. | Engineering core |
| `database-patterns` | KEEP | Direct Drizzle/PostgreSQL match. | Engineering core |
| `design` | REVIEW | Broad umbrella duplicates specialist skills. | Narrow to router or creative-only |
| `design-system` | KEEP-SPECIALIZED | Valuable token/spec responsibility. | Remove slide ownership |
| `document-planning` | KEEP | Task-contract responsibility. | Planning core |
| `frontend-patterns` | KEEP | Direct Vue CMS match. | Engineering core |
| `refactoring` | KEEP-SPECIALIZED | Approved-scope cleanup. | Quality |
| `security-review` | KEEP | Direct auth/security match. | Security core |
| `slides` | KEEP-SPECIALIZED | Distinct presentation output. | Remove duplicate slide ownership |
| `tdd-workflow` | KEEP | Direct Jest/Vitest match. | Testing core |
| `ui-styling` | REVIEW | Useful concept, wrong primary stack assumptions. | Narrow to Vue/Tailwind or defer |
| `ui-ux-pro-max` | KEEP-SPECIALIZED | Strong UI/UX intelligence. | Advice layer before implementation |
| `verification-loop` | KEEP | Required final evidence gate. | Quality core |

No skill should be removed solely from this audit.

## 11. Proposed Final Structure

Preserve current physical paths until discovery behavior is explicitly documented:

```text
.codex/
├── agents/
├── skills/
│   ├── REGISTRY.md
│   ├── README.md
│   ├── UPSTREAM_AUDIT.md
│   ├── antislop/
│   ├── antislop-code/
│   ├── antislop-copywriting/
│   ├── antislop-human/
│   ├── antislop-layoutmobile/
│   ├── antislop-ui/
│   ├── banner-design/
│   ├── brand/
│   ├── caveman/
│   ├── design/
│   ├── design-system/
│   ├── slides/
│   ├── ui-styling/
│   ├── ui-ux-pro-max/
│   ├── engineering/
│   │   ├── api-design/
│   │   ├── architecture/
│   │   ├── backend-patterns/
│   │   ├── coding-standards/
│   │   ├── database-patterns/
│   │   └── frontend-patterns/
│   ├── planning/document-planning/
│   ├── quality/
│   ├── security/security-review/
│   └── testing/
└── workflows/
```

This structure is acceptable only if the registry maps every skill name to its exact path and discovery behavior is verified. Do not flatten or nest further without confirming Codex discovery requirements.

## 12. AGENTS.md Recommendations

Do not apply yet. Recommended routing text:

```text
## Skill Routing

Use `.codex/skills/REGISTRY.md` as canonical skill activation map. Registry must map every discovered `SKILL.md` to its exact path.

Load smallest complete skill set:

- All code changes: `coding-standards`, `verification-loop`, `antislop`.
- Backend/API: add `backend-patterns`; add `api-design`, `security-review`, `architecture`, or `database-patterns` only when scope requires them.
- Frontend/Vue: add `frontend-patterns`; add `ui-ux-pro-max` only for UI/UX decisions.
- Design tokens/specs: use `design-system`; do not load `design` or `ui-styling` automatically.
- UI styling implementation: use `ui-styling` only when its documented stack matches repository stack.
- UI audit: use `antislop-ui`; add `antislop-human` for accessibility and `antislop-layoutmobile` for responsive/mobile scope.
- User-facing copy: add `antislop-copywriting`.
- Code comments: add `antislop-code`; this skill may modify comments only.
- Behavior changes: add `tdd-workflow`.
- Rendered UI or critical browser flow: add `browser-verification`.
- Review: use `code-review`; add `security-review` when security-sensitive.
- Refactor: use `refactoring`; do not load creative/UI skills unless scope requires them.
- Brand, banners, presentations, and logos activate only on explicit creative requests.
- `caveman` activates only when communication compression is explicitly requested.

Do not load umbrella and specialist skills together unless the routing table states the ordering and responsibility split.
```

## 13. Audit Gate

- No files deleted.
- No skills moved.
- No packages installed.
- No application code changed during audit.
- Audit was read-only before this report was created.
- Existing working-tree changes predated report creation and were not modified by the audit.

AUDIT PASS — recommendations ready for approval
