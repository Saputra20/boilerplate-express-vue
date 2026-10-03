import { createApp } from './app.js';
import { createAuthModule } from './modules/auth/auth.module.js';
import { loadEmailConfig } from './config/email/config.js';
import { loadEnv } from './config/env.js';
import { createSmtpEmailTransport, type EmailTransport } from './config/email/transport.js';
import { createDatabase } from './config/database/client.js';
import { loadDatabaseConfig } from './config/database/config.js';
import { createLogging } from './config/logger/logger.js';
import { createQueueInfrastructure, EMAIL_QUEUE_NAME } from './config/queue/queue.js';
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
import { createAuditModule } from './modules/audit/audit.module.js';
import { createAuditRetentionRepository } from './modules/audit/repositories/audit-retention.repository.js';
import { createAuditRetentionScheduler } from './modules/audit/services/audit-retention.scheduler.js';
import { createAuditRetentionService } from './modules/audit/services/audit-retention.service.js';
import { createPermissionCatalogRouter } from './modules/rbac/permission-catalog.router.js';
import { createEmailDeliveryRepository } from './modules/notification/repositories/email-delivery.repository.js';
import {
  createEmailDeliveryService,
  EMAIL_JOB_NAMES,
} from './modules/notification/email/delivery.service.js';

export async function startServer(): Promise<void> {
  const env = initializeStartupPhase('environment validation', () => loadEnv());
  const emailConfig = initializeStartupPhase('email configuration', () => loadEmailConfig(env));
  const logging = initializeStartupPhase('logging initialization', () => createLogging());
  const database = initializeStartupPhase('PostgreSQL configuration', () =>
    createDatabase(loadDatabaseConfig(env)),
  );
  const redisConfig = initializeStartupPhase('Redis configuration', () => loadRedisConfig(env));
  const redis = initializeStartupPhase('Redis client initialization', () =>
    createRedis(redisConfig),
  );
  let queues: ReturnType<typeof createQueueInfrastructure> | undefined;
  let emailQueues: ReturnType<typeof createQueueInfrastructure> | undefined;
  let emailDeliveryService: ReturnType<typeof createEmailDeliveryService> | undefined;
  let email: EmailTransport | undefined;
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
    startupPhase = 'email transport initialization';
    if (emailConfig.enabled) {
      if (!env.EMAIL_DELIVERY_ENCRYPTION_KEY) throw new Error('Email encryption key unavailable');
      const emailTransport = createSmtpEmailTransport(emailConfig);
      email = emailTransport;
      emailQueues = createQueueInfrastructure(redisConfig, logging.logger, EMAIL_QUEUE_NAME);
      await emailQueues.initialize();
      const deliveryService = createEmailDeliveryService({
        repository: createEmailDeliveryRepository(database.db),
        queue: emailQueues.queue,
        transport: emailTransport,
        encryptionKey: Buffer.from(env.EMAIL_DELIVERY_ENCRYPTION_KEY, 'hex'),
        allowLoopbackHttp: env.NODE_ENV !== 'production',
      });
      emailDeliveryService = deliveryService;
      await emailQueues.createWorker(
        Object.fromEntries(
          EMAIL_JOB_NAMES.map((name) => [name, (job) => deliveryService.process(job)]),
        ),
      );
    }
    const authModule = createAuthModule({
      db: database.db,
      jwt,
      logger: logging.logger,
      emailDeliveryService,
      publicAppUrl: env.PUBLIC_APP_URL,
    });
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
    const auditModule = createAuditModule({
      db: database.db,
      accessAuthService: authModule.accessAuthService,
      permissionService: authModule.permissionService,
      logger: logging.logger,
    });
    const auditRetentionService = createAuditRetentionService(
      createAuditRetentionRepository(database.db),
      logging.logger,
    );
    await createAuditRetentionScheduler({
      queues,
      service: auditRetentionService,
    }).start();
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
        auditV1: auditModule.v1.router,
        miscV1: createPermissionCatalogRouter({
          accessAuthService: authModule.accessAuthService,
          permissionService: authModule.permissionService,
        }),
      },
      queueMonitor: {
        queues: [queues.queue, ...(emailQueues ? [emailQueues.queue] : [])],
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
    await emailQueues?.close().catch(() => undefined);
    await email?.close().catch(() => undefined);
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
    void shutdown(server, {
      database,
      redis,
      queues: {
        close: async () => {
          await emailQueues?.close();
          await queues?.close();
        },
      },
      email,
      logging,
    })
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
