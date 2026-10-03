import type { Logger } from 'pino';
import type { Database } from '../../config/database/client.js';
import type { AccessAuthService } from '../auth/services/access-auth.service.js';
import type { PermissionService } from '../rbac/services/permission.service.js';
import { createAuditReadRepository } from './repositories/audit-read.repository.js';
import { createAuditRepository } from './repositories/audit.repository.js';
import { createAuditReadService } from './services/audit-read.service.js';
import { createAuditService } from './services/audit.service.js';
import { createAuditRouter } from './v1/audit.router.js';

export function createAuditModule({
  db,
  accessAuthService,
  permissionService,
  logger,
}: {
  db: Database;
  accessAuthService: AccessAuthService;
  permissionService: PermissionService;
  logger: Logger;
}) {
  const auditService = createAuditService(createAuditRepository(db), logger);
  const auditReadService = createAuditReadService(
    createAuditReadRepository(db),
    auditService,
    logger,
  );

  return {
    v1: {
      router: createAuditRouter({
        accessAuthService,
        permissionService,
        auditService: auditReadService,
      }),
    },
  };
}
