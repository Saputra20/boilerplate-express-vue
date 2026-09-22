import request from 'supertest';
import { app } from '../src/app.js';

describe('application shell', () => {
  it('returns JSON for an unknown route', async () => {
    const response = await request(app).get('/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Not found' });
  });
});
