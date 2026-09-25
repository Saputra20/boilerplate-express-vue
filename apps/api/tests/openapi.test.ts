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
            get?: { security?: Array<Record<string, string[]>> };
            post?: { security?: Array<Record<string, string[]>> };
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
      expect(document.components.schemas.AuthV1TokenResponse).toBeDefined();
      expect(document.components.schemas.MeV1User).toBeDefined();
      expect(document.components.schemas.MeV1Response).toBeDefined();
      expect(document.components.schemas.HealthV1Status).toBeDefined();
      expect(document.components.schemas.HealthV1ReadinessStatus).toBeDefined();
      expect(Object.keys(document.paths).sort()).toEqual(
        [
          '/api/v1/auth/login',
          '/api/v1/auth/logout',
          '/api/v1/auth/logout-all',
          '/api/v1/auth/refresh',
          '/api/v1/me',
          OPENAPI_REDIRECT_PATH,
          OPENAPI_DOCUMENT_PATH,
          OPENAPI_UI_PATH,
          '/health',
          '/ready',
        ].sort(),
      );
      expect(document.paths['/api/v1/auth/login']?.post?.security).toBeUndefined();
      expect(document.paths['/api/v1/auth/refresh']?.post?.security).toBeUndefined();
      expect(document.paths['/api/v1/auth/logout']?.post?.security).toEqual([{ bearerAuth: [] }]);
      expect(document.paths['/api/v1/auth/logout-all']?.post?.security).toEqual([
        { bearerAuth: [] },
      ]);
      expect(document.paths['/api/v1/me']?.get?.security).toEqual([{ bearerAuth: [] }]);
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
