---
name: backend-patterns
description: Implement focused Express/Bun/Drizzle/Redis/BullMQ backend modules.
---
# Backend Patterns

Use for API, worker, Redis, or backend infrastructure tasks.

- Route maps HTTP path/method to thin controller; controller validates transport and delegates; service/use case owns behavior; repository owns Drizzle/PostgreSQL access.
- Zod validates body, query, params, configuration, and external payloads at boundaries.
- Select required columns, bound list queries, avoid N+1, use transaction for atomic multi-write behavior.
- Redis and BullMQ clients have explicit lifecycle/shutdown; queue payloads are typed and secret-free.
- Pino/Morgan logs use request IDs and redaction. Central error middleware returns safe production envelopes.
- No Supabase, Next.js route handlers, or generic repositories from upstream examples.
