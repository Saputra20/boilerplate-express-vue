# Project Planning Context

## Purpose
Turn repository documentation into execution contracts without turning TODO requirements into invented product decisions.

## Evidence
- AGENTS.md owns authority, human approval, Anti-Slop, and completion evidence.
- docs/PRD.md, docs/PRODUCT.md, and docs/DOMAIN.md currently contain TODO: REQUIREMENT NEEDED.
- tasks/be and tasks/fe are ordered task workstreams; each current task has technical.md, Indonesian explanation.md, and references/.

## Workflow
1. Read AGENTS.md, docs, relevant source, then dependency tasks.
2. Label claims as established source behavior, documented target, or unresolved.
3. Preserve existing task IDs and graph. Do not create feature IDs, API paths, permission catalogs, or UI behavior. Only document conservative, reversible infrastructure defaults when `AGENTS.md` permits them; block unresolved product, security, compliance, destructive, public-contract, or irreversible decisions.
4. Require outcome, scope, non-goals, contracts, runtime, errors, security, tests, Anti-Slop, evidence, traceability, and open points.
5. For every backend file impact, state owning module, existing files changing, whether new module files are needed, classification (`module`, `config`, `middleware`, `common`, or `helper`), and whether it would create a forbidden new `apps/api/src` root directory.

## Existing Examples
- tasks/be/02-environment-validation/technical.md has a concrete configuration/startup contract.
- tasks/fe/03-cms-layout/technical.md blocks work because navigation and design are undefined.

## Checklist
- [ ] Dependency exists and has no cycle.
- [ ] Acceptance criteria have observable evidence.
- [ ] Open points block unsafe implementation.
- [ ] Backend file ownership and import direction match `docs/ARCHITECTURE.md`.
- [ ] Plan does not create a new top-level API feature/infrastructure directory.
