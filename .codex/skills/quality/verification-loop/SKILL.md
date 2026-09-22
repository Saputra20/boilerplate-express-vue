---
name: verification-loop
description: Run and report only applicable completion evidence in a truthful order.
---
# Verification Loop

Use at task completion.

1. Run required Anti-Slop; fix findings; rerun it.
2. Run task-specific lint, typecheck, unit/integration tests, build, migration validation, and browser checks where applicable.
3. Inspect git diff --check, git diff, git status, generated output, and secret exposure.
4. Map acceptance criteria to evidence and report PASS, FAIL, NOT RUN, or NOT APPLICABLE exactly.

Tests, build, and Anti-Slop prove different things. No passing check upgrades another gate.

## Project Reference

- Read references/verification-loop.md before applying this skill to repository code.
