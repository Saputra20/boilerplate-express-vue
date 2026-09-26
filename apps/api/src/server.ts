import { createApp } from './app.js';
import { createAuthModule } from './modules/auth/auth.module.js';
import { loadEnv } from './config/env.js';
import { createDatabase } from './config/database/client.js';
import { loadDatabaseConfig } from './config/database/config.js';
import { createLogging } from './config/logger/logger.js';
import { createQueueInfrastructure } from './config/queue/queue.js';
import { createRedis } from './config/redis/client.js';
import { loadRedisConfig } from './config/redis/config.js';
import { shutdown } from './shutdown.js';
import { createJwt, type JwtService } from './config/jwt/jwt.js';
import { sql } from 'drizzle-orm';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createCategoryModule } from './modules/category/category.module.js';
import { createRoleModule } from './modules/role/role.module.js';
import { createUserModule } from './modules/user/user.module.js';
import { createDashboardModule } from './modules/dashboard/dashboard.module.js';

export async function startServer(): Promise<void> {
  const env = initializeStartupPhase('environment validation', () => loadEnv());
  const logging = initializeStartupPhase('logging initialization', () => createLogging());
  const database = initializeStartupPhase('PostgreSQL configuration', () =>
    createDatabase(loadDatabaseConfig(env)),
  );
  const redisConfig = initializeStartupPhase('Redis configuration', () => loadRedisConfig(env));
  const redis = initializeStartupPhase('Redis client initialization', () =>
    createRedis(redisConfig),
  );
  let queues: ReturnType<typeof createQueueInfrastructure> | undefined;
  let jwt: JwtService;
  let app: ReturnType<typeof createApp>;
  let startupPhase = 'JWT initialization';

  try {
    jwt = createJwt({
      privateKeyPath: env.JWT_PRIVATE_KEY_PATH,
      publicKeyPath: env.JWT_PUBLIC_KEY_PATH,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      accessTokenExpiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN,
      refreshTokenExpiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    });
    startupPhase = 'PostgreSQL initialization';
    await database.initialize();
    startupPhase = 'Redis initialization';
    await redis.initialize();
    startupPhase = 'BullMQ initialization';
    queues = createQueueInfrastructure(redisConfig, logging.logger);
    await queues.initialize();
    const authModule = createAuthModule({ db: database.db, jwt });
    const categoryModule = createCategoryModule({
      db: database.db,
      accessAuthService: authModule.accessAuthService,
      permissionService: authModule.permissionService,
      logger: logging.logger,
    });
    const roleModule = createRoleModule({
      db: database.db,
      accessAuthService: authModule.accessAuthService,
      permissionService: authModule.permissionService,
      logger: logging.logger,
    });
    const userModule = createUserModule({
      db: database.db,
      accessAuthService: authModule.accessAuthService,
      permissionService: authModule.permissionService,
      logger: logging.logger,
      defaultUserPassword: env.DEFAULT_USER_PASSWORD,
    });
    const dashboardModule = createDashboardModule({
      db: database.db,
      accessAuthService: authModule.accessAuthService,
      permissionService: authModule.permissionService,
    });
    app = createApp({
      logging,
      security: { corsOrigins: env.CORS_ORIGINS },
      routers: {
        authV1: authModule.v1.router,
        meV1: authModule.v1.meRouter,
        categoryV1: categoryModule.v1.router,
        roleV1: roleModule.v1.router,
        userV1: userModule.v1.router,
        dashboardV1: dashboardModule.v1.router,
      },
      queueMonitor: {
        queue: queues.queue,
        credentials: {
          username: env.QUEUE_MONITOR_USERNAME,
          password: env.QUEUE_MONITOR_PASSWORD,
        },
      },
      health: {
        async databaseProbe() {
          await database.db.execute(sql`SELECT 1`);
        },
        async redisProbe() {
          if ((await redis.client.ping()) !== 'PONG')
            throw new Error('Redis readiness probe failed');
        },
      },
    });
  } catch {
    await queues?.close().catch(() => undefined);
    await database.close().catch(() => undefined);
    redis.close();
    logging.logger.error({ startupPhase }, 'API startup failed');
    logging.close();
    throw new Error(`API startup failed during ${startupPhase}`);
  }
  if (!queues) throw new Error('API startup failed');

  const server = app.listen(env.PORT, () => {
    logging.logger.info({ port: env.PORT }, 'API listening');
  });
  let shuttingDown = false;

  const handleShutdown = (signal: 'SIGINT' | 'SIGTERM') => {
    if (shuttingDown) return;

    shuttingDown = true;
    logging.logger.info({ signal }, 'API shutdown started');
    void shutdown(server, { database, redis, queues, logging })
      .then(() => {
        process.exitCode = 0;
      })
      .catch(() => {
        process.stderr.write('API shutdown failed\n');
        process.exitCode = 1;
      });
  };

  process.once('SIGINT', () => handleShutdown('SIGINT'));
  process.once('SIGTERM', () => handleShutdown('SIGTERM'));
}

export async function runServer(
  start: () => Promise<void> = startServer,
  writeError: (message: string) => void = (message) => process.stderr.write(message),
): Promise<void> {
  try {
    await start();
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith('API startup failed during ')
        ? error.message
        : 'API startup failed';
    writeError(`${message}\n`);
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  void runServer();
}

function initializeStartupPhase<T>(phase: string, initialize: () => T): T {
  try {
    return initialize();
  } catch (error) {
    const detail =
      error instanceof Error &&
      /^(Invalid environment|Invalid database configuration|Invalid Redis configuration):/.test(
        error.message,
      )
        ? `: ${error.message}`
        : '';
    throw new Error(`API startup failed during ${phase}${detail}`);
  }
}
