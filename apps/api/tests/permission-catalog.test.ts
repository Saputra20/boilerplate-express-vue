import express from 'express';
import request from 'supertest';
import { createPermissionCatalogRouter } from '../src/modules/rbac/permission-catalog.router.js';

describe('permission catalog route', () => {
  it('serves the documented authenticated permission path', async () => {
    const catalog = [{ id: 'permission-id', code: 'role.read', description: 'Read roles' }];
    const router = createPermissionCatalogRouter({
      accessAuthService: {
        authenticate: async () => ({
          sub: 'user-id',
          sid: 'session-id',
          jti: 'token-id',
          exp: 1,
          revoked: false,
        }),
      },
      permissionService: {
        authorize: async () => 'granted',
        listEffectivePermissions: async () => [],
        listCatalog: async () => catalog,
      },
    });
    const app = express().use('/api/v1/misc', router);

    const response = await request(app)
      .get('/api/v1/misc/permissions')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(catalog);
  });
});
