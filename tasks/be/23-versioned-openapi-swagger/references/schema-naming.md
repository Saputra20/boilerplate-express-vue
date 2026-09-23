# Schema and Operation Naming

## Versioned Schemas

Use deterministic version-aware names for module contracts:

```text
AuthV1LoginRequest
AuthV1RefreshRequest
AuthV1TokenResponse
```

Generic error response may remain shared only when its shape is stable and identical across versions.

Do not use ambiguous names such as `LoginRequest` when v2 could legitimately define a different shape.

## Operation IDs

Use stable semantic IDs:

```text
login
refreshToken
logoutCurrentSession
logoutAllSessions
getHealth
getReadiness
```

Every operation ID must be unique in v1. Do not generate IDs from raw method/path strings.

## Tags

Use capability tags:

```text
Auth
Health
```

Do not tag operations by HTTP method.

## Schema Fidelity

Schemas must match runtime validation and responses. Use `additionalProperties: false` for strict request bodies. Do not add richer response fields merely to make Swagger output look complete.
