# Authority and Ownership

## Authority order

1. Explicit human instruction for current work.
2. Approved task contract.
3. Authoritative project documentation.
4. Current implementation and actual validation evidence.
5. `AGENTS.md`.
6. Applicable project skills.
7. General engineering practice.

When sources conflict, record the conflict, identify the winner, and stop when the conflict requires a product, security, permission, compliance, destructive-data, breaking-API, or irreversible-architecture decision.

## Ownership

| Owner | Owns | Does not own |
| --- | --- | --- |
| `AGENTS.md` | Governance, authority, approval, hard stops | Runtime feature details |
| `docs/**` | Durable project and runtime guidance | Task-specific completion evidence |
| `.codex/skills/**` | Reusable methods and activation | Product decisions or implementation state |
| `tasks/**` | Scoped execution contracts and evidence | Proof that task executed |
| Source/tests/config | Actual implementation and behavior | Future target architecture |

## State labels

`Planned`, `Ready`, and `Blocked` describe task workflow only. They never replace source inspection, validation output, or human completion evidence.
