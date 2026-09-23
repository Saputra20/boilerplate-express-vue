# Skill Registry

Project skills live here. External Anti-Slop skills remain upstream/plugin-provided and are referenced, never copied.

Skill files describe reusable methods, not current implementation state. Verify paths, capabilities, and security claims against source, tests, manifests, active configuration, and validation output. External Anti-Slop files under `.codex/skills/antislop*` are available project inputs; execution still requires reporting the actual audit result rather than inferring PASS from their presence.

| Skill | Source | Purpose | Activation |
| --- | --- | --- | --- |
| document-planning | Project | Documentation to execution contracts | Planning or task migration |
| coding-standards | ECC adapted | TypeScript/Vue/Express/Bun quality | Any code task |
| architecture | ECC/project | Layering and dependency direction | Cross-module work |
| backend-patterns | ECC adapted | Express/Drizzle/Redis/BullMQ boundaries | Backend |
| frontend-patterns | ECC adapted | Vue 3/Pinia/Router/Axios/Tailwind | Frontend |
| api-design | ECC/project | API contract stability/OpenAPI | API changes |
| database-patterns | ECC adapted | Drizzle/PostgreSQL migrations and queries | Database |
| security-review | ECC adapted | Security-sensitive review | Auth, input, secrets, endpoints |
| tdd-workflow | ECC adapted | Behavior-first unit/integration testing | Behavior change |
| browser-verification | ECC agent adapted | Rendered UI/E2E verification | Meaningful UI/critical flow |
| code-review | ECC agent adapted | Diff correctness and maintainability review | Before handoff |
| verification-loop | ECC adapted | Applicable final validation sequence | Completion |
| refactoring | ECC agent adapted | Scoped cleanup | Approved refactor |
| antislop | Anti-Slop external | Core quality filter | Every approved task |
| antislop-ui | Anti-Slop external | UI filter | UI |
| antislop-human | Anti-Slop external | Human/accessibility interaction filter | UI/accessibility |
| antislop-layoutmobile | Anti-Slop external | Responsive/mobile filter | Responsive/mobile |
| antislop-copywriting | Anti-Slop external | Copy filter | User-facing copy |
| antislop-code | Anti-Slop external | Code-comment filter | Comment-heavy change |

## Activation Matrix

| Task | Required skills |
| --- | --- |
| Planning | document-planning, architecture, coding-standards, api-design/database-patterns/security-review when applicable, planning quality checks |
| Backend | coding-standards, backend-patterns, api-design/database-patterns/security-review as applicable, tdd-workflow, antislop, verification-loop |
| Frontend | coding-standards, frontend-patterns, api-design, tdd-workflow, antislop, verification-loop |
| UI | frontend-patterns, browser-verification, antislop, antislop-ui, antislop-human; add antislop-layoutmobile for responsive work |
| Database | coding-standards, database-patterns, backend-patterns, security-review where sensitive, tdd-workflow, antislop, verification-loop |
| Review | code-review, security-review when applicable, relevant Anti-Slop, verification-loop |
| Refactor | refactoring, coding-standards, relevant patterns, antislop, verification-loop |
| Release | verification-loop, code-review, security-review when applicable |
| Governance audit | document-planning, architecture, verification-loop, antislop |

Load only applicable skills. AGENTS.md and approved task remain higher authority.
