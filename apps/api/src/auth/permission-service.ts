import { z } from 'zod';

export const permissionCodeSchema = z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/);

export type PermissionResolution = 'granted' | 'denied' | 'unknown';

export type PermissionRepository = {
  resolvePermission(input: { userId: string; permission: string }): Promise<PermissionResolution>;
};

export type PermissionService = {
  authorize(input: { userId: string; permission: string }): Promise<PermissionResolution>;
};

export class AuthorizationConfigurationError extends Error {
  constructor() {
    super('Authorization configuration failed');
    this.name = 'AuthorizationConfigurationError';
  }
}

export function createPermissionService(repository: PermissionRepository): PermissionService {
  return {
    async authorize({ userId, permission }) {
      if (!permissionCodeSchema.safeParse(permission).success) {
        throw new AuthorizationConfigurationError();
      }

      return repository.resolvePermission({ userId, permission });
    },
  };
}
