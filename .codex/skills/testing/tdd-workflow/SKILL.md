---
name: tdd-workflow
description: Prove approved behavior with focused unit and integration tests.
---
# TDD Workflow

Use for behavior changes. Flow: requirement → observable behavior → test scenario → implementation → test → scoped refactor → verification.

- Map tests to task acceptance criteria: happy path, validation/business rule, negative/recovery, security, regression, and isolation.
- Backend: Jest unit/integration tests; isolate database/Redis/external boundaries and clean up deterministically.
- Frontend: Vitest component/integration tests; isolate Pinia, Router, API mocks, and global state.
- Add E2E/browser tests only for critical flows or meaningful UI where component/integration tests cannot prove behavior.
- No coverage theater, order dependence, real secrets, or fake passing mocks.
