# fe/01-initial-project — Initial CMS Project

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/01-initial-project` |
| Batch | N/A |
| Owning Feature | CMS foundation |
| Workstream | Frontend |
| Task Category | Foundation |
| Repository/App | `apps/cms` |
| Status | Completed — verified |
| Priority | Foundation |
| Suggested Size | Small |
| Depends On | None |
| Blocks | `fe/02-environment-validation` |
| Execution Order | 1 |

## 2. Outcome
CMS has executable Vue/Vite/TypeScript foundation, environment example, lint/format/test/build scripts, and minimal mounted shell without business behavior.

## 3. Context
Current sources: `apps/cms/package.json`, Vite/Vitest config, `src/`, `tests/`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, and `tasks/README.md`. Existing code is evidence, not automatic task completion.

## 4. Dependencies
No runtime dependency beyond existing repository packages and Bun.

## 5. In Scope
- Verify existing CMS foundation against this contract.
- Preserve minimal shell and current scripts.
- Record command evidence before changing status to Completed.

## 6. Out of Scope
- Router, layout, auth, API client, permissions, product navigation, branding, and feature modules.
- Dependency changes or source implementation during reconciliation.

## 7. Existing Implementation
`apps/cms/package.json`, Vite/Vitest config, `.env.example`, CMS source, router/shell files, and tests exist. Foundation verification is complete. Router, auth state, API client, login behavior, and permission behavior remain owned by later tasks; `fe/03` owns current shell implementation.

## 8. Implementation Requirements
Keep Vue mount executable, scripts truthful, and foundation free of invented product behavior. Environment validation is owned by `fe/02`.

## 9. Applicable Contracts
**Configuration Contract:** `VITE_API_BASE_URL` is documented; validation belongs to `fe/02`.

**API Contract:** Not applicable.

**Database Contract:** Not applicable.

**UI Contract:** Foundation bootstrap only. CMS shell/navigation contract belongs to `fe/03`.

## 10. File Impact
Expected Modify: CMS foundation files only when task executes. Expected Not Modified: `apps/api`, dependencies, lockfiles, and successor tasks.

## 11. Runtime Behavior
Vite serves Vue entrypoint; `main.ts` loads environment validation then mounts `App.vue`. No business route or API request starts.

## 12. Error And Edge Cases
Invalid environment fails before mount under `fe/02`; no secrets in errors. Missing business requirements remain out of scope.

## 13. Security Requirements
No credentials, tokens, or secrets in source, tests, logs, or bundles.

## 14. Test Requirements
Happy path: shell test passes. Regression: current Vitest test remains passing. Isolation: jsdom test is deterministic. Environment negative paths belong to `fe/02`.

## 15. Task-Level Expected Results
- Foundation files and scripts exist and run.
- Minimal shell renders without invented application behavior.
- Evidence distinguishes implementation from verified completion.

## 16. Acceptance Criteria
- [x] Foundation matches listed existing files.
- [x] Lint, typecheck, test, and build evidence is recorded.
- [x] No router, auth, navigation, or feature behavior is claimed.

## 17. Anti-Slop Requirements
Primary `frontend-patterns`; final `antislop`, `verification-loop`. Code Anti-Slop only. Reject speculative abstractions, fake product behavior, dead dependencies, and hidden TODOs.

## 18. Validation Requirements
Static: `bun run --cwd apps/cms lint`, `bun run --cwd apps/cms typecheck`, `git diff --check`.

Automated Tests: `bun run --cwd apps/cms test`.

Build: `bun run --cwd apps/cms build`.

Anti-Slop: `antislop` review; report actual result.

## 19. Completion Evidence
Evidence on September 25, 2026: `bun dev` human smoke test PASS; lint PASS; typecheck PASS; test PASS; build PASS with existing Zod/Rollup annotation warnings. Foundation scope remains complete; later shell implementation is tracked by `fe/03`. Anti-Slop review PASS.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
None for foundation. Environment behavior is tracked in `fe/02`.

## 22. Definition Of Done
Acceptance criteria, scope, tests, lint, typecheck, build, Anti-Slop, diff check, changed-file review, secret review, and human review complete. Browser verification is NOT APPLICABLE: task contains no meaningful rendered UI change beyond existing foundation shell.
