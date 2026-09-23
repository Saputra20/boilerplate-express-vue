# Target OpenAPI Structure

```text
apps/api/src/
  config/
    openapi/
      openapi.ts
      loader.ts                 # only if actual loading responsibility requires it
      validator.ts              # only if actual validation responsibility requires it
  modules/
    auth/
      v1/
        auth.router.ts
        auth.openapi.yaml
    health/
      health.router.ts
      health.openapi.yaml
```

## Serving

```text
/docs              → redirect to /docs/v1
/docs/v1           → Swagger UI bound to v1 document
/openapi/v1.json   → validated v1 JSON document
```

## Ownership

- Module/version YAML owns paths, schemas, tags, operation IDs, examples, and operation security.
- `config/openapi` owns YAML loading, approved local resolution, validation, aggregation, JSON serving, Swagger UI setup, and redirect.
- No Auth schema belongs under `config/openapi/auth/`.
- No `/api/v1/health` or `/api/v1/ops/queues` is created.

## Future

```text
modules/auth/v2/auth.openapi.yaml
/docs/v2
/openapi/v2.json
```

Future v2 must coexist with v1. It must not rewrite v1 serving or create versioned business services automatically.
