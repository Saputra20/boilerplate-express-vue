import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../src/app.js';
import type { AccessAuthService } from '../../src/auth/access-auth-service.js';
import type { LoginService } from '../../src/auth/login-service.js';
import type { LogoutService } from '../../src/auth/logout-service.js';
import type { RefreshService } from '../../src/auth/refresh-service.js';
import type { HealthRouteOptions } from '../../src/health/index.js';
import { createLogging, type Logging } from '../../src/logging/index.js';
import type { QueueMonitorOptions } from '../../src/queue/monitor.js';
import type { SecurityOptions } from '../../src/security/index.js';

export const TEST_CORS_ORIGIN = 'http://localhost:5173';

type TestAppOptions = {
  securityOptions?: SecurityOptions;
  loginService?: LoginService;
  refreshService?: RefreshService;
  accessAuthService?: AccessAuthService;
  logoutService?: LogoutService;
  queueMonitor?: QueueMonitorOptions;
  healthRoutes?: HealthRouteOptions;
};

export type TestApp = {
  app: ReturnType<typeof createApp>;
  directory: string;
  logging: Logging;
  cleanup(): void;
};

export function createTestApp(options: TestAppOptions = {}): TestApp {
  const directory = mkdtempSync(join(tmpdir(), 'api-test-'));
  const logging = createLogging({ directory, stderr: null });
  const app = createApp(
    logging,
    options.securityOptions ?? { corsOrigins: [TEST_CORS_ORIGIN] },
    options.loginService,
    options.refreshService,
    options.accessAuthService,
    options.logoutService,
    options.queueMonitor,
    options.healthRoutes,
  );

  return {
    app,
    directory,
    logging,
    cleanup() {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
