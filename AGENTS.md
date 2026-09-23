# Engineering Constitution

## Authority And Product Boundaries

AI is an implementation agent, not a product decision maker. It may choose implementation details only when requirements are clear.

Authority order:

1. Explicit human instruction for current task.
2. Approved task `technical.md`.
3. Relevant `docs/` (product and documentation source of truth).
4. Existing architecture and code conventions.
5. This `AGENTS.md`.
6. Relevant `.codex/agents/` instruction.
7. General engineering practice.

On conflict, follow higher authority and report conflict when relevant. Never invent business, domain, pricing, permission, UX, API, or database behavior. Use `TODO: REQUIREMENT NEEDED` when non-blocking; STOP and request clarification when blocked.

## Task Execution Rules

Work only on one human-approved task. Before edits, read its `technical.md`, `explanation.md`, relevant docs, dependencies, and affected implementation. Verify task has objective, scope, non-goals, acceptance criteria, and validation requirements; STOP if missing information blocks safe work.

Then: identify affected files and required Anti-Slop checks; implement only approved scope; validate; inspect `git status`, `git diff --check`, and `git diff`; report result. Never start future tasks. If another task is needed, STOP, name dependency, explain blocker, and wait for approval.

## Skill Activation

Load project skills from `.codex/skills/REGISTRY.md` by task type. `document-planning` owns task generation; architecture, coding, security, testing, review, and verification skills apply only when relevant. External Anti-Slop skills remain mandatory additive filters, not replacements for project skills. Skills never override this file, approved task scope, validation, or human approval.

## Future Task Planning Standard

This section governs **new** task documents only. Do not regenerate approved or existing tasks unless human explicitly asks. A task is an **execution contract**, not a TODO list: it defines required outcome, constraints, behavior, expected impact, verification, and completion evidence so implementers do not invent known product, security, architecture, API, database, or UI decisions.

Tasks remain SMALL + PRECISE. One task must be small enough for a human to understand resulting diff, but never vague. Split independent capabilities; for example, auth foundation, password hashing, login, refresh, logout, revocation, RBAC, and permissions are separate tasks.

### Required `technical.md` Contract

Every future `technical.md` uses below sections in order. A genuinely irrelevant section says `Not applicable — <reason>`; never silently omit it. Do not invent unknown IDs, defaults, file paths, requirements, or external systems.

#### 1. Metadata

Use this table. Use `N/A` for project fields without a defined value.

| Field | Value |
| --- | --- |
| Task ID | |
| Batch | |
| Owning Feature | |
| Workstream | |
| Task Category | |
| Repository/App | |
| Status | |
| Priority | |
| Suggested Size | |
| Depends On | |
| Blocks | |
| Execution Order | |

#### 2. Outcome

State concrete capability created: what exists after task that did not before. Avoid vague verbs such as “improve” or “implement configuration.” Describe observable behavior, for example validated startup that terminates safely for invalid environment.

#### 3. Context

Reference relevant PRD, architecture, domain, database, API, security, design, dependency tasks, and existing conventions. Link/reference sources; do not copy whole documents.

#### 4. Dependencies

State `Depends On`, `Blocks`, required infrastructure, configuration, and external systems. A missing dependency is a blocker, not scope for silent implementation.

#### 5. In Scope

List explicit behavior and changes this task must produce.

#### 6. Out of Scope

List future work, deferred behavior, unrelated modules, unsupported cases, and excluded product decisions. Mandatory for non-trivial tasks.

#### 7. Existing Implementation

List known files, modules, services, schemas, migrations, tests, configuration, and backend/frontend consumers to inspect. Paths are guidance; agent verifies existence before editing. Never invent paths.

#### 8. Implementation Requirements

Define behavior with explicit rules, not adjectives. State validation, startup/runtime integration, parsing, allowed inputs, error handling, security constraints, and behavior that must remain intact. Example: required environment values validate with Zod at startup; missing/invalid values stop startup; errors name invalid keys but never secret values.

