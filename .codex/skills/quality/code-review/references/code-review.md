# Current Review Baseline

## Workflow
1. Read approved task, AGENTS.md, docs, and changed current source.
2. Inspect git status, git diff --check, and git diff.
3. Compare claims to current evidence: API app.ts/server.ts, modules, middleware, config, and helpers; CMS main.ts/env.ts/App.vue/styles.css.
4. Check contracts, tests, secret exposure, dependencies, generated output, and Anti-Slop separately.

## Repository-Specific Checks
- API fallback 404 stays valid unless approved routing change replaces it.
- API/CMS config validates before listen/mount.
- API business behavior stays in its owning module; cross-cutting middleware and infrastructure stay out of module service/repository layers.
- No root .env; app env/logs/API key contents remain ignored.
- Installed dependencies do not prove a pattern exists.

## Avoid
Do not approve JWT/RBAC/logging claims because packages/docs exist. Do not call browser verification PASS from Vitest. Do not fix unrelated config during review.

## Checklist
- [ ] Diff matches task scope.
- [ ] Current source supports every implementation claim.
- [ ] Acceptance evidence is real.
- [ ] Anti-Slop status is independent.
