import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../src/app.js';
import type { AccessAuthService } from '../../src/modules/auth/services/access-auth.service.js';
import type { LoginService } from '../../src/modules/auth/services/login.service.js';
import type { LogoutService } from '../../src/modules/auth/services/logout.service.js';
import type { RefreshService } from '../../src/modules/auth/services/refresh-token.service.js';
import type { HealthRouteOptions } from '../../src/modules/health/health.router.js';
import { createLogging, type Logging } from '../../src/config/logger/logger.js';
import type { QueueMonitorOptions } from '../../src/config/queue/queue-monitor.js';
import type { SecurityOptions } from '../../src/config/security/http-security.config.js';

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