#### 9. Applicable Contracts

State which contracts apply; include only relevant tables/fields.

**Configuration Contract**

| Variable | Required | Type | Validation | Default | Secret |
| --- | --- | --- | --- | --- | --- |

No implicit default: write `None — startup must fail if missing.`

**API Contract:** method, path, auth, permission, request, response, status codes, error codes.

**Database Contract:** tables, columns, constraints, indexes, relationships, migration, data impact.

**UI Contract:** page, components, states, interaction, responsive behavior, accessibility, source design/reference.

#### 10. File Impact

Use `Expected Create`, `Expected Modify`, and `Expected Not Modified`. If discovery is needed, state: `Expected paths are guidance; agent must inspect repository before finalizing changes.`

#### 11. Runtime Behavior

Describe actual execution sequence, including valid and invalid flows. For startup tasks, define load, validate, sanitized failure, non-zero exit, no server start, dependency initialization, and successful start as applicable. Do not specify runtime behavior only in prose elsewhere.

#### 12. Error And Edge Cases

For meaningful failures, define trigger, expected behavior, error type/code or HTTP status, security concern, and recovery. Use a table where useful:

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |

Never expose sensitive values in errors.

#### 13. Security Requirements

Name only relevant concerns: authentication, authorization, validation, secrets, logging, PII, rate limits, CSRF, XSS, SQL injection, SSRF, upload, or access control. “Secure” alone is insufficient.

#### 14. Test Requirements

Define required proof under `Happy Path`, `Validation`, `Negative / Failure`, `Security`, `Regression`, and `Isolation`. Isolation covers repeatability, execution-order independence, isolated data, and deterministic cleanup when applicable. `Tests: NOT APPLICABLE` needs reason.

Use a test matrix when it improves clarity:

| Scenario | Expected Result | Test Type |
| --- | --- | --- |

Only real scenarios belong in matrix.

#### 15. Task-Level Expected Results

List concrete implementation outcomes separately from acceptance criteria, such as schema exists, integration is connected, invalid input rejects safely, tests cover behavior, and existing startup remains functional.

#### 16. Acceptance Criteria

Each criterion is observable and testable, written as checklist item. Never write subjective criteria such as “system is secure.” Prefer behavior, error-safety, integration, and test evidence.

#### 17. Anti-Slop Requirements

State required Code Anti-Slop, UI Anti-Slop, and Visual Verification explicitly. Code changes require Code Anti-Slop. UI changes require UI Anti-Slop plus Code Anti-Slop. Meaningful UI must state whether browser verification is required. Name task-specific checks for duplication, over-engineering, dead/unused code/dependencies, fake/placeholder behavior, hidden incomplete TODOs, assertions/`any`, generic UI, fake content, visual consistency, responsive behavior, and required UI states.

#### 18. Validation Requirements

List only applicable checks under: `Static` (ESLint, TypeScript, formatting, diff check); `Automated Tests` (unit, integration, component, contract); `Build`; `Database`; `UI`; and `Anti-Slop`. Include commands/tool where known. Do not blindly list every project command.

#### 19. Completion Evidence

State evidence that proves completion: command/test output, screenshot or browser inspection, migration output, OpenAPI diff, git diff, or generated artifact. Map every acceptance criterion to evidence, for example `AC-001 → test: environment-validation.test.ts` or `AC-002 → command: bun --cwd apps/api run typecheck`.

#### 20. Traceability

Use table below when project sources have IDs. Otherwise write: `Not applicable — project has no traceability ID system.`

| Trace Type | References |
| --- | --- |
| PRD | |
| Feature | |
| Requirement | |
| Acceptance Criteria | |
| API Operation | |
| Database | |
| Test IDs | |
| Design/Figma | |

#### 21. Open Points

List unresolved requirements, external dependencies, credentials, environment dependencies, design decisions, migration concerns, or deferred decisions. Write `None.` when none exist. Never hide blockers.

