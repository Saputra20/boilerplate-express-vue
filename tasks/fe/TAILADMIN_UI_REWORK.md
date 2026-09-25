# TailAdmin CMS UI Rework

## Execution split

### Safe to implement now

`fe/13-tailadmin-ui-foundation` owns the TailAdmin Vue visual foundation:

- Login presentation without auth-contract changes.
- Authenticated shell, sidebar, header, page container, breadcrumbs, and typography.
- Shared visual primitives for cards, buttons, fields, selects, checkboxes, badges, tables, pagination, dropdowns, modals, loading, empty, and error states.
- Responsive desktop/tablet/mobile behavior.
- Existing dark-mode alignment where supported.
- Home/dashboard visual shell with an explicit empty or informational state when metrics lack an approved API.

This task uses only approved routes and current authenticated identity/RBAC state. It does not add business routes, fake metrics, fake permissions, or new API contracts.

### Dependency-gated business work

These tasks remain blocked until their backend contracts are approved and implemented:

| Frontend task | Backend dependency | Blocked capability |
| --- | --- | --- |
| `fe/14-category-crud` | `be/26-category-crud` | Category API and business UI |
| `fe/15-role-crud` | `be/27-role-crud` | Role and permission-management UI |
| `fe/16-user-management` | `be/28-user-management` | User-management UI |
| `fe/17-dashboard-summary` | `be/29-dashboard-summary` | Real dashboard metrics |

Existing `be/26-category-crud` remains the category contract source. `be/27`–`be/29` define missing contracts; they do not implement application behavior in this planning update.

## Visual authority

TailAdmin Vue demo remains single visual source of truth: `https://vue-demo.tailadmin.com/`. The project architecture, auth flow, API contracts, Router, Pinia, and backend RBAC authority remain unchanged.

## Verification policy

Foundation implementation may complete automated checks while browser comparison remains separate:

```text
Implementation: COMPLETE when code and automated checks pass
Visual fidelity: NOT RUN — browser renderer unavailable, if applicable
Final visual acceptance: PENDING until side-by-side browser review
```

CRUD and real dashboard acceptance require their approved backend contracts in addition to the foundation gate.
