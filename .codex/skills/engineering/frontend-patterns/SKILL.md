---
name: frontend-patterns
description: Implement Vue 3/Vite CMS modules with typed state, routes, forms, and UI states.
---
# Frontend Patterns

Use for CMS work.

- Keep page → business component → composable/Pinia state → API client direction.
- Use feature-specific components; shared UI only for true primitives. Never create generic CRUD components by default.
- Vue Router owns navigation; Pinia owns shared client state; Axios client owns transport normalization; Zod validates forms and untrusted client data where useful.
- Implement applicable loading, empty, error, success, disabled, focus, responsive, and mobile states.
- Frontend permissions are UX only. Backend remains authorization source of truth.
- Use semantic HTML, keyboard access, visible focus, labels, contrast, and safe error display.
- No React hooks, Next.js routing, or fabricated data/interaction.
