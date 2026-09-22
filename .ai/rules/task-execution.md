# Task Execution

1. Human approves one task.
2. Read task docs and listed source-of-truth docs.
3. Implement only scope. Record deviations in final report.
4. Select relevant `anti-slop` checks; do not run irrelevant skills blindly.
5. Run task validation commands, inspect `git diff --check` and `git diff`.
6. Report changed files, validation status, risks, and next approved task.

Never start dependency successors automatically.
