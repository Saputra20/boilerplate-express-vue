import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import express from 'express';
import request from 'supertest';
import { createLogging } from '../src/logging/index.js';

class MemoryStream extends Writable {
  output = '';

  override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.output += chunk.toString();
    callback();
  }
}

const directories: string[] = [];

function createDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'api-logging-test-'));
  directories.push(directory);
  return directory;
}

describe('logging foundation', () => {
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('correlates Pino application logs and Morgan access logs without mixing destinations', async () => {
    const directory = createDirectory();
    const stderr = new MemoryStream();
    const logging = createLogging({ directory, stderr });
    const app = express();

    app.use(logging.requestLogger);
    app.use(logging.accessLogger);
    app.get('/health', (request, response) => {
      request.log.info('Health checked');
      response.status(204).end();
    });

    const response = await request(app).get('/health?accessToken=do-not-log');
    const applicationLog = readFileSync(join(directory, 'application.log'), 'utf8');
    const accessLog = readFileSync(join(directory, 'access.log'), 'utf8');
    const applicationRecord = JSON.parse(applicationLog);
    const accessRecord = JSON.parse(accessLog);

    expect(response.status).toBe(204);
    expect(applicationRecord.requestId).toEqual(accessRecord.requestId);
    expect(accessRecord).toMatchObject({ method: 'GET', path: '/health', status: 204 });
    expect(applicationLog).toContain('Health checked');
    expect(applicationLog).not.toContain('"method":"GET"');
    expect(accessLog).not.toContain('Health checked');
    expect(accessLog).not.toContain('do-not-log');

    logging.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('redacts sensitive fields from terminal and application logs', () => {
    const directory = createDirectory();
    const stderr = new MemoryStream();
    const logging = createLogging({ directory, stderr });
    const secret = 'do-not-log-this-value';

    logging.logger.error(
      {
        password: secret,
        nested: { refreshToken: secret },
        headers: { authorization: secret, cookie: secret },
      },
      'Rejected credentials',
    );

    const applicationLog = readFileSync(join(directory, 'application.log'), 'utf8');

    expect(applicationLog).not.toContain(secret);
    expect(stderr.output).not.toContain(secret);
    expect(applicationLog).toContain('[Redacted]');

    logging.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('rotates bounded application logs and removes expired rotated files', () => {
    const directory = createDirectory();
    const now = new Date('2026-09-23T00:00:00.000Z');
    const expiredPath = join(directory, 'application.20260801T000000000Z-1.log');
    const retainedPath = join(directory, 'application.20260920T000000000Z-1.log');
    writeFileSync(expiredPath, 'expired');
    writeFileSync(retainedPath, 'retained');
    utimesSync(
      expiredPath,
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-01T00:00:00.000Z'),
    );
    utimesSync(
      retainedPath,
      new Date('2026-09-20T00:00:00.000Z'),
      new Date('2026-09-20T00:00:00.000Z'),
    );
    const logging = createLogging({
      directory,
      maxFileSizeBytes: 250,
      now: () => now,
      stderr: new MemoryStream(),
    });

    logging.logger.info({ payload: 'x'.repeat(70) }, 'First record');
    logging.logger.info({ payload: 'x'.repeat(70) }, 'Second record');

    expect(() => readFileSync(expiredPath)).toThrow();
    expect(readFileSync(retainedPath, 'utf8')).toBe('retained');
    expect(readFileSync(join(directory, 'application.log')).byteLength).toBeLessThanOrEqual(250);
    expect(
      readFileSync(join(directory, 'application.20260923T000000000Z-1.log'), 'utf8'),
    ).toContain('First record');

    logging.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('falls back safely when a file transport fails at runtime', async () => {
    const directory = createDirectory();
    const stderr = new MemoryStream();
    const logging = createLogging({ directory, stderr });
    const app = express();

    unlinkSync(join(directory, 'application.log'));
    mkdirSync(join(directory, 'application.log'));
    logging.logger.info('This file write fails');
    app.use(logging.requestLogger);
    app.use(logging.accessLogger);
    app.use((_request, response) => response.status(204).end());

    const response = await request(app).get('/still-healthy');

    expect(response.status).toBe(204);
    expect(stderr.output).toContain('[logging] File logging degraded');
    expect(logging.isFileLoggingHealthy()).toBe(false);

    logging.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('fails initialization when terminal and file logging are unavailable', () => {
    const directory = createDirectory();
    const blockedPath = join(directory, 'blocked');
    writeFileSync(blockedPath, 'not a directory');

    expect(() => createLogging({ directory: blockedPath, stderr: null })).toThrow(
      'Logging initialization failed',
    );

    rmSync(directory, { recursive: true, force: true });
  });
});
