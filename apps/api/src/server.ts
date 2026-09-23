import { app } from './app.js';
import { loadEnv } from './config/env.js';
import { createDatabase } from './database/client.js';
import { loadDatabaseConfig } from './database/config.js';
import { createRedis } from './redis/client.js';
import { loadRedisConfig } from './redis/config.js';

async function startServer(): Promise<void> {
  const env = loadEnv();
  const database = createDatabase(loadDatabaseConfig(env));
  const redis = createRedis(loadRedisConfig(env));

  try {
    await database.initialize();
    await redis.initialize();
  } catch (error) {
    await database.close().catch(() => undefined);
    redis.close();
    throw error;
  }

  app.listen(env.PORT, () => {
    console.info(`API listening on port ${env.PORT}`);
  });
}

void startServer().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Invalid environment');
  process.exitCode = 1;
});
