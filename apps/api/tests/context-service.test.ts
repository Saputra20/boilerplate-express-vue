import { createAuthenticatedContextService } from '../src/modules/auth/services/context.service.js';
import type { AuthenticatedUserRepository } from '../src/modules/auth/repositories/context.repository.js';
import type { PermissionService } from '../src/modules/rbac/services/permission.service.js';

describe('authenticated context service', () => {
  it('combines current identity with effective permissions without exposing persistence fields', async () => {
    const userRepository: AuthenticatedUserRepository = {
      findActiveUser: async () => ({
        id: 'user-id',
        email: 'user@example.com',
        roles: ['editor', 'viewer'],
      }),
    };
    const permissionService: PermissionService = {
      authorize: async () => 'denied',
      listEffectivePermissions: async () => ['content.read', 'content.write'],
    };
    const service = createAuthenticatedContextService(userRepository, permissionService);

    await expect(service.getContext('user-id')).resolves.toEqual({
      user: { id: 'user-id', email: 'user@example.com' },
      roles: ['editor', 'viewer'],
      permissions: ['content.read', 'content.write'],
    });
  });

  it('returns no context when authenticated user lookup fails', async () => {
    const userRepository: AuthenticatedUserRepository = {
      findActiveUser: async () => null,
    };
    const permissionService: PermissionService = {
      authorize: async () => 'denied',
      listEffectivePermissions: async () => {
        throw new Error('must not resolve permissions');
      },
    };
    const service = createAuthenticatedContextService(userRepository, permissionService);

    await expect(service.getContext('missing-user')).resolves.toBeNull();
  });
});
