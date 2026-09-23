import { timingSafeEqual } from 'node:crypto';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Express, RequestHandler } from 'express';
import type { Logger } from 'pino';
import type { Queue } from 'bullmq';

export const QUEUE_MONITOR_PATH = '/ops/queues';
export const QUEUE_MONITOR_REALM = 'Queue Monitor';

export type QueueMonitorCredentials = {
  username: string;
  password: string;
};

export type QueueMonitorOptions = {
  queue: Queue;
  credentials: QueueMonitorCredentials;
};

export function installQueueMonitor(
  app: Express,
  { queue, credentials }: QueueMonitorOptions,
  logger: Pick<Logger, 'warn'>,
): BullMQAdapter {
  const queueAdapter = new BullMQAdapter(queue, {
    readOnlyMode: true,
    allowRetries: false,
  });
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(QUEUE_MONITOR_PATH);
  createBullBoard({ queues: [queueAdapter], serverAdapter });

  app.use(
    QUEUE_MONITOR_PATH,
    createBasicAuthMiddleware(credentials, logger),
    serverAdapter.getRouter(),
  );

  return queueAdapter;
}

function createBasicAuthMiddleware(
  credentials: QueueMonitorCredentials,
  logger: Pick<Logger, 'warn'>,
): RequestHandler {
  return (request, response, next) => {
    const suppliedCredentials = parseBasicCredentials(request.get('authorization'));
    if (suppliedCredentials && credentialsMatch(suppliedCredentials, credentials)) {
      next();
      return;
    }

    logger.warn(
      {
        requestId: request.id,
        path: request.path,
        statusCode: 401,
      },
      'Queue monitor authentication failed',
    );
    response.setHeader('WWW-Authenticate', `Basic realm="${QUEUE_MONITOR_REALM}"`);
    response.status(401).end();
  };
}

function parseBasicCredentials(header: string | undefined): QueueMonitorCredentials | null {
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header ?? '');
  if (!match || match[1].length % 4 !== 0) return null;

  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  if (Buffer.from(decoded).toString('base64') !== match[1]) return null;

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) return null;

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function credentialsMatch(
  supplied: QueueMonitorCredentials,
  expected: QueueMonitorCredentials,
): boolean {
  const usernameMatches = valuesMatch(supplied.username, expected.username);
  const passwordMatches = valuesMatch(supplied.password, expected.password);

  return usernameMatches && passwordMatches;
}

function valuesMatch(supplied: string, expected: string): boolean {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);

  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}
