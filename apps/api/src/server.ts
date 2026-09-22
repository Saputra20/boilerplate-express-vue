import { app } from './app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();

app.listen(env.PORT, () => {
  console.info(`API listening on port ${env.PORT}`);
});
