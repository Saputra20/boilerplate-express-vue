import { createAuthenticatedContextService } from '../src/modules/auth/services/context.service.js';
import type { AuthenticatedUserRepository } from '../src/modules/auth/repositories/context.repository.js';
import type { PermissionService } from '../src/modules/rbac/services/permission.service.js';

describe('authenticated context service', () => {
  it('combines current identity with effective permissions without exposing persistence fields', async () => {
    const userRepository: AuthenticatedUserRepository = {
      findActiveUser: async () => ({
        id: 'user-id',
        email: 'user@example.com',
        displayName: null,
        mustChangePassword: true,
        roles: ['editor', 'viewer'],
      }),
      updateDisplayName: async () => 'updated',
    };
    const permissionService: PermissionService = {
      authorize: async () => 'denied',
      listEffectivePermissions: async () => ['content.read', 'content.write'],
      listCatalog: async () => [],
    };
    const service = createAuthenticatedContextService(userRepository, permissionService);

    await expect(service.getContext('user-id')).resolves.toEqual({
      user: {
        id: 'user-id',
        email: 'user@example.com',
        displayName: null,
        mustChangePassword: true,
      },
      roles: ['editor', 'viewer'],
      permissions: ['content.read', 'content.write'],
    });
  });

  it('returns no context when authenticated user lookup fails', async () => {
    const userRepository: AuthenticatedUserRepository = {
      findActiveUser: async () => null,
      updateDisplayName: async () => 'invalid_authentication',
    };
    const permissionService: PermissionService = {
      authorize: async () => 'denied',
      listEffectivePermissions: async () => {
        throw new Error('must not resolve permissions');
      },
      listCatalog: async () => [],
    };
    const service = createAuthenticatedContextService(userRepository, permissionService);

    await expect(service.getContext('missing-user')).resolves.toBeNull();
  });

  it('returns the cleared database requirement as false', async () => {
    const userRepository: AuthenticatedUserRepository = {
      findActiveUser: async () => ({
        id: 'user-id',
        email: 'user@example.com',
        displayName: null,
        mustChangePassword: false,
        roles: [],
      }),
      updateDisplayName: async () => 'updated',
    };
    const permissionService: PermissionService = {
      authorize: async () => 'denied',
      listEffectivePermissions: async () => [],
      listCatalog: async () => [],
    };
    const context = await createAuthenticatedContextService(
      userRepository,
      permissionService,
    ).getContext('user-id');
    expect(context?.user.mustChangePassword).toBe(false);
  });
});
