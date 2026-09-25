import { Router } from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createTestApp } from './helpers/test-app.js';

describe('application shell', () => {
  it('returns JSON for an unknown route', async () => {
    const { app, cleanup } = createTestApp();

    try {
      const response = await request(app).get('/unknown');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Not found' });
    } finally {
      cleanup();
    }
  });

  it('mounts the auth v1 router below the versioned auth prefix', async () => {
    const { logging, cleanup } = createTestApp();
    const router = Router();
    router.get('/composition', (_request, response) => {
      response.status(200).json({ status: 'ok' });
    });
    const app = createApp({
      logging,
      security: { corsOrigins: ['http://localhost:5173'] },
      routers: { authV1: router },
    });

    try {
      const mounted = await request(app).get('/api/v1/auth/composition');
      const legacy = await request(app).get('/auth/composition');
      const unmounted = await request(app).get('/composition');

      expect(mounted.status).toBe(200);
      expect(mounted.body).toEqual({ status: 'ok' });
      expect(legacy.status).toBe(404);
      expect(unmounted.status).toBe(404);
    } finally {
      cleanup();
    }
  });

  it('mounts the authenticated context router below the versioned API prefix', async () => {
    const { logging, cleanup } = createTestApp();
    const router = Router();
    router.get('/me', (_request, response) => {
      response.status(200).json({ status: 'ok' });
    });
    const app = createApp({
      logging,
      security: { corsOrigins: ['http://localhost:5173'] },
      routers: { meV1: router },
    });

    try {
      const mounted = await request(app).get('/api/v1/me');
      const wrongPrefix = await request(app).get('/api/v1/auth/me');

      expect(mounted.status).toBe(200);
      expect(mounted.body).toEqual({ status: 'ok' });
      expect(wrongPrefix.status).toBe(404);
    } finally {
      cleanup();
    }
  });
});
