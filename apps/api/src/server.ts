import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createDatabase } from './database/client.js';
import { loadDatabaseConfig } from './database/config.js';
import { createLogging } from './logging/index.js';
import { createRedis } from './redis/client.js';
import { loadRedisConfig } from './redis/config.js';

async function startServer(): Promise<void> {
  const env = loadEnv();
  const logging = createLogging();
  const app = createApp(logging);
  const database = createDatabase(loadDatabaseConfig(env));
  const redis = createRedis(loadRedisConfig(env));

  try {
    await database.initialize();
    await redis.initialize();
  } catch {
    await database.close().catch(() => undefined);
    redis.close();
    logging.logger.error('API startup failed');
    logging.close();
    throw new Error('API startup failed');
  }

  app.listen(env.PORT, () => {
    logging.logger.info({ port: env.PORT }, 'API listening');
  });
}

void startServer().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'API startup failed'}\n`);
  process.exitCode = 1;
});
