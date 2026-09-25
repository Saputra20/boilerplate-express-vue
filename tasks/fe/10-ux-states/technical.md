# fe/10-ux-states — Minimal Shared UX States

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/10-ux-states` |
| Batch | N/A |
| Owning Feature | CMS Auth + RBAC-ready UX |
| Workstream | Frontend |
| Task Category | UI states |
| Repository/App | `apps/cms` |
| Status | Implemented — verification incomplete |
| Priority | Foundation |
| Suggested Size | Small |
| Depends On | `fe/04-theme-design-system`, `fe/09-permission-guard` |
| Blocks | `fe/11-frontend-testing` |
| Execution Order | 10 |

**Contract Status:** Ready.

**Execution Status:** Implemented and verified; browser rendered-state verification and human review remain pending. Permission hydration remains owned by `fe/09`.

## 2. Outcome
Provide only reusable states required by shell, auth, login, routing, and RBAC: loading, error, Not Found, permission denied, and unavailable.

## 3. Context
Current CMS has a Not Found view, contextual login errors, and submit loading state. `apps/cms/src/components/FeedbackState.vue` now provides the repeated persistent feedback primitive for error, unavailable, and denied states while Not Found remains shell-owned.

## 4. Dependencies
Depends on minimal UI foundation and RBAC denied-state contract. Uses existing Vue/Tailwind only.

## 5. In Scope
- Reuse actual repeated loading/error/unavailable/denied patterns.
- Keep Not Found state aligned with shell.
- Show retry only for safe-to-repeat operations.
- Prefer inline/contextual persistent errors; transient feedback only when justified.
- Use neutral reusable copy; feature-specific copy remains feature-owned.

## 6. Out of Scope
Giant state framework, toast dependency, mutation retry, fake content, speculative variants, and business-feature copy.

## 7. Existing Implementation
`FeedbackState` is consumed by Login for safe error/unavailable feedback and supports denied feedback for the later RBAC UX boundary without resolving permissions. Login keeps loading/disabled state contextual to the submit operation. `NotFoundView` remains a dedicated route state. No toast framework or generic state registry exists.

## 8. Implementation Requirements
Create abstractions only where actual repetition exists. Never hide API errors or expose raw backend internals. Do not auto-retry mutations.

## 9. Applicable Contracts
**States:** loading, error, Not Found, permission denied, unavailable. Safe backend error envelope `{ message }`; permission denial is distinct from 401/login.

**UI:** neutral copy, accessible status, contextual feedback.

## 10. File Impact
Expected Create/Modify: minimal state components/composables and tests. Expected Not Modified: backend, dependencies, speculative notification framework, business modules.

## 11. Runtime Behavior
Consumer supplies actual state → shared state renders accessible feedback → safe retry only when approved → success/empty transitions remain truthful.

## 12. Error And Edge Cases
Network failure, timeout, safe server error, unavailable dependency, permission denial, restoration pending, and unknown route.

## 13. Security Requirements
Never render tokens, credentials, stack traces, or internal response details. Permission denied never becomes login.

## 14. Test Requirements
Test each implemented state and transitions, safe retry eligibility, accessible status, and denied-vs-unauthenticated distinction. Browser verify meaningful rendered states.

## 15. Task-Level Expected Results
- Initial auth/CMS/RBAC flows share only justified state primitives.
- Persistent failures are contextual and safe.
- No hypothetical framework is created.

## 16. Acceptance Criteria
- [x] States are limited to actual initial consumers and the explicitly scoped RBAC denied boundary.
- [x] Retry appears only when a consumer explicitly opts into the `retryable` prop.
- [x] Permission denied is distinct from login/auth failure.
- [x] No toast dependency or generic state framework is added.
- [ ] Accessibility and rendered evidence pass.

## 17. Anti-Slop Requirements
Primary `frontend-patterns`; optional `design-system`, `ui-styling`, `ui-ux-pro-max`; final `antislop`, `antislop-ui`, `antislop-human`, `antislop-layoutmobile`, `browser-verification`, `verification-loop`.

## 18. Validation Requirements
Focused/full tests, lint, typecheck, build, UI audits, browser verification, `git diff --check`, and scope review.

## 19. Completion Evidence
`FeedbackState.vue` provides safe accessible error, unavailable, and denied states with opt-in retry; Login consumes error/unavailable states; loading remains a disabled submit state; Not Found remains route-specific. `bun run test` passes 51 tests; lint, typecheck, build, and diff checks pass. Browser rendered-state verification and human review remain NOT RUN/PENDING. No profile/permission data is fabricated.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
None for scope. `fe/09` backend contract remains an external dependency for real permission hydration.

## 22. Definition Of Done
Minimal states implemented for actual consumers, tests/static/UI/browser checks pass, and human review complete.
