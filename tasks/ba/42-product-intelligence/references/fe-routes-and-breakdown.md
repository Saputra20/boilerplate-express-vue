# FE Routes and Work Breakdown

## CMS routes
- `/product-intelligence`: freshness and trend summary.
- `/product-intelligence/trends`: source/date/category trend view.

Dedicated read-only pages. Accessible filter labels, keyboard focus, responsive table/chart overflow, loading/success/empty/error/stale states.

## Backend children, after human gate
1. Provider approval spike and credential contract.
2. Product Intelligence schema/migrations with UP/DOWN proof.
3. Collector interface plus one approved connector.
4. Collection run service and BullMQ scheduler/worker.
5. Read service/repository/controller and OpenAPI.
6. Permission catalog/seed update if approved.
7. Backend tests, security and failure verification.

## Frontend children, after backend contract
8. API types/client.
9. Routes, pages, filters, trend presentation, and states.
10. Component/accessibility/browser verification.

No child may run before approval card and its own dependencies complete.
