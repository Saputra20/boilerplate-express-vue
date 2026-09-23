import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createLogging } from '../src/logging/index.js';
import {
  OPENAPI_DOCUMENT_PATH,
  OPENAPI_INFO_VERSION,
  OPENAPI_UI_PATH,
  OPENAPI_VERSION,
} from '../src/openapi/index.js';

function createTestApp() {
  const directory = mkdtempSync(join(tmpdir(), 'openapi-test-'));
  const logging = createLogging({ directory, stderr: null });
  const app = createApp(logging, { corsOrigins: ['http://localhost:5173'] });

  return { app, directory, logging };
}

describe('OpenAPI infrastructure', () => {
  it('serves public Swagger UI and the raw OpenAPI document', async () => {
    const { app, directory, logging } = createTestApp();

    try {
      const [ui, asset, document] = await Promise.all([
        request(app).get(OPENAPI_UI_PATH),
        request(app).get(`${OPENAPI_UI_PATH}/swagger-ui.css`),
        request(app).get(OPENAPI_DOCUMENT_PATH),
      ]);

      expect(ui.status).toBe(200);
      expect(ui.headers['content-type']).toContain('text/html');
      expect(asset.status).toBe(200);
      expect(asset.headers['content-type']).toContain('text/css');
      expect(document.status).toBe(200);
      expect(document.headers['content-type']).toContain('application/json');
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
        paths: Record<string, { post?: { security?: Array<Record<string, string[]>> } }>;
        components: {
          securitySchemes: { bearerAuth: { type: string; scheme: string; bearerFormat: string } };
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
      expect(Object.keys(document.paths).sort()).toEqual(
        [
          '/auth/login',
          '/auth/logout',
          '/auth/logout-all',
          '/auth/refresh',
          OPENAPI_DOCUMENT_PATH,
          OPENAPI_UI_PATH,
        ].sort(),
      );
      expect(document.paths['/auth/login']?.post?.security).toBeUndefined();
      expect(document.paths['/auth/refresh']?.post?.security).toBeUndefined();
      expect(document.paths['/auth/logout']?.post?.security).toEqual([{ bearerAuth: [] }]);
      expect(document.paths['/auth/logout-all']?.post?.security).toEqual([{ bearerAuth: [] }]);
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
