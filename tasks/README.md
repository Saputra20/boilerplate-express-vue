# Task System

Each directory is one human-approved, sequential task. Every task contains:

- `technical.md`: engineer and AI execution contract.
- `explanation.md`: Indonesian review explanation.
- `references/`: optional local source material.

## Execution

1. Human reads and approves one task.
2. AI reads task docs, `AGENTS.md`, source-of-truth docs, and dependency output.
3. AI executes only task scope.
4. AI runs selected anti-slop checks, lint, typecheck, tests, relevant build, `git diff --check`, then reviews diff.
5. Human reviews result before approving next task.

Task directories are numbered in recommended order. Dependencies inside each `technical.md` are authoritative; no successor starts automatically.
