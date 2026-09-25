# fe/04-theme-design-system — Minimal CMS UI Foundation

## 1. Metadata
| Field | Value |
| --- | --- |
| Task ID | `fe/04-theme-design-system` |
| Batch | N/A |
| Owning Feature | CMS Auth + RBAC-ready UI foundation |
| Workstream | Frontend |
| Task Category | Minimal UI foundation |
| Repository/App | `apps/cms` |
| Status | Implemented — verification incomplete |
| Priority | Foundation |
| Suggested Size | Small |
| Depends On | `fe/03-cms-layout` |
| Blocks | `fe/07-login-page`, `fe/10-ux-states` |
| Execution Order | 4 |

**Contract Status:** Ready.

**Execution Status:** Implemented; browser verification and human visual review remain pending.

## 2. Outcome
Provide minimum neutral UI foundation required by shell, login, auth states, denied, and Not Found flows. This is not a corporate design system.

## 3. Context
Tailwind and current styles exist. `docs/DESIGN.md` permits clean accessible primitives and does not define brand. `fe/04` stays narrow and reversible. The implemented foundation is in `apps/cms/src/styles.css` and is consumed by the current shell, Home, Login, and Not Found views.

## 4. Dependencies
Depends on `fe/03` shell evidence. Use `design-system` only for minimal tokens/specs, `ui-styling` for implementation, and `frontend-patterns` for Vue usage.

## 5. In Scope
- Define only needed background, foreground, surface, muted, border, primary, destructive, focus, feedback, spacing, radius, and typography tokens.
- Apply system/project typography and Tailwind defaults.
- Define states needed by shell, login, auth, denied, unavailable, and Not Found.
- Verify WCAG 2.2 AA, focus, contrast, responsive behavior, and reduced motion.

## 6. Out of Scope
Corporate branding, external fonts, dark mode, full enterprise token catalog, speculative components, external component library, business pages, fake visuals, and ornamental animation.

## 7. Existing Implementation
Tailwind is installed. `apps/cms/src/styles.css` now defines minimal semantic color, spacing, radius, and typography tokens, maps them into Tailwind utilities, and the shell/auth-intent/Not Found views consume those utilities. No brand, dark mode, external font, or component library was added.

## 8. Implementation Requirements
Keep tokens minimal, semantic, and consumed by actual initial flows. Do not introduce competing CSS systems or dependencies. Use Tailwind default breakpoints.

## 9. Applicable Contracts
**UI Contract:** neutral, restrained, content-first, accessible admin interface; WCAG 2.2 AA; system typography; no dark mode.

**API/Database/Configuration Contracts:** Not applicable.

## 10. File Impact
Expected Modify/Create: CMS style/token files, relevant primitives, and focused tests. Expected Not Modified: backend, dependencies, manifests, and business modules.

## 11. Runtime Behavior
Styles load → shell/login/auth/RBAC states consume shared minimal tokens → focus/feedback states remain visible and accessible.

## 12. Error And Edge Cases
Insufficient contrast, invisible focus, overflow, unsupported arbitrary breakpoint, or token unused by initial flow fails review.

## 13. Security Requirements
No external unreviewed assets, secret values, or misleading security state styling.

## 14. Test Requirements
Component/state tests where applicable; browser verification for shell/login/denied/not-found visuals and responsive behavior.

## 15. Task-Level Expected Results
- Minimal shared UI foundation exists.
- No brand or speculative enterprise system is invented.
- Initial auth/RBAC flows can consume consistent states.

## 16. Acceptance Criteria
- [x] Minimal tokens cover actual initial flows.
- [x] System typography and Tailwind breakpoints remain in use.
- [ ] WCAG 2.2 AA visual/accessibility evidence passes.
- [x] No library, font, dark mode, or branding dependency is added.

## 17. Anti-Slop Requirements
Primary `design-system`; optional `ui-ux-pro-max`, `frontend-patterns`, `ui-styling`; final `antislop`, `antislop-ui`, `antislop-human`, `antislop-layoutmobile`, `browser-verification`, `verification-loop`.

## 18. Validation Requirements
Lint, typecheck, tests, build, Anti-Slop, browser verification, `git diff --check`, and changed-file review.

## 19. Completion Evidence
`apps/cms/src/styles.css` defines the minimal token layer; current shell, Login, Home, and Not Found views consume token-backed Tailwind utilities. `bun run test`, `bun run lint`, `bun run typecheck`, and `bun run build` pass. Browser verification and human visual review remain NOT RUN/PENDING.

## 20. Traceability
Not applicable — project has no traceability ID system.

## 21. Open Points
`docs/DESIGN.md` unresolved branding is explicitly out of scope. Browser verification at required viewports and human visual review remain open completion gates.

## 22. Definition Of Done
Minimal foundation implemented, initial flows consume it, tests/static/UI audits/browser evidence pass, and human review complete.
