import type { Logger } from 'pino';
import type { Database } from '../../config/database/client.js';
import { createAuditRepository } from '../audit/repositories/audit.repository.js';
import { createAuditService } from '../audit/services/audit.service.js';
import type { AccessAuthService } from '../auth/services/access-auth.service.js';
import type { PermissionService } from '../rbac/services/permission.service.js';
import { createRoleRepository } from './repositories/role.repository.js';
import { createRoleService } from './services/role.service.js';
import { createRoleRouter } from './v1/role.router.js';

export function createRoleModule({
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
  const roleService = createRoleService(createRoleRepository(db, auditService));
  return {
    v1: { router: createRoleRouter({ accessAuthService, permissionService, roleService }) },
  };
}
