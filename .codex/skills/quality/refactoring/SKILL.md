---
name: refactoring
description: Perform approved behavior-preserving cleanup without scope creep.
---
# Refactoring

Use only for explicit refactor task or cleanup inside approved scope.

- State behavior invariant first; preserve it with focused tests.
- Remove dead code, unused exports/files/dependencies, duplication, or obsolete code only when evidence supports removal.
- Do not combine feature work with unrelated cleanup. Do not change contracts or architecture accidentally.
- Run relevant Anti-Slop, tests, and diff review after change.
