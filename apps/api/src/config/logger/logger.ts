import { randomUUID } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { basename, extname, join } from 'node:path';
import { Writable } from 'node:stream';
import type { RequestHandler } from 'express';
import morgan from 'morgan';
import pino, { type Logger } from 'pino';
import { pinoHttp } from 'pino-http';

export const LOG_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const LOG_RETENTION_DAYS = 14;
const RETENTION_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

type LogFileName = 'access.log' | 'application.log';

type LoggingOptions = {
  directory?: string;
  maxFileSizeBytes?: number;
  retentionDays?: number;
  now?: () => Date;
  stderr?: NodeJS.WritableStream | null;
};

export type Logging = {
  logger: Logger;
  requestLogger: RequestHandler;
  accessLogger: RequestHandler;
  isFileLoggingHealthy(): boolean;
  close(): void;
};

class RotatingFileStream extends Writable {
  private currentSize = 0;
  private healthy = false;
  private failed = false;
  private readonly cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly directory: string,
    private readonly fileName: LogFileName,
    private readonly maxFileSizeBytes: number,
    private readonly retentionMs: number,
    private readonly now: () => Date,
    private readonly onFailure: () => void,
  ) {
    super();
    this.initialize();
    if (this.healthy) {
      this.cleanupTimer = setInterval(() => {
        try {
          this.cleanupExpiredFiles();
        } catch {
          this.fail();
        }
      }, RETENTION_CLEANUP_INTERVAL_MS);
      this.cleanupTimer.unref();
    }
  }

  isHealthy(): boolean {
    return this.healthy;
  }

  override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (!this.healthy) {
      callback();
      return;
    }

    try {
      if (chunk.length > this.maxFileSizeBytes) {
        throw new Error('Log entry exceeds file size limit');
      }

      if (this.currentSize + chunk.length > this.maxFileSizeBytes) {
        this.rotate();
      }

      appendFileSync(this.activePath, chunk);
      this.currentSize += chunk.length;
    } catch {
      this.fail();
    }

    callback();
  }

  override _final(callback: (error?: Error | null) => void): void {
    clearInterval(this.cleanupTimer);
    callback();
  }

  private get activePath(): string {
    return join(this.directory, this.fileName);
  }

  private initialize(): void {
    try {
      mkdirSync(this.directory, { recursive: true });
      appendFileSync(this.activePath, '');
      this.currentSize = statSync(this.activePath).size;
      this.cleanupExpiredFiles();
      if (this.currentSize > this.maxFileSizeBytes) this.rotate();
      this.healthy = true;
    } catch {
      this.fail();
    }
  }

  private rotate(): void {
    const rotatedPath = this.nextRotatedPath();
    renameSync(this.activePath, rotatedPath);
    appendFileSync(this.activePath, '');
    this.currentSize = 0;
    this.cleanupExpiredFiles();
  }

  private nextRotatedPath(): string {
    const extension = extname(this.fileName);
    const stem = basename(this.fileName, extension);
    const timestamp = this.now().toISOString().replace(/[-:.]/g, '').replace('Z', 'Z');
    let sequence = 1;

    while (existsSync(join(this.directory, `${stem}.${timestamp}-${sequence}${extension}`))) {
      sequence += 1;
    }

    return join(this.directory, `${stem}.${timestamp}-${sequence}${extension}`);
  }

  private cleanupExpiredFiles(): void {
    const extension = extname(this.fileName);
    const stem = basename(this.fileName, extension);
    const rotatedFilePattern = new RegExp(
      `^${stem}\\.\\d{8}T\\d{9}Z-\\d+${extension.replace('.', '\\.')}$`,
    );
    const expirationTime = this.now().getTime() - this.retentionMs;

    for (const entry of readdirSync(this.directory)) {
      if (!rotatedFilePattern.test(entry)) continue;

      const path = join(this.directory, entry);
      if (statSync(path).mtimeMs < expirationTime) unlinkSync(path);
    }
  }

  private fail(): void {
    if (this.failed) return;

    this.healthy = false;
    this.failed = true;
    this.onFailure();
  }
}

function writeFallback(stderr: NodeJS.WritableStream | null): void {
  try {
    stderr?.write('[logging] File logging degraded\n');
  } catch {
    return;
  }
}

function validateOptions(maxFileSizeBytes: number, retentionDays: number): void {
  if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes < 1) {
    throw new Error('Invalid logging configuration');
  }

  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1) {
    throw new Error('Invalid logging configuration');
  }
}

export function createLogging({
  directory = join(process.cwd(), 'logs'),
  maxFileSizeBytes = LOG_MAX_FILE_SIZE_BYTES,
  retentionDays = LOG_RETENTION_DAYS,
  now = () => new Date(),
  stderr = process.stderr,
}: LoggingOptions = {}): Logging {
  validateOptions(maxFileSizeBytes, retentionDays);

  const onFileFailure = () => writeFallback(stderr);
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const applicationStream = new RotatingFileStream(
    directory,
    'application.log',
    maxFileSizeBytes,
    retentionMs,
    now,
    onFileFailure,
  );
  const accessStream = new RotatingFileStream(
    directory,
    'access.log',
    maxFileSizeBytes,
    retentionMs,
    now,
    onFileFailure,
  );
  const destinations = [
    ...(stderr ? [{ stream: stderr }] : []),
    ...(applicationStream.isHealthy() ? [{ stream: applicationStream }] : []),
  ];

  if (destinations.length === 0) throw new Error('Logging initialization failed');

  const logger = pino(
    {
      redact: {
        paths: [
          'password',
          'passwordHash',
          'password_hash',
          'accessToken',
          'refreshToken',
          'token',
          'jwt',
          'authorization',
          'headers.authorization',
          'headers.cookie',
          'cookie',
          'cookies',
          'privateKey',
          'private_key',
          'secret',
          'credentials',
          '*.password',
          '*.passwordHash',
          '*.password_hash',
          '*.accessToken',
          '*.refreshToken',
          '*.token',
          '*.jwt',
          '*.authorization',
          '*.headers.authorization',
          '*.headers.cookie',
          '*.cookie',
          '*.privateKey',
          '*.private_key',
          '*.secret',
          '*.credentials',
        ],
        censor: '[Redacted]',
      },
    },
    pino.multistream(destinations),
  );
  const requestLogger = pinoHttp({
    logger,
    autoLogging: false,
    quietReqLogger: true,
    genReqId: () => randomUUID(),
    customAttributeKeys: { reqId: 'requestId' },
    customProps: (request) => ({ requestId: request.id }),
  });
  const accessLogger = morgan(
    (tokens, request, response) =>
      JSON.stringify({
        requestId: request.id,
        method: tokens.method(request, response),
        path: request.url?.split('?')[0],
        status: Number(tokens.status(request, response)),
        durationMs: Number(tokens['response-time'](request, response, 3)),
      }),
    { stream: accessStream },
  );

  return {
    logger,
    requestLogger,
    accessLogger,
    isFileLoggingHealthy: () => applicationStream.isHealthy() && accessStream.isHealthy(),
    close(): void {
      applicationStream.end();
      accessStream.end();
    },
  };
}
