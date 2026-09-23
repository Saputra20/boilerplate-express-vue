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

  it('mounts an auth module router below the unchanged auth prefix', async () => {
    const { logging, cleanup } = createTestApp();
    const router = Router();
    router.get('/composition', (_request, response) => {
      response.status(200).json({ status: 'ok' });
    });
    const app = createApp({
      logging,
      security: { corsOrigins: ['http://localhost:5173'] },
      auth: { router },
    });

    try {
      const mounted = await request(app).get('/auth/composition');
      const unmounted = await request(app).get('/composition');

      expect(mounted.status).toBe(200);
      expect(mounted.body).toEqual({ status: 'ok' });
      expect(unmounted.status).toBe(404);
    } finally {
      cleanup();
    }
  });
});
