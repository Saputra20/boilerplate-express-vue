# fe/02-environment-validation — Environment Validation

`src/env.ts` sudah memvalidasi `VITE_API_BASE_URL` dengan Zod sebelum Vue mount. `tests/env.test.ts` mencakup valid URL, missing URL, malformed URL, dan sanitized error. Status `Completed — verified`; `bun dev`, lint, typecheck, full test, dan build pass. Task tidak mengatur auth/API policy.
