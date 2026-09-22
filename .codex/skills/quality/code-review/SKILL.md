---
name: code-review
description: Review approved task diffs for correctness, boundaries, security, tests, and maintainability.
---
# Code Review

Use before human handoff.

- Compare diff to task outcome, scope, contracts, edge cases, acceptance criteria, and evidence.
- Check correctness, layer direction, API/DB contract impact, auth/permission, validation, secrets/logging, tests, naming, duplication, complexity, dependencies, and documentation impact.
- Apply relevant Anti-Slop findings: generic implementation, fake completeness, boilerplate, scope creep, unnecessary abstraction.
- Inspect git status, git diff --check, and git diff. Report blockers first; never silently fix unrelated findings.

## Project Reference

- Read references/code-review.md before applying this skill to repository code.
