# Project Skills

`.codex/skills/REGISTRY.md` is canonical registry for skill paths, categories, responsibilities, activation, optional support, final audits, and non-goals.

`.codex/skills/UPSTREAM_AUDIT.md` records source decisions. `AGENTS.md` owns governance, approval, and authority. Skill files define reusable execution methods.

Load smallest complete skill set. Do not load umbrella and specialist skills together unless registry routing defines relationship and order.

Logical registry categories do not require matching filesystem folders. Current nested engineering, planning, quality, security, and testing groups remain unchanged. Native recursive skill listing was verified on `codex-cli 0.156.1` with `codex debug prompt-input`: direct and nested `SKILL.md` paths appeared in model-visible prompt context. End-to-end task-triggered activation remains unverified because the Phase 3 `codex exec` probe failed during authentication/model initialization. This is verified host-runtime behavior for the tested version, not a cross-version repository guarantee. Keep explicit registry paths for deterministic governance and routing; do not flatten nested directories.

Skills do not replace `AGENTS.md`, approved task documents, validation, Anti-Slop, or human approval.
