# Upstream Skill Audit

Audit date: 2026-09-22. Source contents inspected from shallow clones of Everything Claude Code and Anti-Slop.

## Everything Claude Code Skills

| Source Skill | Relevant | Project Action | Reason |
| --- | --- | --- | --- |
| backend-patterns | Yes | Adapt | Express layering, API/query practices; remove Next/Supabase assumptions. |
| clickhouse-io | No | Reject | Project uses PostgreSQL/Drizzle, not ClickHouse. |
| coding-standards | Yes | Adapt | Core TypeScript quality; remove framework-specific guidance. |
| continuous-learning | Partial | Reject | No measurable repository workflow value; risks permanent accidental rules. |
| eval-harness | Partial | Reject | No product eval harness requirement. |
| frontend-patterns | Partial | Adapt | Keep component/state/API concepts; replace React/Next patterns with Vue 3. |
| project-guidelines-example | No | Reject | AGENTS.md already owns project authority. |
| security-review | Yes | Adapt | Align to RS256, Argon2id, Zod, RBAC, Pino/Morgan. |
| strategic-compact | Partial | Reject | Runtime context control belongs to agent platform; cannot waive gates. |
| tdd-workflow | Yes | Adapt | Behavior-first focused tests. |
| verification-loop | Yes | Adapt | Final evidence and applicable checks. |

## Everything Claude Code Agents

| Agent | Project Action | Reason |
| --- | --- | --- |
| planner | Adapt into document-planning | Existing product/architect agents keep role ownership. |
| architect | Keep existing project agent; add architecture skill | Existing project architecture is authoritative. |
| tdd-guide | Adapt into tdd-workflow | Repeatable testing procedure. |
| code-reviewer | Adapt into code-review | Review is task-stage skill, not new agent. |
| security-reviewer | Keep existing security agent; add security-review | Role plus reusable checklist. |
| e2e-runner | Adapt into browser-verification | Vue/browser verification use case. |
| build-error-resolver | Reject standalone | Failure diagnosis belongs in verification-loop; no autonomous scope expansion. |
| refactor-cleaner | Adapt into refactoring | Only within approved scope. |
| doc-updater | Reject standalone | Documentation changes remain task-scoped. |

## Everything Claude Code Rules

| Rule | Project Action | Owner |
| --- | --- | --- |
| agents, git-workflow, hooks | Reject direct import | AGENTS.md and human approval own authority. |
| coding-style | Adapt | coding-standards. |
| patterns | Adapt | architecture/backend/frontend/database skills. |
| performance | Adapt | backend/frontend/database skills. |
| security | Adapt | security-review. |
| testing | Adapt | tdd-workflow and browser-verification. |

## Anti-Slop

Inspected separate upstream skills: antislop, antislop-ui, antislop-copywriting, antislop-human, antislop-layoutmobile, antislop-code. They remain external, additive filters. Project skills do not copy or merge their content. External installation remains required before a task can record Anti-Slop PASS.

## Conflicts Resolved

- React/Next.js and Supabase examples: rejected; project uses Vue 3, Express, Bun, Drizzle, PostgreSQL.
- Prisma/ClickHouse assumptions: rejected; project uses Drizzle/PostgreSQL.
- Generic repository/service abstractions: rejected unless demonstrated by task; project architecture requires focused modules.
- Autonomous build-error/refactor/doc work: rejected; human-approved task scope controls changes.
