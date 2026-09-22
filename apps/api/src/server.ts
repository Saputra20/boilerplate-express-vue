import { app } from './app.js';
import { loadEnv } from './config/env.js';

try {
  const env = loadEnv();

  app.listen(env.PORT, () => {
    console.info(`API listening on port ${env.PORT}`);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid environment');
  process.exitCode = 1;
}
