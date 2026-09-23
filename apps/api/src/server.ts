import { app } from './app.js';
import { loadEnv } from './config/env.js';
import { createDatabase } from './database/client.js';
import { loadDatabaseConfig } from './database/config.js';

async function startServer(): Promise<void> {
  const env = loadEnv();
  const database = createDatabase(loadDatabaseConfig(env));
  await database.initialize();

  app.listen(env.PORT, () => {
    console.info(`API listening on port ${env.PORT}`);
  });
}

void startServer().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Invalid environment');
  process.exitCode = 1;
});
