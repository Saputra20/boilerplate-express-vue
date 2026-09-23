import request from 'supertest';
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
});
