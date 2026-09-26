export type DashboardSummary = {
  users: { total: number; active: number; disabled: number };
  roles: { total: number };
  categories: { total: number; active: number };
};
export type DashboardRepository = { summary(): Promise<DashboardSummary> };
export type DashboardService = { summary(): Promise<DashboardSummary> };
export function createDashboardService(repository: DashboardRepository): DashboardService {
  return { summary: () => repository.summary() };
}
