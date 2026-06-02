import api from "./api";

export interface DashboardStats {
  total_patients: number;
  total_examinations_today: number;
  pending_reports: number;
  completed_today: number;
  appointments_today: number;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>("/api/v1/dashboard/stats");
    return data;
  },
};
