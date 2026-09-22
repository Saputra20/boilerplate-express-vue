---
name: coding-standards
description: Apply focused TypeScript quality standards for Bun, Express, and Vue code.
---
# Coding Standards

Use for every code change.

- Prefer smallest readable change: KISS, DRY only for real shared responsibility, YAGNI always.
- Use clear names, narrow types, async/await, explicit error paths, immutable data where practical.
- Validate untrusted input; no unjustified any, casts, wrappers, utilities, interfaces, or dependencies.
- Keep functions cohesive; remove dead code only when task scope approves it.
- TypeScript/API JSON camelCase; PostgreSQL snake_case; env UPPER_SNAKE_CASE.
- Use Bun commands from package scripts. Do not import npm/Node/React conventions that conflict with repository.
- Coding standards define craftsmanship. Anti-Slop separately rejects generic, purposeless AI output.

## Project Reference

- Read references/coding-standards.md before applying this skill to repository code.
