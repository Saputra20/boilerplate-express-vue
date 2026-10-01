import type { PermissionService } from '../../rbac/services/permission.service.js';
import type { AuthenticatedUserRepository } from '../repositories/context.repository.js';

export type UpdateProfileResult =
  'updated' | 'unchanged' | 'invalid_authentication' | 'password_change_required';

export type AuthenticatedContext = {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    mustChangePassword: boolean;
  };
  roles: readonly string[];
  permissions: readonly string[];
};

export type AuthenticatedContextService = {
  getContext(userId: string): Promise<AuthenticatedContext | null>;
  updateDisplayName(
    input: Parameters<AuthenticatedUserRepository['updateDisplayName']>[0],
  ): Promise<UpdateProfileResult>;
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
        user: {
          id: identity.id,
          email: identity.email,
          displayName: identity.displayName,
          mustChangePassword: identity.mustChangePassword,
        },
        roles: identity.roles,
        permissions: await permissionService.listEffectivePermissions({ userId }),
      };
    },
    updateDisplayName: (input) => userRepository.updateDisplayName(input),
  };
}
