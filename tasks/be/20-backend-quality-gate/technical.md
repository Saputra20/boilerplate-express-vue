# be/20-backend-quality-gate — Backend Quality Gate

## 1. Metadata

| Field | Value |
| --- | --- |
| Task ID | `be/20-backend-quality-gate` |
| Batch | N/A |
| Owning Feature | Backend quality foundation |
| Workstream | Backend |
| Task Category | Quality gate documentation |
| Repository/App | `apps/api` |
| Status | Complete — quality-gate evidence recorded on 2026-09-23. |
| Priority | Foundation execution order 20 |
| Suggested Size | Small — focused documentation/rule update |
| Depends On | `be/19-backend-testing` |
| Blocks | `be/21-api-module-architecture-refactor` |
| Execution Order | 20 |

## 2. Outcome

Establish one reusable, deterministic backend completion gate. It requires independent Code Anti-Slop evidence, focused and full tests when applicable, static checks, conditional migration/OpenAPI/browser checks, diff and secret review, and truthful final reporting. It adds no runtime API behavior.

## 3. Context

- `AGENTS.md` already makes Anti-Slop mandatory and defines truthful PASS, FAIL, and NOT RUN reporting.
- `.codex/skills/REGISTRY.md` lists the local `antislop`, `antislop-code`, `verification-loop`, and `code-review` skills.
- The project-local core Anti-Slop skill at `.codex/skills/antislop/` is loadable and executable. Its evidence is skill-based; no repository-supported fixed Anti-Slop CLI command exists.
- `apps/api/package.json` provides `lint`, `typecheck`, and Jest `test`; it has no build script.
- `be/19` is COMPLETE with current implementation and validation evidence recorded on 2026-09-23.

## 4. Dependencies

- `be/19-backend-testing` must be COMPLETE with required evidence before this task implementation starts.
- Existing `AGENTS.md`, project skills, `docs/DEVELOPMENT.md`, and `apps/api/package.json` are the source of truth for reusable quality rules and actual API commands.
- No CI provider, external service, environment variable, or package is required.

## 5. In Scope

- Reusable documented backend quality-gate order and evidence requirements.
- Independent Code Anti-Slop execution and reporting semantics.
- Focused/full test, static check, conditional validation, diff, secret, and final review requirements.
- Truthful task status reporting.

## 6. Out of Scope

- Application runtime behavior, API routes, database changes, migrations, dependencies, custom CI, coverage dashboards, custom test runners, linters, or Anti-Slop wrapper CLIs.
- Numeric coverage targets or coverage theater.
- `be/19` implementation and `be/21-api-module-architecture-refactor`.

## 7. Existing Implementation

- `AGENTS.md`: mandatory quality, Anti-Slop, validation, and final-report rules.
- `.codex/skills/antislop/`: project-local core Anti-Slop capability.
- `.codex/skills/antislop-code/`: comment-quality capability when changed comments need review.
- `.codex/skills/quality/verification-loop/` and `.codex/skills/quality/code-review/`: applicable validation/review guidance.
- `apps/api/package.json`: actual lint, typecheck, and full Jest scripts.
- `docs/DEVELOPMENT.md`: developer workflow source-of-truth.

Expected paths are guidance; inspect before implementation.

## 8. Implementation Requirements

- Do not begin this task implementation until `be/19` is COMPLETE. Until then report `BLOCKED — be/19-backend-testing is not COMPLETE`.
- Establish reusable documented quality-gate behavior; do not add runtime code or speculative tooling.
- Use this exact gate order:

```text
1. approved scope / dependency check
2. focused behavior tests
3. Code Anti-Slop audit
4. fix Anti-Slop findings
5. re-run Code Anti-Slop
6. lint
7. typecheck
8. full applicable test suite
9. applicable migration/OpenAPI/integration validation
10. git diff --check
11. git status + changed-file review
12. secret/generated-junk review
13. final diff review
14. truthful final report
```

- If code changes after the final Anti-Slop audit, re-run Anti-Slop and affected validation before reporting completion.
- Require capability/evidence, not an invented `antislop` shell command.
- Preserve existing behavior outside the documentation/rule boundary.

## 9. Applicable Contracts

### Configuration Contract

Not applicable — no environment configuration changes.

### API Contract

Not applicable — no API change.

### Database Contract

Not applicable — no schema or migration change.

### UI Contract

Not applicable — no UI change.

### Quality-Gate Contract

