# Dependency Graph and Approval Gates

`Human approval: Product Intelligence MVP + provider` gates all implementation.

After gate, sequence:

`provider spike → schema/migration → collector → queue/worker → API/OpenAPI → FE API client → FE pages → reviewer → QA/release`

Cross-links: schema blocks collector and worker; collector blocks worker; API blocks FE client/pages; reviewer blocks QA; QA blocks release. Permission contract must be approved before API and FE authorization work. Migration validation must pass before worker persistence. Human may reject or narrow any child.

Suggested implementation cards are planning labels only; dispatcher must create them with parent dependency on approval task. No implementation card is runnable from this package alone.