#### 22. Definition Of Done

Include checklist: acceptance criteria, scope, relevant implementation, tests, required Anti-Slop, lint, typecheck, applicable build/migration/OpenAPI/browser verification, `git diff --check`, changed-file review, no secret exposure, and no unrelated changes.

### Required `explanation.md` Contract

Every future `explanation.md` is Indonesian, understandable by human reviewer, and does not duplicate technical contract. It answers:

1. Apa yang dibuat?
2. Kenapa dibuat?
3. Apa yang berubah?
4. Apa yang tidak berubah?
5. Dependency task apa?
6. Risiko utama?
7. Bagaimana cara mengecek hasilnya?
8. Apa yang harus direview manusia?
9. Apa yang belum dikerjakan?

### Task Generation And Planning Gate

For future task generation: read PRD, architecture, domain, database, API, design, dependency tasks, and relevant code; identify dependencies; split small execution units; create both documents; define observable criteria, tests, Anti-Slop, completion evidence, traceability, open points, and deferred scope.

Before finalizing task, answer:

1. Could another AI implement it without inventing important behavior?
2. Could human reviewer understand exactly what changes?
3. Can completion be objectively verified?

If any answer is no, improve contract or split task. Scale detail to complexity: high precision, low ambiguity, small scope, easy review — not maximum document length.

## Task Scope

- Prefer smallest correct, reviewable, reversible diff.
- Do not modify unrelated modules, refactor/fix/rename unrelated code, upgrade unrelated dependencies, or change architecture outside scope.
- Do not discard, reset, or overwrite human work.
- Report unrelated blockers; do not solve them without human approval.
- No fake behavior, placeholder presented as complete, speculative abstraction, generic CRUD framework, or unnecessary file.

## Requirement Ambiguity

For missing, ambiguous, contradictory, incomplete, or technically underspecified requirements: never invent behavior. Use `TODO: REQUIREMENT NEEDED` when work can safely continue; STOP and request clarification when product or technical decision blocks implementation. Hidden assumptions are forbidden.

## Architecture And Contracts

- Request flow: middleware → route → controller → service/use case → repository → database.
- Controllers contain transport concerns only. Services/use cases own business logic. Repositories/data-access layers own database access.
- Validate trust-boundary input with Zod. Reuse existing patterns before adding patterns.
- TypeScript and API JSON use camelCase. PostgreSQL uses snake_case. Environment names use UPPER_SNAKE_CASE.
- Do not introduce microservices, event-driven systems, generic CRUD, factories, or dependency-injection layers unless task explicitly requires them.

## API Contract Rules

Before API change inspect consumers, schemas, auth, authorization, errors, and OpenAPI. Breaking response shapes, field names, status codes, auth, or permissions need explicit scope. Update affected schemas, tests, OpenAPI, and CMS consumers.

## Database Rules

Inspect schema and data impact first. Schema changes require appropriate Drizzle migration and review of data safety, indexes, foreign keys, uniqueness, nullability, query cost, and rollback. Never use manual production changes instead of migrations. Never destructively change columns, types, constraints, indexes, or data without explicit approval. Avoid N+1, unbounded queries, and unused columns.

## Database Migration Discipline

- Drizzle remains schema and forward-migration source of truth. Do not replace it or apply manual production DDL.
- Migrations are small, ordered, reviewable, and scoped to one entity or tightly coupled schema concern. One task may require multiple migrations; never collapse unrelated entities into one migration.
- Each forward migration requires an independently reviewable matching DOWN operation. Generated forward SQL lives in `apps/api/drizzle/<tag>.sql`; matching reverse SQL uses `apps/api/drizzle/<tag>.down.sql`. Drizzle journal entries reference only the forward file.
- Before a schema task completes, prove the installed Drizzle migrator accepts sibling `.down.sql` files and execute UP, DOWN, and re-apply behavior against an isolated database through a repository-compatible rollback executor. Do not claim rollback validation without execution evidence.
- Forward migration order follows foreign-key dependencies. Rollback uses reverse dependency order; never drop a referenced parent before junction/dependent tables.
- Applied/shared migrations are immutable. New schema changes use a new focused migration with an operation-specific name such as `add-email-verified-at-to-users`, never `identity`, `update-db`, or `schema-fix`.
- A DOWN operation reverses only its matching UP, is deterministic, and avoids unrelated data/schema damage. If an operation cannot safely reverse data loss, document it as irreversible and obtain explicit human approval before execution.
- Indexes tightly coupled to an entity's initial table contract may share that entity migration. Junction tables remain separate relationship migrations.

