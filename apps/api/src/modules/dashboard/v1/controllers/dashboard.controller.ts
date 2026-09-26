import type { RequestHandler } from 'express';
import type { DashboardService } from '../../services/dashboard.service.js';
export function createDashboardController(service: DashboardService): RequestHandler {
  return async (_request, response, next) => {
    try {
      response.status(200).json(await service.summary());
    } catch (error) {
      next(error);
    }
  };
}
