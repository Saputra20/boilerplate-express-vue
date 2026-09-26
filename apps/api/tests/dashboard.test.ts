import { createDashboardService } from '../src/modules/dashboard/services/dashboard.service.js';

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
});