## Backend Rules

- Stack: Express, Bun, TypeScript, Drizzle/PostgreSQL, Redis, BullMQ, Zod, Morgan, Pino.
- Keep business logic testable outside HTTP. Centralize errors. Use request IDs. Safe production errors only.
- Morgan is HTTP access logging; Pino is application logging. Audit records remain separate from ordinary logs when recording security/business events.

## Security Rules

- Validate environment at startup and fail clearly. Preserve Helmet, CORS, rate limits, body limits, secure headers, authorization middleware, and graceful shutdown.
- JWT uses RS256 with issuer, audience, expiry, `nbf` where applicable, JTI, and session/token revocation. Passwords use Argon2id.
- Never log, commit, return, or bundle passwords, JWTs, refresh tokens, private keys, secrets, or raw credentials. Private keys never enter CMS bundles.

## RBAC And Authorization

Backend is authorization source of truth: user → role → permission → action. Never use `isAdmin === true` as authorization architecture. Frontend permission checks are UX only, never security controls.

## Frontend Rules

- Stack: Vue 3, Vite, TypeScript, Pinia, Vue Router, Axios, Zod, Tailwind CSS.
- Use business-specific components. Shared UI holds only genuine primitives. Keep page logic near its module. Do not duplicate backend business logic.
- Use typed API contracts. Handle applicable loading, success, empty, error, disabled, hover, focus, responsive, and mobile states. Do not hide API errors.

## UI/UX Rules

- Before UI work, inspect supplied Figma, screenshots, PRD, or design system. Preserve hierarchy, spacing, typography, responsive behavior, interaction patterns, and visual language.
- No generic AI dashboard, generic CRUD UI, fake data/charts/interactions, arbitrary decoration, visual noise, excessive cards/rounding/gradients/badges/icons, or placeholder presented as real functionality.

## Accessibility

- Use semantic HTML, keyboard navigation, visible focus, labels, accessible buttons/dialogs, contrast, meaningful alt text, and accessible error messages.

## UI States

For relevant UI work, explicitly consider loading, success, empty, error, disabled, hover, focus, responsive, and mobile states. Do not add irrelevant states merely to satisfy a checklist.

## Browser Verification

For meaningful UI changes, code checks alone are insufficient. When capability exists, inspect rendered UI and verify applicable desktop/mobile layout, responsive behavior, hierarchy, spacing, typography, overflow, interactions, states, and accessibility basics.

If unavailable, report `Visual verification: NOT RUN — <reason>`. Do not claim visual verification without inspecting rendered UI. A required visual gate remains incomplete unless human explicitly waives it.

## Performance Rules

- Prefer simple, measurable code. Avoid duplicate/unused API calls, DB queries, Redis operations, watchers, reactive state, expensive computation, unnecessary rendering, and whole-dataset loads.
- Do not optimize prematurely.

## Dependency Rules

- Before dependency addition: inspect existing dependencies and platform capabilities; confirm stack compatibility, maintenance, license, and smallest viable choice.
- Do not add duplicate-purpose libraries or libraries for trivial work. Do not upgrade unrelated dependencies.

## Logging And Observability

Morgan handles HTTP access logs; Pino handles application logs. Include request ID, method, path, status, duration, and user ID where appropriate. Never log secrets. Keep audit trail separate when it represents business or security events.

