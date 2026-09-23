import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import request from 'supertest';
import { createAccessAuthMiddleware } from '../src/auth/access-auth-middleware.js';
import type { AccessAuthRepository } from '../src/auth/access-auth-service.js';
import { createAccessAuthService } from '../src/auth/access-auth-service.js';
import { createPermissionMiddleware } from '../src/auth/permission-middleware.js';
import {
  createPermissionService,
  type PermissionRepository,
} from '../src/auth/permission-service.js';
import { createErrorHandler } from '../src/security/index.js';
import { createJwt, type JwtService } from '../src/jwt/index.js';
import { createLogging } from '../src/logging/index.js';

class MemoryAccessAuthRepository implements AccessAuthRepository {
  async findPrincipal({ sub, sid, jti }: Parameters<AccessAuthRepository['findPrincipal']>[0]) {
    return { sub, sid, jti, revoked: false };
  }
}

class MemoryPermissionRepository implements PermissionRepository {
  private readonly permissions = new Set(['system.access', 'system.observe']);
  private readonly rolePermissions = new Map<string, Set<string>>();
  private readonly userRoles = new Map<string, Set<string>>();

  assignRole(userId: string, role: string): void {
    const roles = this.userRoles.get(userId) ?? new Set<string>();
    roles.add(role);
    this.userRoles.set(userId, roles);
  }

  grantRolePermission(role: string, permission: string): void {
    const permissions = this.rolePermissions.get(role) ?? new Set<string>();
    permissions.add(permission);
    this.rolePermissions.set(role, permissions);
  }

  async resolvePermission({
    userId,
    permission,
  }: Parameters<PermissionRepository['resolvePermission']>[0]) {
    if (!this.permissions.has(permission)) return 'unknown';
    return Array.from(this.userRoles.get(userId) ?? []).some((role) =>
      this.rolePermissions.get(role)?.has(permission),
    )
      ? 'granted'
      : 'denied';
  }
}

function createJwtService(directory: string): JwtService {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKeyPath = join(directory, 'private.pem');
  const publicKeyPath = join(directory, 'public.pem');
  writeFileSync(privateKeyPath, privateKey.export({ format: 'pem', type: 'pkcs1' }));
  writeFileSync(publicKeyPath, publicKey.export({ format: 'pem', type: 'pkcs1' }));
  return createJwt({
    privateKeyPath,
    publicKeyPath,
    issuer: 'test-issuer',
    audience: 'test-audience',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
  });
}

describe('RBAC permission middleware', () => {
  it('grants only persisted relation equivalents and unions multiple role grants', async () => {
    const repository = new MemoryPermissionRepository();
    const service = createPermissionService(repository);
    const admin = randomUUID();
    const multiRoleUser = randomUUID();

    repository.assignRole(admin, 'admin');
    repository.grantRolePermission('admin', 'system.access');
    repository.assignRole(multiRoleUser, 'admin');
    repository.assignRole(multiRoleUser, 'viewer');
    repository.grantRolePermission('viewer', 'system.observe');

    await expect(service.authorize({ userId: admin, permission: 'system.access' })).resolves.toBe(
      'granted',
    );
    await expect(service.authorize({ userId: admin, permission: 'system.observe' })).resolves.toBe(
      'denied',
    );
    await expect(
      service.authorize({ userId: multiRoleUser, permission: 'system.access' }),
    ).resolves.toBe('granted');
    await expect(
      service.authorize({ userId: multiRoleUser, permission: 'system.observe' }),
    ).resolves.toBe('granted');
    await expect(service.authorize({ userId: admin, permission: 'system.missing' })).resolves.toBe(
      'unknown',
    );
  });

  it('distinguishes authentication, forbidden, granted, and unknown permission paths', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-rbac-test-'));
    const logging = createLogging({ directory, stderr: null });
    const jwt = createJwtService(directory);
    const permissions = new MemoryPermissionRepository();
    const service = createPermissionService(permissions);
    const allowedUser = randomUUID();
    const deniedUser = randomUUID();
    const allowedSession = randomUUID();
    const deniedSession = randomUUID();
    permissions.assignRole(allowedUser, 'admin');
    permissions.grantRolePermission('admin', 'system.access');
    const app = express();
    app.get(
      '/test-permission',
      createAccessAuthMiddleware(createAccessAuthService(new MemoryAccessAuthRepository(), jwt)),
      createPermissionMiddleware(service, 'system.access', logging.logger),
      (_request, response) => response.status(204).send(),
    );
    app.get(
      '/unknown-permission',
      createAccessAuthMiddleware(createAccessAuthService(new MemoryAccessAuthRepository(), jwt)),
      createPermissionMiddleware(service, 'system.missing', logging.logger),
      (_request, response) => response.status(204).send(),
    );
    app.use(createErrorHandler(logging.logger));

    try {
      const missing = await request(app).get('/test-permission');
      const denied = await request(app)
        .get('/test-permission')
        .set(
          'Authorization',
          `Bearer ${jwt.issueToken({ sub: deniedUser, sid: deniedSession, typ: 'access' })}`,
        )
        .send({ role: 'admin', permission: 'system.access' });
      const allowed = await request(app)
        .get('/test-permission')
        .set(
          'Authorization',
          `Bearer ${jwt.issueToken({ sub: allowedUser, sid: allowedSession, typ: 'access' })}`,
        );
      const unknown = await request(app)
        .get('/unknown-permission')
        .set(
          'Authorization',
          `Bearer ${jwt.issueToken({ sub: allowedUser, sid: allowedSession, typ: 'access' })}`,
        );

      expect(missing.status).toBe(401);
      expect(denied.status).toBe(403);
      expect(denied.body).toEqual({ message: 'Forbidden' });
      expect(allowed.status).toBe(204);
      expect(unknown.status).toBe(500);
      expect(unknown.body).toEqual({ message: 'Internal server error' });
    } finally {
      logging.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
