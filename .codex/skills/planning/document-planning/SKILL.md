---
name: document-planning
description: Convert source-of-truth documentation into small, human-reviewable execution contracts.
---
# Document Planning

Use for PRD-to-task planning, task migration, or task review. This skill owns task-document structure; AGENTS.md remains higher authority.

1. Read AGENTS.md, source docs in authority order, relevant code, then dependency tasks.
2. Do not invent business rules, IDs, API paths, DB semantics, defaults, or UI behavior. Record TODO: REQUIREMENT NEEDED or block task.
3. Split independent capabilities. Small means reviewable diff plus precise contract.
4. Write canonical technical.md: metadata, outcome, context, scope/non-goals, implementation requirements, contracts, file impact, runtime, errors, security, tests, validation, acceptance, expected results, Anti-Slop, DoD/evidence, traceability, open points.
5. Write Indonesian explanation.md: purpose, reason, work, exclusions, dependencies, risks, verification, human review, expected output, next task.
6. Reject vague objectives, generic add-tests text, unobservable criteria, missing evidence, hidden future work, and invented requirements.
7. Check task graph: existing dependencies, coherent order, no cycles, no successor dependency.

Planning quality gate: another agent must implement without guessing; human must see exact change; completion must have objective evidence.
