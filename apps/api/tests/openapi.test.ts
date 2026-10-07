import { rmSync } from 'node:fs';
import request from 'supertest';
import { createTestApp as createApiTestApp } from './helpers/test-app.js';
import {
  OPENAPI_DOCUMENT_PATH,
  OPENAPI_INFO_VERSION,
  OPENAPI_REDIRECT_PATH,
  OPENAPI_UI_PATH,
  OPENAPI_VERSION,
} from '../src/config/openapi/openapi.js';

function createTestApp() {
  return createApiTestApp();
}

describe('OpenAPI infrastructure', () => {
  it('serves public Swagger UI and the raw OpenAPI document', async () => {
    const { app, directory, logging } = createTestApp();

    try {
      const [redirect, ui, asset, init, document] = await Promise.all([
        request(app).get(OPENAPI_REDIRECT_PATH),
        request(app).get(OPENAPI_UI_PATH),
        request(app).get(`${OPENAPI_UI_PATH}/swagger-ui.css`),
        request(app).get(`${OPENAPI_UI_PATH}/swagger-ui-init.js`),
        request(app).get(OPENAPI_DOCUMENT_PATH),
      ]);

      expect(redirect.status).toBe(302);
      expect(redirect.headers.location).toBe(OPENAPI_UI_PATH);
      expect(ui.status).toBe(302);
      expect(ui.headers.location).toBe(`${OPENAPI_UI_PATH}/`);
      expect(asset.status).toBe(200);
      expect(asset.headers['content-type']).toContain('text/css');
      expect(init.status).toBe(200);
      expect(init.text).toContain('"persistAuthorization": false');
      expect(init.text).toContain('"tryItOutEnabled": true');
      expect(document.status).toBe(200);
      expect(document.headers['content-type']).toContain('application/json');

      const slashUi = await request(app).get(`${OPENAPI_UI_PATH}/`);
      expect(slashUi.status).toBe(200);
      expect(slashUi.headers['content-type']).toContain('text/html');
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('documents only current application routes with correct security', async () => {
    const { app, directory, logging } = createTestApp();

    try {
      const response = await request(app).get(OPENAPI_DOCUMENT_PATH);
      const document = response.body as {
        openapi: string;
        info: { version: string };
        servers: Array<{ url: string }>;
        paths: Record<
          string,
          {
            get?: {
              security?: Array<Record<string, string[]>>;
              parameters?: Array<Record<string, unknown>>;
              responses?: Record<string, unknown>;
            };
            post?: {
              security?: Array<Record<string, string[]>>;
              responses?: Record<string, unknown>;
            };
            patch?: {
              operationId?: string;
              security?: Array<Record<string, string[]>>;
              responses?: Record<string, unknown>;
            };
            delete?: {
              security?: Array<Record<string, string[]>>;
              responses?: Record<string, unknown>;
            };
          }
        >;
        components: {
          securitySchemes: { bearerAuth: { type: string; scheme: string; bearerFormat: string } };
          schemas: Record<string, unknown>;
        };
      };

      expect(document.openapi).toBe(OPENAPI_VERSION);
      expect(document.info.version).toBe(OPENAPI_INFO_VERSION);
      expect(document.servers).toEqual([{ url: '/' }]);
      expect(document.components.securitySchemes.bearerAuth).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });
      expect(document.components.schemas.AuthV1LoginRequest).toBeDefined();
      expect(document.components.schemas.AuthV1RefreshRequest).toBeDefined();
      expect(document.components.schemas.AuthV1LoginResponse).toBeDefined();
      expect(document.components.schemas.AuthV1RefreshResponse).toBeDefined();
      expect(document.components.schemas.AuthV1PasswordChangeRequest).toBeDefined();
      expect(document.components.schemas.AuthV1SelfServicePasswordChangeRequest).toBeDefined();
      expect(document.components.schemas.AuthV1PasswordChangeRequired).toBeDefined();
      expect(document.components.schemas.AuthV1TokenResponse).toBeUndefined();
      expect(document.components.schemas.MeV1User).toBeDefined();
      expect(document.components.schemas.MeV1Response).toBeDefined();
      expect(document.components.schemas.CategoryV1).toBeDefined();
      expect(document.components.schemas.CategoryV1ListResponse).toBeDefined();
      expect(document.components.schemas.RoleV1).toBeDefined();
      expect(document.components.schemas.PermissionCatalogItem).toBeDefined();
      expect(document.components.schemas.HealthV1Status).toBeDefined();
      expect(document.components.schemas.HealthV1ReadinessStatus).toBeDefined();

      const auditItem = document.components.schemas.AuditV1Item as {
        properties?: Record<string, { enum?: string[] }>;
      };
      const auditChanges = document.components.schemas.AuditV1Changes as {
        properties?: Record<
          string,
          { properties?: Record<string, unknown>; additionalProperties?: boolean }
        >;
      };
      const auditExportFilters = document.components.schemas.AuditV1ExportFilters as {
        properties?: Record<string, { enum?: string[]; pattern?: string; maxLength?: number }>;
      };
      const auditDetail = document.components.schemas.AuditV1Detail as {
        allOf?: unknown;
        additionalProperties?: boolean;
      };
      expect(auditItem.properties?.eventType?.enum).toEqual([
        'category.created',
        'category.updated',
        'category.deleted',
        'role.created',
        'role.updated',
        'role.deleted',
        'user.created',
        'user.updated',
        'user.deleted',
        'user.profile_updated',
        'audit.exported',
      ]);
      expect(auditChanges.properties?.before?.additionalProperties).toBe(false);
      expect(auditChanges.properties?.after?.additionalProperties).toBe(false);
      expect(auditExportFilters.properties?.action?.enum).toEqual(
        auditItem.properties?.eventType?.enum,
      );
      expect(auditExportFilters.properties?.resourceType).toMatchObject({
        pattern: '^[a-z][a-z0-9_]*$',
        maxLength: 64,
      });
      expect(auditExportFilters.properties?.resourceId?.maxLength).toBe(255);
      expect(Object.keys(auditChanges.properties?.before?.properties ?? {}).sort()).toEqual([
        'code',
        'description',
        'displayName',
        'email',
        'isActive',
        'name',
        'permissionCodes',
        'roleId',
        'slug',
        'status',
      ]);
      expect(Object.keys(auditChanges.properties?.after?.properties ?? {}).sort()).toEqual([
        'code',
        'description',
        'displayName',
        'email',
        'isActive',
        'name',
        'permissionCodes',
        'roleId',
        'slug',
        'status',
      ]);
      expect(auditDetail.allOf).toBeUndefined();
      expect(auditDetail.additionalProperties).toBe(false);
      expect(document.paths['/api/v1/audit-events/{id}']?.get?.responses).toMatchObject({
        '404': {
          content: {
            'application/json': {
              schema: expect.objectContaining({
                type: 'object',
                required: ['message'],
                properties: expect.objectContaining({ message: { type: 'string' } }),
              }),
            },
          },
        },
      });
      expect(document.paths['/api/v1/audit-events']?.get?.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'limit',
            schema: expect.objectContaining({ enum: [10, 20, 50, 100], default: 10 }),
          }),
          expect.objectContaining({
            name: 'cursor',
            description: expect.stringContaining('Opaque'),
            schema: expect.objectContaining({ minLength: 1, maxLength: 512 }),
          }),
          expect.objectContaining({
            name: 'action',
            schema: expect.objectContaining({ enum: auditItem.properties?.eventType?.enum }),
          }),
          expect.objectContaining({
            name: 'from',
            description: expect.stringContaining('last 30 days'),
          }),
        ]),
      );
      expect(document.paths['/api/v1/audit-events/export']?.get?.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'to',
            description: expect.stringContaining('31 days'),
          }),
        ]),
      );
      expect(Object.keys(document.paths).sort()).toEqual(
        [
          '/api/v1/auth/login',
          '/api/v1/auth/change-password',
          '/api/v1/auth/change-password/self-service',
          '/api/v1/auth/password-reset/request',
          '/api/v1/auth/password-reset/confirm',
          '/api/v1/auth/email-verification/request',
          '/api/v1/auth/email-verification/verify',
          '/api/v1/auth/logout',
          '/api/v1/auth/logout-all',
          '/api/v1/auth/refresh',
          '/api/v1/dashboard/summary',
          '/api/v1/audit-events',
          '/api/v1/audit-events/{id}',
          '/api/v1/audit-events/export',
          '/api/v1/me',
          '/api/v1/categories',
          '/api/v1/categories/{id}',
          '/api/v1/roles',
          '/api/v1/roles/{id}',
          '/api/v1/misc/permissions',
          '/api/v1/users',
          '/api/v1/users/{id}',
          OPENAPI_REDIRECT_PATH,
          OPENAPI_DOCUMENT_PATH,
          OPENAPI_UI_PATH,
          '/health',
          '/ready',
        ].sort(),
      );
      expect(document.paths['/api/v1/auth/login']?.post?.security).toBeUndefined();
      expect(document.paths['/api/v1/auth/password-reset/request']?.post?.security).toBeUndefined();
      expect(document.paths['/api/v1/auth/password-reset/confirm']?.post?.security).toBeUndefined();
      expect(
        document.paths['/api/v1/auth/email-verification/request']?.post?.security,
      ).toBeUndefined();
      expect(
        document.paths['/api/v1/auth/email-verification/verify']?.post?.security,
      ).toBeUndefined();
      expect(document.paths['/api/v1/auth/refresh']?.post?.security).toBeUndefined();
      expect(document.paths['/api/v1/auth/logout']?.post?.security).toEqual([{ bearerAuth: [] }]);
      expect(document.paths['/api/v1/auth/logout-all']?.post?.security).toEqual([
        { bearerAuth: [] },
      ]);
      expect(document.paths['/api/v1/auth/change-password']?.post?.security).toEqual([
        { bearerAuth: [] },
      ]);
      expect(document.paths['/api/v1/auth/change-password/self-service']?.post?.security).toEqual([
        { bearerAuth: [] },
      ]);
      expect(document.paths['/api/v1/auth/change-password/self-service']?.post).toMatchObject({
        operationId: 'changeCurrentUserPassword',
        responses: expect.objectContaining({
          '204': expect.any(Object),
          '400': expect.any(Object),
          '401': expect.any(Object),
          '403': expect.any(Object),
          '413': expect.any(Object),
          '429': expect.any(Object),
          '500': expect.any(Object),
        }),
      });
      const loginResponse = document.paths['/api/v1/auth/login']?.post?.responses?.['200'] as {
        content?: { 'application/json'?: { schema?: { properties?: Record<string, unknown> } } };
      };
      const refreshResponse = document.paths['/api/v1/auth/refresh']?.post?.responses?.['200'] as {
        content?: { 'application/json'?: { schema?: { properties?: Record<string, unknown> } } };
      };
      expect(loginResponse.content?.['application/json']?.schema?.properties).toHaveProperty(
        'mustChangePassword',
      );
      expect(refreshResponse.content?.['application/json']?.schema?.properties).not.toHaveProperty(
        'mustChangePassword',
      );
      expect(document.paths['/api/v1/me']?.get?.security).toEqual([{ bearerAuth: [] }]);
      expect(document.paths['/api/v1/me']?.patch).toMatchObject({
        operationId: 'updateCurrentUserProfile',
        security: [{ bearerAuth: [] }],
        responses: expect.objectContaining({
          '200': expect.any(Object),
          '400': expect.any(Object),
          '401': expect.any(Object),
          '403': expect.any(Object),
          '413': expect.any(Object),
          '429': expect.any(Object),
          '500': expect.any(Object),
        }),
      });
      expect(document.paths['/api/v1/dashboard/summary']?.get?.security).toEqual([
        { bearerAuth: [] },
      ]);
      expect(document.paths['/api/v1/misc/permissions']?.get?.security).toEqual([
        { bearerAuth: [] },
      ]);
      expect(document.paths['/api/v1/categories']?.get?.security).toEqual([{ bearerAuth: [] }]);
      expect(document.paths['/api/v1/categories/{id}']?.delete?.security).toEqual([
        { bearerAuth: [] },
      ]);
      expect(document.paths['/api/v1/misc/permissions']?.get?.responses).toHaveProperty('403');
      const meUser = document.components.schemas.MeV1User as {
        required?: string[];
        properties?: Record<string, unknown>;
      };
      expect(meUser.required).toContain('mustChangePassword');
      expect(meUser.required).toContain('displayName');
      expect(meUser.properties).toHaveProperty('mustChangePassword');
      expect(meUser.properties).toHaveProperty('displayName');
      const protectedPaths = [
        '/api/v1/categories',
        '/api/v1/categories/{id}',
        '/api/v1/dashboard/summary',
        '/api/v1/roles',
        '/api/v1/roles/{id}',
        '/api/v1/users',
        '/api/v1/users/{id}',
        '/api/v1/misc/permissions',
      ];
      for (const path of protectedPaths) {
        const operations = document.paths[path] as Record<
          string,
          { security?: unknown; responses?: Record<string, unknown> }
        >;
        for (const operation of Object.values(operations)) {
          if (!operation || typeof operation !== 'object' || !('security' in operation)) continue;
          expect(operation.responses).toHaveProperty('403');
        }
      }
      expect(document.paths['/health']?.get?.security).toBeUndefined();
      expect(document.paths['/ready']?.get?.security).toBeUndefined();
      expect(document.paths['/ops/queues']).toBeUndefined();
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('does not expose runtime secret-like values in the document', async () => {
    const { app, directory, logging } = createTestApp();
    const sensitiveValues = [
      'queue-monitor-password-that-must-not-appear',
      'queue-monitor',
      'database-url-secret-sentinel',
      'redis-url-secret-sentinel',
      'private-key-secret-sentinel',
      'Bearer real-access-token',
    ];

    try {
      const response = await request(app).get(OPENAPI_DOCUMENT_PATH);
      const serializedDocument = JSON.stringify(response.body);

      for (const sensitiveValue of sensitiveValues) {
        expect(serializedDocument).not.toContain(sensitiveValue);
      }
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
