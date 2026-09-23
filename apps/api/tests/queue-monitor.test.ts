import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Queue } from 'bullmq';
import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createLogging } from '../src/config/logger/logger.js';
import {
  installQueueMonitor,
  QUEUE_MONITOR_PATH,
  QUEUE_MONITOR_REALM,
} from '../src/config/queue/queue-monitor.js';
import { DEFAULT_QUEUE_NAME } from '../src/config/queue/queue.js';

const monitorCredentials = {
  username: 'queue-monitor',
  password: 'test-queue-monitor-password',
};

function basicAuth(
  username = monitorCredentials.username,
  password = monitorCredentials.password,
): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function createQueue(): Queue {
  return new Queue(DEFAULT_QUEUE_NAME, {
    connection: {
      host: '127.0.0.1',
      port: 1,
      maxRetriesPerRequest: null,
      retryStrategy: null,
    },
  });
}

function createTestApp() {
  const directory = mkdtempSync(join(tmpdir(), 'queue-monitor-test-'));
  const logging = createLogging({ directory, stderr: null });
  const queue = createQueue();
  const app = createApp({
    logging,
    security: { corsOrigins: ['http://localhost:5173'] },
    queueMonitor: { queue, credentials: monitorCredentials },
  });

  return { app, directory, logging, queue };
}

describe('queue monitor', () => {
  it.each([
    ['missing header', undefined],
    ['malformed header', 'Basic no'],
    ['wrong username', basicAuth('wrong-user')],
    ['wrong password', basicAuth(undefined, 'wrong-password')],
  ])('returns generic challenge for %s', async (_scenario, authorization) => {
    const { app, directory, logging, queue } = createTestApp();

    try {
      const monitorRequest = request(app).get(QUEUE_MONITOR_PATH);
      if (authorization) monitorRequest.set('Authorization', authorization);
      const response = await monitorRequest;
      const applicationLog = readFileSync(join(directory, 'application.log'), 'utf8');

      expect(response.status).toBe(401);
      expect(response.headers['www-authenticate']).toBe(`Basic realm="${QUEUE_MONITOR_REALM}"`);
      expect(response.text).toBe('');
      expect(response.text).not.toContain(monitorCredentials.username);
      expect(response.text).not.toContain(monitorCredentials.password);
      expect(applicationLog).not.toContain(monitorCredentials.username);
      expect(applicationLog).not.toContain(monitorCredentials.password);
      expect(applicationLog).not.toContain('Authorization');
    } finally {
      await queue.close();
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('serves Bull Board only at protected operational path', async () => {
    const { app, directory, logging, queue } = createTestApp();

    try {
      const monitor = await request(app).get(QUEUE_MONITOR_PATH).set('Authorization', basicAuth());
      const root = await request(app).get('/').set('Authorization', basicAuth());
      const crossOrigin = await request(app)
        .get(QUEUE_MONITOR_PATH)
        .set('Authorization', basicAuth())
        .set('Origin', 'https://untrusted.example');

      expect(monitor.status).toBe(200);
      expect(monitor.headers['content-type']).toContain('text/html');
      expect(root.status).toBe(404);
      expect(root.body).toEqual({ message: 'Not found' });
      expect(crossOrigin.headers['access-control-allow-origin']).toBeUndefined();
      expect(crossOrigin.headers['access-control-allow-origin']).not.toBe('*');
    } finally {
      await queue.close();
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('registers only default queue in server-side read-only mode', async () => {
    const app = express();
    const queue = createQueue();

    try {
      const adapter = installQueueMonitor(
        app,
        { queue, credentials: monitorCredentials },
        { warn: () => undefined },
      );

      expect(adapter.getName()).toBe(DEFAULT_QUEUE_NAME);
      expect(adapter.readOnlyMode).toBe(true);
      expect(adapter.allowRetries).toBe(false);
    } finally {
      await queue.close();
    }
  });

  it('rejects queue mutation through Bull Board', async () => {
    const { app, directory, logging, queue } = createTestApp();

    try {
      const response = await request(app)
        .put(`${QUEUE_MONITOR_PATH}/api/queues/${DEFAULT_QUEUE_NAME}/pause`)
        .set('Authorization', basicAuth());

      expect(response.status).toBe(405);
      expect(response.body).toEqual({ error: { key: 'ERRORS.QUEUE_READ_ONLY' } });
    } finally {
      await queue.close();
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
