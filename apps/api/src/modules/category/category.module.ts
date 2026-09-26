import type { Logger } from 'pino';
import type { Database } from '../../config/database/client.js';
import { createAuditRepository } from '../audit/repositories/audit.repository.js';
import { createAuditService } from '../audit/services/audit.service.js';
import type { AccessAuthService } from '../auth/services/access-auth.service.js';
import type { PermissionService } from '../rbac/services/permission.service.js';
import { createCategoryRepository } from './repositories/category.repository.js';
import { createCategoryRouter } from './v1/category.router.js';
import { createCategoryService } from './services/category.service.js';

export function createCategoryModule({
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
  const categoryService = createCategoryService(createCategoryRepository(db, auditService));
  return {
    v1: {
      router: createCategoryRouter({ accessAuthService, permissionService, categoryService }),
    },
  };
}
