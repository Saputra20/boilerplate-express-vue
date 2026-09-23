import { createApp } from './app.js';
import { createLoginRepository } from './modules/auth/repositories/login.repository.js';
import { createLoginService } from './modules/auth/services/login.service.js';
import { createAccessAuthRepository } from './modules/auth/repositories/access-auth.repository.js';
import { createAccessAuthService } from './modules/auth/services/access-auth.service.js';
import { createLogoutRepository } from './modules/auth/repositories/logout.repository.js';
import { createLogoutService } from './modules/auth/services/logout.service.js';
import { createRefreshRepository } from './modules/auth/repositories/refresh-token.repository.js';
import { createRefreshService } from './modules/auth/services/refresh-token.service.js';
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

async function startServer(): Promise<void> {
  const env = loadEnv();
  const logging = createLogging();
  const database = createDatabase(loadDatabaseConfig(env));
  const redisConfig = loadRedisConfig(env);
  const redis = createRedis(redisConfig);
  let queues: ReturnType<typeof createQueueInfrastructure> | undefined;
  let jwt: JwtService;
  let app: ReturnType<typeof createApp>;

  try {
    jwt = createJwt({
      privateKeyPath: env.JWT_PRIVATE_KEY_PATH,
      publicKeyPath: env.JWT_PUBLIC_KEY_PATH,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      accessTokenExpiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN,
      refreshTokenExpiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    });
    await database.initialize();
    await redis.initialize();
    queues = createQueueInfrastructure(redisConfig, logging.logger);
    await queues.initialize();
    app = createApp(
      logging,
      { corsOrigins: env.CORS_ORIGINS },
      createLoginService(createLoginRepository(database.db), jwt),
      createRefreshService(createRefreshRepository(database.db), jwt),
      createAccessAuthService(createAccessAuthRepository(database.db), jwt),
      createLogoutService(createLogoutRepository(database.db)),
      {
        queue: queues.queue,
        credentials: {
          username: env.QUEUE_MONITOR_USERNAME,
          password: env.QUEUE_MONITOR_PASSWORD,
        },
      },
      {
        async databaseProbe() {
          await database.db.execute(sql`SELECT 1`);
        },
        async redisProbe() {
          if ((await redis.client.ping()) !== 'PONG')
            throw new Error('Redis readiness probe failed');
        },
      },
    );
  } catch {
    await queues?.close().catch(() => undefined);
    await database.close().catch(() => undefined);
    redis.close();
    logging.logger.error('API startup failed');
    logging.close();
    throw new Error('API startup failed');
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

void startServer().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'API startup failed'}\n`);
  process.exitCode = 1;
});
