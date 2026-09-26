import express from 'express';
import request from 'supertest';
import { createDashboardService } from '../src/modules/dashboard/services/dashboard.service.js';
import { createDashboardRouter } from '../src/modules/dashboard/v1/dashboard.router.js';

describe('dashboard summary', () => {
  it('returns database-backed summary without deriving or fabricating values', async () => {
    const summary = {
      users: { total: 3, active: 2, disabled: 1 },
      roles: { total: 2 },
      categories: { total: 4, active: 3 },
    };
    const service = createDashboardService({ summary: async () => summary });
    await expect(service.summary()).resolves.toEqual(summary);
  });

  it('propagates repository failures for centralized safe handling', async () => {
    const service = createDashboardService({
      summary: async () => {
        throw new Error('database failure');
      },
    });
    await expect(service.summary()).rejects.toThrow('database failure');
  });

  it('serves the documented authenticated summary path', async () => {
    const summary = {
      users: { total: 3, active: 2, disabled: 1 },
      roles: { total: 2 },
      categories: { total: 4, active: 3 },
    };
    const router = createDashboardRouter({
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
        listEffectivePermissions: async () => ['dashboard.read'],
        listCatalog: async () => [],
      },
      dashboardService: { summary: async () => summary },
    });
    const app = express().use('/api/v1/dashboard', router);

    const response = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(summary);
  });
});
