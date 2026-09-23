import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createLogging } from '../src/logging/index.js';

describe('application shell', () => {
  it('returns JSON for an unknown route', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-app-test-'));
    const logging = createLogging({ directory, stderr: null });
    const app = createApp(logging);

    try {
      const response = await request(app).get('/unknown');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Not found' });
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