## Anti-Slop Mandatory Quality Gate

**Anti-Slop is mandatory for every approved task. It is never optional.** It is not skipped because work is small, frontend, UI, configuration, refactor, bug fix, or because lint, typecheck, tests, or build pass.

Determine and execute applicable Anti-Slop checks before completion:

| Task type | Minimum required gate |
| --- | --- |
| Backend, database, refactor | Code Anti-Slop |
| Frontend, configuration | Code Anti-Slop |
| UI / slicing | Code Anti-Slop + UI Anti-Slop |
| Fullstack | Code Anti-Slop + UI Anti-Slop where UI changes |
| Bug fix | Relevant Code and/or UI Anti-Slop |

Code Anti-Slop checks changed code for unnecessary/speculative abstractions, duplication, dead or unused code/dependencies, fake or incomplete implementation, hidden `TODO`/`FIXME`/`HACK`, empty wrappers, unjustified `any` or assertions, misleading/excessive comments, unreachable code, and unnecessary files/configuration.

UI Anti-Slop checks rendered UI and source for generic layouts, generic CRUD, repetition, visual excess, inconsistent hierarchy/spacing/typography, fake UI, missing responsive behavior, overflow, inaccessible controls, and missing applicable states.

Run Anti-Slop, fix relevant findings, then re-run it. If a required Anti-Slop check is unavailable or fails, report `NOT RUN — <reason>` or `FAIL`; task is **not COMPLETE** until human explicitly resolves the gate. Never report it as PASS by inference.

## Testing

Tests verify behavior, not coverage. Every task defines testing needs. `Tests: NOT APPLICABLE` needs a valid documented reason. Use unit/integration tests for backend and component/integration tests where relevant for frontend.

## Definition Of Done

Task is COMPLETE only when all applicable items pass:

1. Acceptance criteria and approved scope satisfied.
2. Required implementation and behavior tests pass.
3. Required Anti-Slop checks executed and pass.
4. Lint and typecheck pass.
5. Build, migration validation, OpenAPI update, and visual verification pass where applicable.
6. `git diff --check` passes; changed files and diff reviewed.
7. No secrets, generated junk, or unrelated changes remain.

Failure or unavailable required gate means task is **not COMPLETE**. Never claim implemented, complete, tested, validated, Anti-Slop passed, visually verified, or production-ready without actual evidence.

## No False Completion

`NOT RUN` never becomes `PASS` because another check passed. Build PASS does not prove visual verification; lint PASS does not prove Anti-Slop. Report unavailable tools and failed checks exactly.

## Standard Execution Workflow

Human approves task → read task docs → read relevant docs → inspect code/dependencies → identify scope and Anti-Slop gates → implement → run/fix/re-run Anti-Slop → lint → typecheck → tests → applicable build/migration/browser checks → `git diff --check` → review diff and secrets → final report → human review.

## Git Discipline And Final Report

Never commit unless human explicitly asks. Do not commit `.env`, logs, keys, secrets, build output, or generated junk.

After each task use these exact sections:

## Summary

Changes made.

## Acceptance Criteria

Each criterion: PASS, FAIL, or NOT RUN.

## Anti-Slop

Code Anti-Slop, UI Anti-Slop, and Visual Verification: PASS, FAIL, NOT RUN, or NOT APPLICABLE; include command/tool or reason.

## Validation

Lint, typecheck, tests, build, migration validation, and diff check: PASS, FAIL, NOT RUN, or NOT APPLICABLE.

## Changed Files

Important paths.

## Issues

Unresolved failures or blockers.

## Scope Notes

Intentionally omitted out-of-scope work.

Never hide failures or turn NOT RUN into PASS.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, load the antislop skill for the task:
- Core filter, always on: `antislop`
- UI / visual: `antislop-ui`
- Copy & text: `antislop-copywriting`
- People: `antislop-human`
- Mobile / responsive: `antislop-layoutmobile`
- Code comments: `antislop-code`
Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->
