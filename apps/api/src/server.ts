import { createApp } from './app.js';
import { createLoginRepository } from './auth/login-repository.js';
import { createLoginService } from './auth/login-service.js';
import { loadEnv } from './config/env.js';
import { createDatabase } from './database/client.js';
import { loadDatabaseConfig } from './database/config.js';
import { createLogging } from './logging/index.js';
import { createRedis } from './redis/client.js';
import { loadRedisConfig } from './redis/config.js';
import { shutdown } from './shutdown.js';
import { createJwt, type JwtService } from './jwt/index.js';

async function startServer(): Promise<void> {
  const env = loadEnv();
  const logging = createLogging();
  const database = createDatabase(loadDatabaseConfig(env));
  const redis = createRedis(loadRedisConfig(env));
  let jwt: JwtService;

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
  } catch {
    await database.close().catch(() => undefined);
    redis.close();
    logging.logger.error('API startup failed');
    logging.close();
    throw new Error('API startup failed');
  }

  const app = createApp(
    logging,
    { corsOrigins: env.CORS_ORIGINS },
    createLoginService(createLoginRepository(database.db), jwt),
  );

  const server = app.listen(env.PORT, () => {
    logging.logger.info({ port: env.PORT }, 'API listening');
  });
  let shuttingDown = false;

  const handleShutdown = (signal: 'SIGINT' | 'SIGTERM') => {
    if (shuttingDown) return;

    shuttingDown = true;
    logging.logger.info({ signal }, 'API shutdown started');
    void shutdown(server, { database, redis, logging })
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