| Gate | Requirement | PASS evidence |
| --- | --- | --- |
| Focused tests | Run changed-capability tests first when tests apply. | Actual passing focused test output. |
| Code Anti-Slop | Required for backend, refactor, and database code changes. | Loaded skill, executed audit, findings resolved, zero blocking findings. |
| Lint | Run actual API script. | `bun run --cwd apps/api lint` exits successfully. |
| Typecheck | Run actual API script. | `bun run --cwd apps/api typecheck` exits successfully. |
| Full tests | Required before completion when API tests apply. | `bun run --cwd apps/api test` exits successfully. |
| Migration | Required only for schema changes. | Isolated UP, DOWN, re-UP, and focused integrity evidence. |
| OpenAPI | Required only for public API changes. | Generated contract matches implemented route, request, response, security, and status behavior. |
| Browser | Required only for rendered operational UI when task contract requires it. | Actual browser verification evidence. |
| Diff and secrets | Required before PASS. | `git diff --check`, status/changed-file review, secret/generated-junk review, final diff review. |

## 10. File Impact

**Expected Modify**
- `docs/DEVELOPMENT.md` or a focused existing quality-rule document selected after inspection.
- `AGENTS.md` only if a concise clarification is needed that project-local Anti-Slop skills are valid execution sources and no CLI syntax is assumed.

**Expected Not Modified**
- `apps/api/src/**`
- `apps/api/tests/**`
- package manifests, lockfiles, secrets, migrations, successor tasks, and `be/21` files.

## 11. Runtime Behavior

Not applicable — quality gate is documentation and review behavior, not application runtime behavior.

## 12. Error And Edge Cases

| Scenario | Expected Result | Security / Recovery |
| --- | --- | --- |
| `be/19` incomplete | Block be/20 implementation. | Report dependency status; do not bypass it. |
| Required Anti-Slop skill unavailable | `NOT RUN — <reason>`; overall gate fails or blocks. | Do not infer PASS. |
| Audit execution fails | `FAIL`. | Report safe failure only; preserve changed work for review. |
| Audit finds blocking issue | Fix and re-run; unresolved result is `FAIL`. | Do not hide finding. |
| No database/API/UI change | Report corresponding conditional validation as NOT APPLICABLE with reason. | Do not fake validation. |
| Changed diff contains secret/generated junk | `FAIL` until removed. | Never print or commit secret values. |

## 13. Security Requirements

- Never report a required gate as PASS without actual evidence.
- Never log, commit, or include passwords, keys, JWTs, refresh tokens, database/Redis credentials, Basic Auth credentials, `.env` files, or generated logs in review evidence.
- Secret review must inspect changed files, not only command output.
- Anti-Slop must review actual changed diff/files; lint, typecheck, tests, builds, and SQL inspection do not substitute for it.

## 14. Test Requirements

### Focused Tests

Run changed-capability-specific tests first when code/test behavior changes. Focused tests provide fast feedback and do not replace the full suite.

### Full Tests

Before completion of applicable API work, run:

```bash
bun run --cwd apps/api test
```

### Isolation

Tests must be repeatable, order-independent, use isolated data or mocks, clean up deterministically, and contain no real secrets.

### Documentation-Only Execution

Tests: NOT APPLICABLE — this task implementation changes reusable documentation/rules only. Validate documentation consistency and required quality-gate wording instead.

## 15. Task-Level Expected Results

- One documented backend quality-gate sequence exists.
- Code Anti-Slop has independent required evidence and truthful failure states.
- Actual API validation commands are named without inventing a build or Anti-Slop CLI.
- Conditional migration, OpenAPI, and browser gates have clear applicability rules.
- `be/21` remains blocked until be/20 passes.

## 16. Acceptance Criteria

- [x] `be/19` dependency is checked and never bypassed.
- [x] Quality-gate execution order is explicit.
- [x] Code Anti-Slop is an independent mandatory backend gate.
- [x] Project-local skill execution is accepted; no unsupported CLI syntax is required.
- [x] PASS requires loaded skill, executed audit, resolved findings, and zero blocking findings.
- [x] FAIL and NOT RUN are reported truthfully and fail/block the overall gate.
- [x] Focused tests and full API tests are differentiated.
- [x] Lint, typecheck, full tests, diff check, changed-file review, secret review, and final diff review are required where applicable.
- [x] Migration, OpenAPI, and browser checks are conditional on task type.
- [x] No numeric coverage target, custom CI, wrapper CLI, runtime behavior, or `be/21` work is introduced.
- [x] `be/21` remains unstarted until be/20 passes.

## 17. Anti-Slop Requirements

### Code Anti-Slop

Required for backend code, refactor, and database tasks.

1. Load project-local core skill `antislop` from `.codex/skills/antislop`.
2. Load `antislop-code` when changed code comments require comment-quality review.
3. Audit actual changed diff/files.
4. Fix applicable findings.
5. Re-run the audit.
6. Report actual evidence.

A PASS must contain equivalent semantics:

```text
Code Anti-Slop: PASS
Skill: antislop
Source: project .codex/skills/antislop
Audit actually executed: PASS
Blocking findings: 0
```

Use `FAIL` for skill/audit failure or unresolved blocking findings. Use `NOT RUN — <reason>` when the required capability is unavailable or skipped. Never infer PASS from lint, typecheck, tests, build, or another gate.

