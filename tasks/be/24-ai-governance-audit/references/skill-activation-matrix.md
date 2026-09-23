# Skill Activation Matrix

Load only skills needed for current scope. `AGENTS.md` and approved task remain higher authority. Core Anti-Slop remains mandatory; UI-specific Anti-Slop is only for UI work.

| Task type | Minimum project skills | Conditional skills |
| --- | --- | --- |
| Governance/planning | `document-planning`, `architecture`, `coding-standards`, `verification-loop`, `antislop` | `api-design`, `security-review`, `database-patterns` when contract touches those areas |
| Small backend hotfix | `coding-standards`, `backend-patterns`, `verification-loop`, `antislop` | `security-review`, `api-design`, `tdd-workflow` when applicable |
| API/versioned route | `coding-standards`, `backend-patterns`, `api-design`, `tdd-workflow`, `verification-loop`, `antislop` | `security-review`, `architecture` when boundaries/auth change |
| OpenAPI/Swagger | `api-design`, `backend-patterns`, `verification-loop`, `antislop` | `browser-verification`, `security-review` when rendered docs/auth/exposure changes |
| Database | `coding-standards`, `database-patterns`, `backend-patterns`, `tdd-workflow`, `verification-loop`, `antislop` | `security-review` when sensitive |
| Refactor | `refactoring`, `coding-standards`, `verification-loop`, `antislop` | `architecture` and relevant pattern skill |
| Review | `code-review`, `verification-loop`, `antislop` | `security-review` and UI Anti-Slop when applicable |

Do not load frontend, browser, UI, mobile, copy, or human-specific skills for non-UI work unless the task actually affects those concerns.
