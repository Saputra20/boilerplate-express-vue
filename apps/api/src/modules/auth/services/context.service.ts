import type { PermissionService } from '../../rbac/services/permission.service.js';
import type { AuthenticatedUserRepository } from '../repositories/context.repository.js';

export type AuthenticatedContext = {
  user: {
    id: string;
    email: string;
  };
  roles: readonly string[];
  permissions: readonly string[];
};

export type AuthenticatedContextService = {
  getContext(userId: string): Promise<AuthenticatedContext | null>;
};

export function createAuthenticatedContextService(
  userRepository: AuthenticatedUserRepository,
  permissionService: PermissionService,
): AuthenticatedContextService {
  return {
    async getContext(userId) {
      const identity = await userRepository.findActiveUser({ userId });
      if (identity === null) return null;

      return {
        user: { id: identity.id, email: identity.email },
        roles: identity.roles,
        permissions: await permissionService.listEffectivePermissions({ userId }),
      };
    },
  };
}