### UI Anti-Slop And Visual Verification

Not applicable for normal backend work. A rendered operational UI task must follow its own approved browser-verification requirement.

## 18. Validation Requirements

### Static

```bash
bun run --cwd apps/api lint
bun run --cwd apps/api typecheck
git diff --check
```

### Automated Tests

```bash
bun run --cwd apps/api test
```

Run focused tests first when applicable. Do not invent a build command; `apps/api` has no build script.

### Database

For schema changes, require isolated PostgreSQL migration UP, matching DOWN, re-UP, and focused integrity validation. Otherwise report: `Database migration validation: NOT APPLICABLE — no schema change.`

### API / OpenAPI

For public API changes, validate generated OpenAPI route, request, response, security, and status alignment. Otherwise report: `OpenAPI validation: NOT APPLICABLE — no public API change.`

### UI

For normal backend work: `Visual Verification: NOT APPLICABLE — no rendered UI.` For rendered third-party operational UI, follow the approved task contract and inspect actual browser behavior.

### Review

Before PASS, run `git status --short`, `git diff --check`, and `git diff`; review approved scope, dead/duplicate code, generated junk, TODO/FIXME/HACK, debug logs, changed files, and secrets.

## 19. Completion Evidence

| Acceptance criterion | Evidence |
| --- | --- |
| Dependency respected | Current be/19 status and execution evidence review. |
| Gate order and conditional checks | Changed documentation review. |
| Code Anti-Slop | Skill source/load, executed audit, findings, re-audit, and zero blocking findings. |
| Static and test gates | Actual command output when implementation applies. |
| Conditional validation | Actual migration/OpenAPI/browser evidence or exact NOT APPLICABLE reason. |
| Diff/secret hygiene | `git status --short`, `git diff --check`, changed-file review, secret/generated-junk review, and final `git diff` review. |
| Truthful completion | Final report lists each gate as PASS, FAIL, or NOT RUN. |

### 19.1 Execution Evidence — 2026-09-23

| Gate | Evidence | Result |
| --- | --- | --- |
| Dependency | `tasks/be/19-backend-testing/technical.md` records COMPLETE with focused, full, live integration, static, open-handle, Anti-Slop, scope, and secret evidence; current `apps/api/**` has no diff. | PASS |
| Focused tests | Six backend foundation suites, 35 tests, passed with `--detectOpenHandles`. | PASS |
| Code Anti-Slop | Loaded `.codex/skills/antislop/SKILL.md` and `.codex/skills/antislop-code/SKILL.md`; audited current `apps/api/src/**`, `apps/api/tests/**`, and changed diff; zero blocking findings. | PASS |
| Lint | `bun run --cwd apps/api lint` | PASS |
| Typecheck | `bun run --cwd apps/api typecheck` | PASS |
| Full tests | `bun run --cwd apps/api test`: 18 suites passed, 2 skipped; 124 tests passed, 6 skipped. Skipped integration coverage has separate current be/19 live evidence. | PASS |
| Open handles | `bun run --cwd apps/api test -- --detectOpenHandles`: 18 suites passed, 2 skipped; 124 tests passed, 6 skipped; no open-handle report. | PASS |
| Integration | PostgreSQL, Redis, and BullMQ live evidence reused from be/19; no source changed after that evidence. | PASS |
| Format | Not required by be/20 contract; not run. | NOT RUN |
| Database migration | No schema change. | NOT APPLICABLE — no schema change. |
| OpenAPI | No API contract change. | NOT APPLICABLE — no public API change. |
| Visual verification | Backend-only quality gate; no rendered UI. | NOT APPLICABLE |
| Diff and review | `git diff --check`, status/diff review, generated-junk review, TODO/FIXME/HACK/debug review, and secret review completed. | PASS |

## 20. Traceability

| Trace Type | References |
| --- | --- |
| Architecture / quality | `AGENTS.md`; `docs/DEVELOPMENT.md` |
| Skills | `.codex/skills/REGISTRY.md`; `.codex/skills/antislop/`; `.codex/skills/antislop-code/` |
| Testing / review | `.codex/skills/quality/verification-loop/`; `.codex/skills/quality/code-review/` |
| Dependency | `tasks/be/19-backend-testing/technical.md` |
| Successor | `tasks/be/21-api-module-architecture-refactor/technical.md` |
| API / database / UI | Not applicable — quality-gate documentation only |

## 21. Open Points

None.

## 22. Definition Of Done

- [x] `be/19` completion evidence permits execution; otherwise status remains dependency-blocked.
- [x] Reusable gate order, independent Anti-Slop evidence, conditional checks, diff/secret review, and truthful reporting are documented.
- [x] No unsupported Anti-Slop command, arbitrary coverage threshold, runtime code, dependency, migration, or successor work is added.
- [x] Documentation consistency review and `git diff --check` pass.
- [x] Changed-file and secret review are complete.
