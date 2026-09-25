# Codex Skill Discovery Verification

Verification date: 2026-09-25

## 1. Environment

- Codex version: `codex-cli 0.156.1` from `codex --version`.
- Operating environment: macOS, repository root `/Users/dctrl/Project/Personal/boilerplate-express-vue`.
- Relevant repository configuration: `AGENTS.md`, `.codex/skills/README.md`, `.codex/skills/REGISTRY.md`, `.codex/agents/`.
- Codex user configuration: `~/.codex/config.toml`; it selects a model provider, but does not define repository skill discovery.
- Project skills on disk: 27 `SKILL.md` files.
- Registry entries: 27 skill rows in `.codex/skills/REGISTRY.md`.

## 2. Discovery Mechanism

### Native Codex discovery

`codex debug prompt-input 'List available project skills and source paths only. Do not modify files.'` rendered model-visible skill context containing both direct and nested paths:

- Direct: `r0/ui-ux-pro-max/SKILL.md`, `r0/design/SKILL.md`, `r0/antislop/SKILL.md`.
- Nested engineering: `r0/engineering/api-design/SKILL.md`, `r0/engineering/frontend-patterns/SKILL.md`, and other engineering skills.
- Nested planning: `r0/planning/document-planning/SKILL.md`.
- Nested quality: `r0/quality/code-review/SKILL.md`, `r0/quality/refactoring/SKILL.md`, `r0/quality/verification-loop/SKILL.md`.
- Nested security: `r0/security/security-review/SKILL.md`.
- Nested testing: `r0/testing/browser-verification/SKILL.md`, `r0/testing/tdd-workflow/SKILL.md`.

This is direct evidence that the installed Codex host skill discovery scans nested paths under the repository skill root. The generated context identifies source files with exact nested paths; it does not rely on directory names alone.

### Registry-driven routing

`AGENTS.md` instructs agents to load project skills from `.codex/skills/REGISTRY.md`. `.codex/skills/REGISTRY.md` is governance and routing metadata. No repository script, package script, directory walker, or custom resolver was found that implements native discovery.

The registry is therefore required for deterministic project routing, but native discovery is not proven to consume the registry. Nested skills appeared in Codex prompt context independently of registry loading.

### Public CLI surface

`codex --help` exposes `debug`, `exec`, `doctor`, `features`, and related commands, but no public `skills list`, `skills inspect`, or `skills debug` command. `codex debug --help` exposes `models`, `app-server`, and `prompt-input`; `prompt-input` is the available discovery evidence mechanism.

`codex features list` reports `skill_search` as stable and enabled. `skip_host_skill_discovery` is under development and disabled.

## 3. Direct Skill Test

- Skill: `ui-ux-pro-max`
- Path: `.codex/skills/ui-ux-pro-max/SKILL.md`
- Discovery result: **DISCOVERED**.
- Load result: **LISTED IN MODEL-VISIBLE CONTEXT**.
- Trigger result: **NOT VERIFIED END-TO-END**.
- Evidence: `codex debug prompt-input ...` emitted `r0/ui-ux-pro-max/SKILL.md`.

An activation probe using `codex exec --ephemeral --sandbox read-only` could not reach a model response. Codex returned `invalidated oauth token`, `refresh_token_invalidated`, and `The 'gpt-5.4-mini' model is not supported when using Codex with a ChatGPT account.` This is an environment authentication/model failure, not a discovery failure.

## 4. Nested Skill Test

- Skill: `api-design`
- Path: `.codex/skills/engineering/api-design/SKILL.md`
- Discovery result: **DISCOVERED RECURSIVELY**.
- Load result: **LISTED IN MODEL-VISIBLE CONTEXT**.
- Trigger result: **NOT VERIFIED END-TO-END**.
- Evidence: `codex debug prompt-input ...` emitted `r0/engineering/api-design/SKILL.md`.

Equivalent activation probing failed before model response with the same Codex authentication/model error recorded above. Therefore, native recursive listing is verified, while successful task-triggered execution remains unverified in this environment.

