import type { Express } from 'express';
import type { Logger } from 'pino';

export const READINESS_TIMEOUT_MS = 2_000;

export type ReadinessProbe = () => Promise<void>;

export type HealthRouteOptions = {
  databaseProbe: ReadinessProbe;
  redisProbe: ReadinessProbe;
};

type ProbeName = 'database' | 'redis';
type ProbeFailure = 'operational' | 'timeout';
type ProbeResult =
  { name: ProbeName; ok: true } | { name: ProbeName; ok: false; failure: ProbeFailure };

export function installHealthRoutes(
  app: Express,
  { databaseProbe, redisProbe }: HealthRouteOptions,
  logger: Logger,
): void {
  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.get('/ready', async (request, response) => {
    const results = await checkReadiness({ databaseProbe, redisProbe });
    const failures = results.filter(
      (result): result is Extract<ProbeResult, { ok: false }> => !result.ok,
    );

    if (failures.length > 0) {
      logger.warn(
        {
          requestId: request.id,
          dependencies: failures.map(({ name }) => name),
          failureTypes: failures.map(({ failure }) => failure),
        },
        'Readiness probe failed',
      );
      response.status(503).json({ status: 'not_ready' });
      return;
    }

    response.status(200).json({ status: 'ready' });
  });
}

export function checkReadiness({
  databaseProbe,
  redisProbe,
}: HealthRouteOptions): Promise<ProbeResult[]> {
  return Promise.all([runProbe('database', databaseProbe), runProbe('redis', redisProbe)]);
}

async function runProbe(name: ProbeName, probe: ReadinessProbe): Promise<ProbeResult> {
  let timeout: NodeJS.Timeout | undefined;
  const probeResult: Promise<ProbeResult> = Promise.resolve()
    .then(probe)
    .then(() => ({ name, ok: true }) as const)
    .catch(() => ({ name, ok: false, failure: 'operational' }) as const);
  const result = await Promise.race([
    probeResult,
    new Promise<ProbeResult>((resolve) => {
      timeout = setTimeout(
        () => resolve({ name, ok: false, failure: 'timeout' }),
        READINESS_TIMEOUT_MS,
      );
    }),
  ]);

  if (timeout) clearTimeout(timeout);
  return result;
}
