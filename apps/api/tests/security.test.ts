import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createLogging } from '../src/logging/index.js';
import { createErrorHandler, installSecurityMiddleware } from '../src/security/index.js';
import { shutdown } from '../src/shutdown.js';

const origin = 'http://localhost:5173';
const directories: string[] = [];

function createDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'api-security-test-'));
  directories.push(directory);
  return directory;
}

function createTestApp(options?: {
  rateLimit?: { limit: number; windowMs: number };
  jsonBodyLimit?: string;
}) {
  const directory = createDirectory();
  const logging = createLogging({ directory, stderr: null });
  const app = createApp(logging, {
    corsOrigins: [origin],
    rateLimit: options?.rateLimit,
    jsonBodyLimit: options?.jsonBodyLimit,
  });

  return { app, directory, logging };
}

describe('security foundation', () => {
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('adds Helmet headers and exact CORS approval without credentials', async () => {
    const { app, logging } = createTestApp();

    const response = await request(app).get('/unknown').set('Origin', origin);

    expect(response.status).toBe(404);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['access-control-allow-origin']).toBe(origin);
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    expect(response.headers['access-control-expose-headers']).toBeUndefined();

    logging.close();
  });

  it('supports approved CORS preflight without approving unsupported values', async () => {
    const { app, logging } = createTestApp();

    const approved = await request(app)
      .options('/unknown')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Request-Id');
    const unsupported = await request(app)
      .options('/unknown')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'TRACE')
      .set('Access-Control-Request-Headers', 'X-Unsafe-Header');

    expect(approved.status).toBe(204);
    expect(approved.headers['access-control-allow-methods']).toBe(
      'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    );
    expect(approved.headers['access-control-allow-headers']).toBe(
      'Content-Type,Authorization,X-Request-Id',
    );
    expect(unsupported.headers['access-control-allow-methods']).not.toContain('TRACE');
    expect(unsupported.headers['access-control-allow-headers']).not.toContain('X-Unsafe-Header');

    logging.close();
  });

  it('does not approve disallowed origins or use wildcard CORS', async () => {
    const { app, logging } = createTestApp();

    const response = await request(app).get('/unknown').set('Origin', 'https://untrusted.example');

    expect(response.status).toBe(404);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-origin']).not.toBe('*');

    logging.close();
  });

  it('enforces the 101st request with a sanitized 429 response', async () => {
    const { app, directory, logging } = createTestApp();

    for (let requestCount = 0; requestCount < 100; requestCount += 1) {
      await request(app).get('/unknown');
    }
    const response = await request(app).get('/unknown');
    const applicationLog = readFileSync(join(directory, 'application.log'), 'utf8');

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ message: 'Too many requests' });
    expect(response.headers['ratelimit-limit']).toBe('100');
    expect(response.body).not.toHaveProperty('limit');
    expect(applicationLog).toMatch(/"requestId":"[0-9a-f-]{36}"/);

    logging.close();
  });

  it('rejects malformed and oversized JSON with safe errors', async () => {
    const { app, logging } = createTestApp({ jsonBodyLimit: '32b' });

    const accepted = await request(app)
      .post('/unknown')
      .set('Content-Type', 'application/json')
      .send({ value: 'ok' });

    const malformed = await request(app)
      .post('/unknown')
      .set('Content-Type', 'application/json')
      .send('{');
    const oversized = await request(app)
      .post('/unknown')
      .set('Content-Type', 'application/json')
      .send({ value: 'x'.repeat(64) });

    expect(accepted.status).toBe(404);
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ message: 'Bad request' });
    expect(oversized.status).toBe(413);
    expect(oversized.body).toEqual({ message: 'Payload too large' });

    logging.close();
  });

  it('sanitizes unknown internal errors', async () => {
    const directory = createDirectory();
    const logging = createLogging({ directory, stderr: null });
    const app = express();

    app.use(logging.requestLogger);
    installSecurityMiddleware(app, logging.logger, { corsOrigins: [origin] });
    app.get('/boom', () => {
      throw new Error('/private/path token-do-not-return');
    });
    app.use(createErrorHandler(logging.logger));

    const response = await request(app).get('/boom');
    const applicationLog = readFileSync(join(directory, 'application.log'), 'utf8');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
    expect(JSON.stringify(response.body)).not.toContain('private');
    expect(applicationLog).not.toContain('token-do-not-return');

    logging.close();
  });

  it('closes current resources in shutdown order', async () => {
    const calls: string[] = [];

    await shutdown(
      {
        close(callback) {
          calls.push('server');
          callback();
        },
      },
      {
        database: {
          async close() {
            calls.push('database');
          },
        },
        redis: { close: () => calls.push('redis') },
        logging: { close: () => calls.push('logging') },
      },
    );

    expect(calls).toEqual(['server', 'database', 'redis', 'logging']);
  });

  it('closes resources even when HTTP server close fails', async () => {
    const calls: string[] = [];

    await expect(
      shutdown(
        {
          close(callback) {
            calls.push('server');
            callback(new Error('close failed'));
          },
        },
        {
          database: {
            async close() {
              calls.push('database');
            },
          },
          redis: { close: () => calls.push('redis') },
          logging: { close: () => calls.push('logging') },
        },
      ),
    ).rejects.toThrow('close failed');

    expect(calls).toEqual(['server', 'database', 'redis', 'logging']);
  });
});
