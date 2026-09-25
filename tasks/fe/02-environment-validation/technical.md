# fe/02-environment-validation — Environment Validation

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/02-environment-validation` |
| Batch | N/A |
| Owning Feature | CMS runtime configuration |
| Workstream | Frontend |
| Task Category | Configuration |
| Repository/App | `apps/cms` |
| Status | Completed — verified |
| Priority | Foundation |
| Suggested Size | Small |
| Depends On | `fe/01-initial-project` |
| Blocks | `fe/03-cms-layout`, `fe/05-api-client` |
| Execution Order | 2 |

## 2. Outcome
CMS validates `VITE_API_BASE_URL` with Zod before Vue mount and fails with sanitized deterministic error when invalid.

## 3. Context
Current sources: `apps/cms/src/env.ts`, `src/main.ts`, `.env.example`, `docs/SECURITY.md`, and `docs/DEVELOPMENT.md`.

## 4. Dependencies
CMS foundation and existing Zod package. No backend or database dependency.

## 5. In Scope
- Verify schema, startup order, example value, and failure behavior.
- Add focused validation tests only when task executes.

## 6. Out of Scope
- API client, retry/timeout policy, auth storage, router, and UI behavior.

## 7. Existing Implementation
`src/env.ts` uses `z.object({ VITE_API_BASE_URL: z.url() })`; `main.ts` calls `loadEnv()` before `createApp().mount`; `.env.example` defines the variable. No env test currently exists.

## 8. Implementation Requirements
Reject missing or invalid URL before mount. Error may identify invalid key and reason, never secret values. Preserve Vite env loading.

## 9. Applicable Contracts
**Configuration Contract**
| Variable | Required | Type | Validation | Default | Secret |
| --- | --- | --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | URL string | Zod `z.url()` | None — startup must fail if missing | No |

**API, Database, UI Contracts:** Not applicable.

## 10. File Impact
Expected Modify: `apps/cms/src/env.ts`, `src/main.ts`, `.env.example`, focused tests when executed. Expected Not Modified: backend, dependencies, and successor implementation.

## 11. Runtime Behavior
Vite exposes env → `loadEnv()` parses it → invalid input throws before mount → valid input permits mount. Current shell makes no API request.

## 12. Error And Edge Cases
Missing, malformed, or non-URL value: startup failure before mount; error excludes raw credentials and tokens. Valid absolute URL: parse succeeds.

## 13. Security Requirements
Do not log environment values or treat Vite-exposed values as secrets.

## 14. Test Requirements
Happy path: valid URL parses. Validation: missing/malformed URL rejects. Regression: validation precedes mount. Isolation: tests require no network.

## 15. Task-Level Expected Results
- Validation exists and is wired before mount.
- `.env.example` documents required variable.
- Focused invalid-input evidence exists before Completed status.

## 16. Acceptance Criteria
- [x] Valid URL returns typed config.
- [x] Invalid or missing URL rejects before Vue mount.
- [x] Error does not expose sensitive values.
- [x] Focused tests prove valid and invalid paths.

## 17. Anti-Slop Requirements
Primary `frontend-patterns`; final `antislop`, `verification-loop`. Code Anti-Slop only. No UI specialist.

## 18. Validation Requirements
Static: lint, typecheck, `git diff --check`. Tests: focused env tests plus full CMS test. Build: CMS build. Anti-Slop: `antislop` review.

## 19. Completion Evidence
Evidence on September 25, 2026: human `bun dev` smoke test PASS with no startup error; `tests/env.test.ts` covers valid URL, missing URL, malformed URL, and sanitized failure; full suite PASS (2 files, 4 tests); lint PASS; typecheck PASS; build PASS with existing Zod/Rollup annotation warnings. Source inspection confirms `loadEnv()` runs before Vue mount. Human review PASS.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
None. Retry, timeout, and request-ID policy belong to `fe/05` only if required by approved contract.

## 22. Definition Of Done
Focused env tests, static checks, build, Anti-Slop, diff review, secret review, and human review complete.
