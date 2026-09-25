# fe/11-frontend-testing — Frontend Testing

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/11-frontend-testing` |
| Batch | N/A |
| Owning Feature | CMS auth and RBAC-ready test capability |
| Workstream | Frontend |
| Task Category | Testing |
| Repository/App | `apps/cms` |
| Status | Implemented — verification incomplete |
| Priority | Quality |
| Suggested Size | Medium |
| Depends On | `fe/10-ux-states` |
| Blocks | `fe/12-frontend-quality-gate` |
| Execution Order | 11 |

**Execution Status:** Existing implementation has focused proof for all available frontend capabilities. Human review passed. The RBAC permission-aware navigation/`can()` boundary remains blocked by `fe/09` because no frontend-consumable permission source or approved frontend boundary exists. Browser verification is not run in this test task.

## 2. Outcome
Provide deterministic, dependency-free tests for the implemented CMS foundation: environment loading, shell and mobile navigation, API client, auth/session, login, route guard, safe return targets, and reusable feedback states.

## 3. Context
Vitest, jsdom, Vue Test Utils, and the CMS test configuration already exist. Current source implements API/auth/login/route/shell/feedback behavior. Backend permission data is not exposed to the frontend; tests must not invent that integration.

## 4. Dependencies
Uses existing `apps/cms` test scripts and dependencies. `fe/09-permission-guard`, after `be/25-authenticated-rbac-context`, remains the dependency for real permission-aware navigation and `can()` behavior. No live backend, new package, coverage threshold, or credential is required.

## 5. In Scope
- Focused tests for environment validation and application shell.
- API request paths, bearer handling, safe errors, timeout/network failures, and malformed responses.
- Auth restoration, refresh rotation, single-flight refresh, logout cleanup, and memory-only access-token behavior.
- Login validation, submission, loading/error behavior, and safe internal redirect handling.
- Authentication route guard and `returnTo` sanitization.
- Desktop/mobile shell navigation, Escape handling, focus behavior, and selection close behavior.
- Error, unavailable, and denied feedback states with opt-in retry.
- Explicit fixture tests only when an approved RBAC frontend boundary exists; current permission fixtures must not be described as backend integration.

## 6. Out of Scope
Future business modules, backend permission/profile endpoints, invented permission keys or roles, live backend integration, arbitrary coverage targets, snapshot theater, real credentials, and application-feature changes.

## 7. Existing Implementation
- `apps/cms/vitest.config.ts` configures Vitest with jsdom and Vue support.
- `apps/cms/tests/env.test.ts` covers environment validation.
- `apps/cms/tests/App.test.ts` covers shell routes and mobile navigation.
- `apps/cms/tests/api-client.test.ts` covers API requests, errors, and token response validation.
- `apps/cms/tests/auth-store.test.ts` covers auth persistence boundaries, restoration, rotation, concurrency, and cleanup.
- `apps/cms/tests/login-page.test.ts` covers validation, submit, safe redirect, failure, and authenticated redirect.
- `apps/cms/tests/router-guard.test.ts` covers auth routing and safe `returnTo`; permission metadata remains separate from authentication.
- `apps/cms/tests/feedback-state.test.ts` covers error, unavailable, denied, and opt-in retry states.

## 8. Implementation Requirements
Tests must isolate network and auth boundaries with deterministic mocks, assert observable behavior, and cover success and failure paths. Fixtures must not contain passwords, tokens, keys, or raw credentials. Permission tests may prove UX-only fixture behavior only after an approved frontend permission boundary exists.

## 9. Applicable Contracts
**API Contract:** Current auth routes and safe `{ message }` error handling as implemented by `apps/cms/src/api/client.ts` and the backend API contract.

**UI Contract:** Shell, login, navigation, feedback states, keyboard/focus behavior, and safe contextual errors. No product navigation beyond the existing neutral `Home` item.

**RBAC Contract:** Backend remains authorization authority. Current permission source is `MISSING`; `be/25-authenticated-rbac-context` plans the backend contract and `fe/09` owns the frontend UX boundary afterward.

## 10. File Impact
**Expected Modify:** `apps/cms/tests/**` and task evidence when focused proof is added or reconciled.

**Expected Not Modified:** `apps/cms/src/**`, backend source, package manifests, dependencies, lockfiles, database, and unrelated task documents.

Expected paths are guidance; agent must inspect repository before finalizing changes.

## 11. Runtime Behavior
Run focused tests for changed behavior, then `bun run --cwd apps/cms test`. A regression produces a deterministic non-zero result. Tests do not require a live API or browser server.

## 12. Error And Edge Cases
Cover API 400/401/403/429/5xx, timeout, network failure, malformed token response, failed refresh, concurrent refresh, logout failure cleanup, unsafe return targets, denied versus unauthenticated state, mobile Escape/focus behavior, and unavailable feedback.

## 13. Security Requirements
Do not persist or expose access tokens beyond the approved auth contract. Never put secrets in fixtures or assertions. Do not claim frontend permission state authorizes API access. Do not render raw backend response data or credentials.

## 14. Test Requirements
| Area | Required proof | Current evidence |
| --- | --- | --- |
| Environment | Valid and invalid API URL handling | `env.test.ts` |
| API | Requests, auth headers, safe errors, transport failures, schema rejection | `api-client.test.ts` |
| Auth/session | Restoration, rotation, single-flight refresh, logout cleanup | `auth-store.test.ts` |
| Login | Validation, submit, failure, loading, safe redirect | `login-page.test.ts` |
| Routing | Auth guard and `returnTo` sanitization | `router-guard.test.ts` |
| Shell/mobile | Navigation, drawer, Escape, focus, selection close | `App.test.ts` |
| UX states | Error, unavailable, denied, retry opt-in | `feedback-state.test.ts` |
| RBAC | Permission helper, navigation, route denial, hydration, logout cleanup | Blocked by `be/25` → `fe/09`; no approved boundary to test |

## 15. Task-Level Expected Results
- Available CMS foundation behavior has focused tests.
- Auth/session security and concurrency paths have proof.
- Safe redirect and auth-versus-denied distinctions are tested.
- No permission backend integration or authorization claim is fabricated.
- Full suite runs deterministically without new dependencies.

## 16. Acceptance Criteria
- [x] Each implemented initial capability has focused tests.
- [x] Auth/session security and concurrency paths are tested.
- [x] Safe `returnTo` and auth/permission distinction are tested.
- [ ] RBAC helper, permission-aware navigation, route denial, hydration, and logout-cleanup tests exist — blocked until `be/25` and `fe/09` are implemented.
- [x] Full suite is deterministic and dependency-free.

## 17. Anti-Slop Requirements
`tdd-workflow` governs focused proof; `frontend-patterns` and `security-review` apply to relevant behavior. `antislop` and `verification-loop` remain mandatory. UI Anti-Slop is applicable to rendered behavior already covered by shell/login/feedback tests; no browser renderer was available during this task, so visual verification is `NOT RUN`.

## 18. Validation Requirements
**Static:** `bun run --cwd apps/cms lint`, `bun run --cwd apps/cms typecheck`, and `git diff --check`.

**Automated Tests:** `bun run --cwd apps/cms test`.

**Build:** `bun run --cwd apps/cms build`.

**UI:** Browser verification is `NOT RUN` unless a browser renderer is available; source tests do not substitute for rendered evidence.

**Anti-Slop:** Core Code Anti-Slop; UI Anti-Slop for rendered behavior; truthful reporting of unavailable visual checks.

## 19. Completion Evidence
| Criterion | Evidence |
| --- | --- |
| Implemented capability tests | 7 test files, 47 passing tests |
| Auth/session safety | `apps/cms/tests/auth-store.test.ts` |
| API safety | `apps/cms/tests/api-client.test.ts` |
| Safe routing | `apps/cms/tests/router-guard.test.ts` and `login-page.test.ts` |
| Shell/mobile behavior | `apps/cms/tests/App.test.ts` |
| UX states | `apps/cms/tests/feedback-state.test.ts` |
| Static/build checks | Commands recorded in final task report |
| Remaining gap | `fe/09` permission source and frontend boundary |

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
- `be/25-authenticated-rbac-context` must define and implement the backend source before `fe/09` can implement its frontend boundary and these tests can be added.
- Browser-rendered verification remains pending for meaningful UI behavior.

## 22. Definition Of Done
- [x] Focused tests cover every currently implemented capability in scope.
- [x] No application source, dependency, manifest, or lockfile changes are required.
- [x] Test suite, lint, typecheck, build, and diff checks pass.
- [x] Anti-Slop scope is reviewed and unavailable browser evidence is reported truthfully.
- [ ] `fe/09` permission boundary is implemented and tested.
- [x] Human review is complete.
- [ ] Browser-rendered verification is complete.
