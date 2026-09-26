import type { Logger } from 'pino';
import type { Database } from '../../config/database/client.js';
import { createAuditRepository } from '../audit/repositories/audit.repository.js';
import { createAuditService } from '../audit/services/audit.service.js';
import type { AccessAuthService } from '../auth/services/access-auth.service.js';
import type { PermissionService } from '../rbac/services/permission.service.js';
import { createUserRepository } from './repositories/user.repository.js';
import { createUserService } from './services/user.service.js';
import { createUserRouter } from './v1/user.router.js';
export function createUserModule({
  db,
  accessAuthService,
  permissionService,
  logger,
  defaultUserPassword,
}: {
  db: Database;
  accessAuthService: AccessAuthService;
  permissionService: PermissionService;
  logger: Logger;
  defaultUserPassword: string;
}) {
  const audit = createAuditService(createAuditRepository(db), logger);
  const service = createUserService(createUserRepository(db, audit), defaultUserPassword);
  return {
    v1: {
      router: createUserRouter({ accessAuthService, permissionService, userService: service }),
    },
  };
}