## 5. Group Results

| Group | Path Pattern | Result | Evidence |
|---|---|---|---|
| Direct skills | `.codex/skills/*/SKILL.md` | SUPPORTED — listed | `ui-ux-pro-max`, `design`, and `antislop` appeared in `codex debug prompt-input` output. |
| Engineering | `.codex/skills/engineering/*/SKILL.md` | SUPPORTED — recursive listing | `api-design`, `architecture`, `backend-patterns`, `coding-standards`, `database-patterns`, and `frontend-patterns` appeared with `r0/engineering/...` paths. |
| Planning | `.codex/skills/planning/*/SKILL.md` | SUPPORTED — recursive listing | `document-planning` appeared with `r0/planning/document-planning/SKILL.md`. |
| Quality | `.codex/skills/quality/*/SKILL.md` | SUPPORTED — recursive listing | `code-review`, `refactoring`, and `verification-loop` appeared with `r0/quality/...` paths. |
| Security | `.codex/skills/security/*/SKILL.md` | SUPPORTED — recursive listing | `security-review` appeared with `r0/security/security-review/SKILL.md`. |
| Testing | `.codex/skills/testing/*/SKILL.md` | SUPPORTED — recursive listing | `browser-verification` and `tdd-workflow` appeared with `r0/testing/...` paths. |

No group produced evidence of direct-child-only behavior.

## 6. Registry Dependency

Native Codex discovery and project registry routing are separate layers:

1. Codex host discovery exposes direct and nested `SKILL.md` files under the configured project skill root.
2. `AGENTS.md` selects `.codex/skills/REGISTRY.md` as the project routing catalog.
3. The registry supplies category, activation, support, audit, and non-goal rules that native filesystem discovery cannot provide.

Nested skills do not appear to require registry entries for native listing. They do require registry paths for deterministic project governance and routing.

## 7. Final Classification

**RECURSIVE DISCOVERY PARTIALLY SUPPORTED**

Native recursive discovery is verified through `codex debug prompt-input`. End-to-end model activation was not verified because `codex exec` failed during authentication/model initialization. The limitation affects activation testing, not the observed discovery result.

## 8. Structural Recommendation

**KEEP STRUCTURE BUT REQUIRE EXPLICIT REGISTRY PATHS**

Keep the current mixed physical layout. Installed Codex `0.156.1` exposes nested skills, so flattening is not supported by current evidence. Keep exact nested paths in `.codex/skills/REGISTRY.md`, and continue treating the registry as the deterministic routing contract. Do not claim recursive support as a repository guarantee for other Codex versions until re-tested.

Logical grouping in the registry is independent from physical filesystem grouping. Recursive discovery behavior remains a host-runtime capability, not a repository-local contract.

## 9. Migration Impact

No migration is recommended or performed.

If a future Codex version proves nested discovery unsupported, affected paths would include all skills under:

- `.codex/skills/engineering/`
- `.codex/skills/planning/`
- `.codex/skills/quality/`
- `.codex/skills/security/`
- `.codex/skills/testing/`

Any flattening would require updating `.codex/skills/REGISTRY.md`, `AGENTS.md` references, generated documentation, and any exact path references in tooling. No such updates belong in this verification phase.

## 10. Verification Gate

- No skill moved: **PASS**.
- No skill renamed: **PASS**.
- No skill deleted: **PASS**.
- No permanent test skill added: **PASS**.
- No application code changed by Phase 3: **PASS**.
- No package changes by Phase 3: **PASS**.
- Unrelated working-tree changes preserved: **PASS**; pre-existing changes remain visible in `git status --short`.
- Temporary evidence file: `/tmp/codex-prompt-input-phase3.json`; outside repository and not a skill.
- Phase 3 report added: `.codex/PHASE_3_CODEX_SKILL_DISCOVERY_VERIFICATION.md`.

PHASE 3 PASS — discovery behavior verified
