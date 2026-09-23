# be/24-ai-governance-audit — AI Governance Audit and Hardening

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/24-ai-governance-audit` |
| Batch | N/A |
| Owning Feature | AI coding-agent governance |
| Workstream | Backend / Governance |
| Task Category | Documentation and governance |
| Repository/App | Repository-wide; backend-led |
| Status | Complete — governance audit and documentation hardening evidence recorded on 2026-09-23. |
| Priority | Foundation governance |
| Suggested Size | Medium — cross-document audit and focused guidance updates |
| Depends On | `be/23-versioned-openapi-swagger` |
| Blocks | N/A |
| Execution Order | 24 |

## 2. Outcome

Create one consistent, source-aware governance layer for AI coding agents. Guidance distinguishes human instructions, approved contracts, project docs, implementation evidence, skills, and general practice; preserves human approval for product/security/irreversible decisions; permits bounded hotfixes; verifies task state from source and evidence; and aligns module-first, API-versioning, and OpenAPI/Swagger rules without changing runtime behavior.

## 3. Context

- `AGENTS.md` is the repository governance authority and already defines task contracts, hotfix handling, module boundaries, API rules, Anti-Slop, and final reporting.
- `docs/**` contains durable guidance that must stay aligned with current source; `docs/API.md` previously described `/docs` and `/openapi.json` and now records the evidenced `/docs/v1` and `/openapi/v1.json` architecture.
- `.codex/skills/REGISTRY.md` defines project skill ownership and activation; skill references include source-state snapshots that must not become implementation truth.
- Current source implements the recorded be/21–23 targets: `app.ts` mounts the auth v1 router, `server.ts` composes the auth module, auth routes use `/api/v1/auth/*`, and OpenAPI uses module-owned YAML with `/docs/v1` and `/openapi/v1.json`.
- be/21–23 are marked Complete with recorded evidence; status remains metadata and must not replace source or validation proof.
- Product placeholder docs must remain requirement-safe. Unknown product/domain/design content remains `TODO: REQUIREMENT NEEDED`.

## 4. Dependencies

- `be/23-versioned-openapi-swagger` must be complete before execution claims its target architecture as current.
- Read-only inspection of `AGENTS.md`, all `docs/**`, project skills and references, `skills-lock.json`, current source/tests, manifests, and all relevant task contracts.
- No application runtime, dependency, migration, environment, or generated-file changes are permitted.

## 5. In Scope

- Audit and harden `AGENTS.md`, relevant `docs/**`, `.codex/skills/REGISTRY.md`, project-owned `SKILL.md` files, project skill references, and task-planning guidance.
- Classify important claims as `CURRENT IMPLEMENTATION`, `APPROVED TARGET / CONTRACT`, `DEFERRED / NOT IMPLEMENTED`, or `UNKNOWN / REQUIREMENT NEEDED`.
- Define one concise authority/ownership model: governance, durable project docs, reusable methods, task contracts, and source truth.
- Define controlled hotfix/small-maintenance execution and its mandatory validation.
- Define task-state verification that rejects Planned/Ready/Blocked labels as implementation proof.
- Align module-first, server/app composition, API major versioning, operational routes, and OpenAPI/Swagger ownership with current be/21–23 evidence while keeping future v2 deferred.
- Audit skill activation and responsibility boundaries; refine registry guidance without loading unrelated skills.
- Audit docs ownership, stale references, product placeholders, and a reusable documentation consistency gate.
- Evaluate and plan `docs/OPERATIONS.md` and `docs/CONVENTIONS.md` where durable verified guidance is missing.

## 6. Out of Scope

- Any change under `apps/api/src/**`, `apps/api/tests/**`, `apps/cms/src/**`, `apps/cms/tests/**`, `apps/api/drizzle/**`, or runtime configuration.
- Any dependency, lockfile, migration, route, OpenAPI runtime, Swagger UI, logging, Redis, BullMQ, auth, authorization, or database behavior change.
- Implementing be/21, be/22, or be/23.
- Inventing product requirements, domain vocabulary, permissions, compliance policy, deployment topology, monitoring systems, or API lifecycle decisions.
- Reorganizing skill directories solely for aesthetics or copying upstream Anti-Slop instructions into project skills.

## 7. Existing Implementation

Inspect and classify before editing:

- `AGENTS.md`.
- `docs/API.md`, `ARCHITECTURE.md`, `DATABASE.md`, `DEVELOPMENT.md`, `SECURITY.md`, `PRD.md`, `PRODUCT.md`, `DOMAIN.md`, and `DESIGN.md`.
- `.codex/skills/REGISTRY.md`, `.codex/skills/README.md`, `.codex/skills/UPSTREAM_AUDIT.md`, all project-owned `SKILL.md`, all project skill references, and `skills-lock.json`.
- `apps/api/src/**`, `apps/api/tests/**`, relevant `apps/cms/**`, root and app manifests.
- `tasks/be/19-backend-testing` through `tasks/be/23-versioned-openapi-swagger`, plus relevant `tasks/fe/**` and dependency metadata.
- Current route composition in `apps/api/src/app.ts`, `server.ts`, auth/health routers, and OpenAPI infrastructure.

## 8. Implementation Requirements

### 8.1 Truth classification

Every important guidance claim must identify whether it is current implementation, approved target/contract, deferred/not implemented, or unknown/requirement needed. Approved task text cannot be presented as runtime evidence. A task status cannot prove completion. Source files, active configuration, and actual validation evidence decide implementation state.

### 8.2 Authority and ownership

Preserve this order: explicit human instruction; approved task contract; authoritative project docs; current implementation and validation evidence; `AGENTS.md`; applicable project skills; general engineering practice. Keep ownership distinct:

- `AGENTS.md` — authority, approval, hard stops, and governance.
- `docs/**` — durable project/runtime source of truth.
- `.codex/skills/**` — reusable execution methods and activation rules.
- `tasks/**` — scoped execution contracts and evidence requirements.
- source/tests/configuration — implementation and behavior truth.

### 8.3 Hotfix path

Permit direct execution only when human scope is explicit, bounded, intended behavior is clear, no new capability/business/auth policy/destructive DB behavior/externally visible API/irreversible architecture decision is introduced, and one small diff is safely reviewable. Require inspection, focused tests, applicable lint/typecheck, Anti-Slop, `git diff --check`, changed-file review, secret review, and truthful PASS/FAIL/NOT RUN reporting. Expanded scope must stop for a formal contract.

### 8.4 Architecture/versioning/OpenAPI governance

Document as approved targets unless source and evidence show implementation:

- business capabilities under `apps/api/src/modules/<module>/`;
- `server.ts` as infrastructure composition root at module granularity;
- `app.ts` mounting module routers and global infrastructure;
- module-relative router paths with application-owned `/api/vN/<module>` prefixes;
- shared services, repositories, database, and domain logic across API versions by default;
- v1 preservation when v2 is later introduced;
- `/health`, `/ready`, `/docs`, `/docs/v1`, `/openapi/v1.json`, and `/ops/queues` outside the business version namespace;
- module/version-owned YAML OpenAPI contracts, global aggregation/serving in `config/openapi`, Swagger as primary browser testing, and `/ops/queues` excluded from public OpenAPI.

### 8.5 Skill and consistency governance

Refine the registry to load only applicable skills. Define responsibility boundaries among planning, architecture, backend/frontend patterns, API, database, security, testing, browser, review, refactoring, verification, and Anti-Slop. Add a reusable consistency gate that compares `AGENTS.md`, docs, skills, approved task, and source, returning `CONSISTENT` or `CONFLICT` with authority winner and safe-continuation decision.

### 8.6 Product-safe placeholders

Keep `PRD.md`, `PRODUCT.md`, `DOMAIN.md`, and `DESIGN.md` structured but unresolved where requirements do not exist. Use `TODO: REQUIREMENT NEEDED`; do not fill placeholders with inferred product decisions.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no runtime configuration changes.

### API Contract

Not applicable — no endpoint, route, schema, auth, status, or OpenAPI runtime change. Documentation must accurately describe current `/api/v1/auth/*`, `/docs`, `/docs/v1`, and `/openapi/v1.json` source behavior, while keeping future v2 as deferred until separately approved and evidenced.

### Database Contract

Not applicable — no schema, migration, seed, query, or data change.

### UI Contract

Not applicable — no CMS or rendered product UI change. Swagger governance is documentation only in this task.

## 10. File Impact

### Expected Create

- `tasks/be/24-ai-governance-audit/technical.md`.
- `tasks/be/24-ai-governance-audit/explanation.md`.
- `tasks/be/24-ai-governance-audit/references/` files with actual planning value.
- `docs/OPERATIONS.md` if execution confirms durable operational guidance is missing.
- `docs/CONVENTIONS.md` if execution confirms durable repository conventions are missing.

### Expected Modify

- `AGENTS.md` for authority, hotfix, task-state, architecture/versioning/OpenAPI, and consistency guidance.
- `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, `docs/SECURITY.md`, and other docs only where audit proves stale or duplicated claims.
- `.codex/skills/REGISTRY.md` and selected project skill/reference files only where activation or source-state guidance is stale.
- Relevant planning guidance under `.codex/skills/planning/document-planning/` and task references only where responsibility or state-truth guidance requires it.

### Expected Not Modified

- `apps/api/src/**`, `apps/api/tests/**`, `apps/cms/**`, `apps/api/drizzle/**`, `package.json`, lockfiles, `docker-compose.yml`, runtime env files, secrets, and generated output.

Expected paths are guidance; execution must inspect the repository and preserve unrelated human work.

## 11. Runtime Behavior

No runtime behavior changes. Execution reads current source to classify truth, edits governance/docs only, and verifies no application or dependency files changed. Future agents must continue to inspect source and evidence before describing be/21–23 targets as implemented. Product/security/permission/destructive/API-version lifecycle ambiguity remains a hard stop.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| Task says Ready/Planned or Complete but source lacks target | Classify mismatch; do not mark implementation complete | Dependency remains unsatisfied until evidence exists |
| Skill reference lists stale paths or state | Mark finding and replace with durable inspection workflow | Never rely on snapshot alone |
| Docs and source conflict | Report `CONFLICT`, name authority winner, and stop if behavior decision is required | Do not silently rewrite product/API behavior |
| Product placeholder lacks requirements | Preserve `TODO: REQUIREMENT NEEDED` | No invented product semantics |
| Hotfix grows beyond bounded scope | Stop and require normal approved task | Human retains decision authority |
| be/23 target is documented but source/evidence disagree | Report `CONFLICT`; preserve source truth and stop on externally visible behavior decisions | No false completion |

## 13. Security Requirements

- Preserve hard stops for auth, authorization, secrets, destructive data, compliance, and externally visible breaking API behavior.
- Do not add credentials, tokens, private keys, or secret examples to docs, skills, or task references.
- Keep operational dashboard security, public probe minimization, and OpenAPI secret exclusion guidance aligned with actual source and approved contracts.
- Do not claim security validation from documentation alone; require relevant evidence.

## 14. Test Requirements

### Happy Path

- Governance inventory covers all required docs, skills, references, manifests, and task areas.
- Authority/ownership map identifies one canonical owner for each rule family.
- Activation matrix identifies minimal relevant skills by task type.

### Validation

- Every referenced path exists or is explicitly planned as a new file.
- Important claims receive one of the four truth classifications.
- be/21–23 status and source mismatch is recorded accurately.

### Negative / Failure

- Audit detects stale `/docs`/`/openapi.json`, `/auth/*`, or pre-refactor composition claims in secondary guidance.
- Audit detects task labels used as completion evidence.
- Audit detects stale skill snapshots or unsupported “Anti-Slop unavailable” claims.

### Security

- Secret scan covers changed governance/docs files.
- Product/auth/security decisions are not invented or weakened.

### Regression

- No application source/test/manifest/runtime file changes.
- Existing task contracts retain dependency order and scope.

### Isolation

Not applicable — no runtime or database test fixture is changed. Documentation checks must be deterministic and independent of application services.

## 15. Task-Level Expected Results

- Governance map records current implementation versus approved/deferred targets.
- Hotfix path is explicit but bounded by hard-stop conditions.
- Task-state verification requires source and evidence.
- Architecture/versioning/OpenAPI guidance is aligned without claiming unimplemented work.
- Skill activation is selective and responsibilities are non-overlapping.
- Docs ownership and consistency gate are explicit.
- Product placeholders remain requirement-safe.
- No runtime or dependency file is modified.

## 16. Acceptance Criteria

- [x] All project-owned skills, references, registry entries, and `skills-lock.json` are inventoried.
- [x] Stale implementation-state references are identified and corrected or explicitly classified.
- [x] Anti-Slop installation, availability, and activation claims match actual repository state.
- [x] Controlled hotfix governance is defined with hard-stop boundaries and required validation.
- [x] Task-state verification prevents Planned/Ready/Blocked labels from proving implementation.
- [x] Module-first governance matches current be/21 source and evidence, with future architecture changes still requiring approval.
- [x] API-versioning governance matches current be/22 source and preserves v1/deprecation hard stops.
- [x] OpenAPI/Swagger governance matches current be/23 source and evidence, with future v2 still deferred.
- [x] Docs ownership and source-of-truth boundaries are explicit.
- [x] Skill activation matrix is selective and responsibility boundaries are clear.
- [x] PRD/product/domain/design placeholders contain no invented requirements.
- [x] Consistency-audit procedure returns `CONSISTENT` or actionable `CONFLICT` findings.
- [x] Every planned governance change has an owning source-of-truth.
- [x] No application/runtime/dependency/migration file was modified by be/24.
- [x] Diff, changed-file, secret, and documentation Anti-Slop reviews pass.

## 17. Anti-Slop Requirements

- Load project `document-planning` guidance and core `antislop`.
- Audit prose for duplicated rules, contradictory copies, vague claims, stale snapshots, excessive activation, and speculative governance.
- Keep each rule at one canonical owner; secondary documents link or summarize only what readers need.
- Do not add generic templates, empty references, fake completion evidence, hidden TODOs, or invented product examples.
- UI Anti-Slop and visual verification are not applicable; no rendered product UI changes.

## 18. Validation Requirements

### Static

- Verify all referenced paths and created references.
- Run `git diff --check`.
- Review `git status --short` and changed-file diff.

### Automated Tests

Not applicable — no runtime behavior changes. Use deterministic inventory/consistency checks instead.

### Build

Not applicable — no source or dependency changes.

### Database

Not applicable — no schema or migration changes.

### UI

Not applicable — no UI changes.

### Anti-Slop

- Run documentation consistency review.
- Run project document-planning and core Code Anti-Slop review against changed governance/docs files.
- Report findings and final blocking count; unavailable checks remain `NOT RUN`.

## 19. Completion Evidence

- Governance inventory: complete list of audited docs, skills, references, tasks, source areas, and manifests.
- Truth classification matrix: current, target, deferred, and unknown findings.
- Authority/ownership map and stale-guidance findings.
- Hotfix and task-state verification rules.
- Skill activation matrix and responsibility review.
- be/21–23 architecture/versioning/OpenAPI consistency findings.
- Exact changed-file list proving no application/runtime files changed.
- `git diff --check` output.
- Changed-file and secret review.
- Documentation consistency and Anti-Slop review with final result.

### 19.1 Execution Evidence — 2026-09-23

| Gate | Evidence | Result |
| --- | --- | --- |
| Dependency | be/23 is marked Complete with source, focused/full test, fallback Swagger, static, and diff evidence. | PASS |
| Governance inventory | Audited `AGENTS.md`, all `docs/**`, project skill registry/readme/upstream audit, project skill files and references, `skills-lock.json`, task contracts be/19–24, API source/tests, manifests, and current worktree status. | PASS |
| Truth classification | Current be/21–23 source/evidence reconciled; future v2, product, compliance, and lifecycle decisions remain deferred or requirement-needed. | PASS |
| Authority/ownership | `AGENTS.md`, docs, skills, tasks, and source ownership rules added and mapped in `references/authority-and-ownership.md` and `references/docs-ownership-map.md`. | PASS |
| Hotfix/task state | Bounded hotfix rules and source/evidence verification for `Planned`, `Ready`, `Blocked`, and `Complete` labels are explicit. | PASS |
| Architecture/versioning/OpenAPI | Current module composition, `/api/v1/auth/*`, `/docs/v1`, `/openapi/v1.json`, YAML ownership, and operational-route boundaries match source/evidence; v2 remains deferred. | PASS |
| Skill activation | Registry now includes governance activation and state-truth guidance; stale Anti-Slop/security/verification snapshots corrected. | PASS |
| Documentation consistency | Referenced-path check, stale-claim scan, ownership review, and current-source comparison return `CONSISTENT`. | PASS |
| Product placeholders | `docs/PRD.md`, `PRODUCT.md`, `DOMAIN.md`, and `DESIGN.md` retain `TODO: REQUIREMENT NEEDED`; no product decisions added. | PASS |
| Scope | Task changes are governance/docs only. Pre-existing API OpenAPI/test worktree changes were preserved and not modified by be/24. | PASS |
| Static/security review | `git diff --check`, changed-file review, generated-junk review, and secret-name/value review pass. | PASS |
| Anti-Slop | Core Anti-Slop and documentation consistency review executed against changed governance/docs; no blocking duplication, fake evidence, hidden TODO, unsupported claim, or speculative scope finding. | PASS |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| PRD | Not applicable — product requirements remain unresolved |
| Feature | AI governance audit and hardening |
| Requirement | `AGENTS.md`; `docs/**`; `.codex/skills/**`; be/21–23 contracts |
| Acceptance Criteria | Section 16 |
| API Operation | Not applicable — runtime API unchanged |
| Database | Not applicable — no schema change |
| Test IDs | Governance inventory and consistency checks defined by this contract |
| Design/Figma | Not applicable |

## 21. Open Points

None.

## 22. Definition Of Done

- [x] All acceptance criteria pass with actual audit evidence.
- [x] Current implementation and approved targets are not conflated.
- [x] Hotfix, task-state, human-control, architecture, versioning, and OpenAPI governance are explicit.
- [x] Docs ownership and skill activation are concise and non-duplicative.
- [x] Product placeholders remain requirement-safe.
- [x] Required documentation Anti-Slop/consistency checks pass.
- [x] `git diff --check`, changed-file review, and secret review pass.
- [x] No application/runtime/dependency/migration files were changed by be/24.
- [x] No successor task was started.
