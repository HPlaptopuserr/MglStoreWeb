import { API, adminFetch } from "./api";

export interface DashboardStats {
  stats: {
    totalUsers: number;
    activeOrganizations: number;
    totalRegistrations: number;
    totalJobApplications: number;
    totalInvestors: number;
    totalInvestmentAmount: number;
  };
  sparklines: {
    users: number[];
    organizations: number[];
    jobApplications: number[];
  };
  pieChart: {
    total: number;
    label: string;
    items: { label: string; count: number; color: string }[];
  };
  activity: {
    id: string;
    action: string;
    userName: string;
    meta: unknown;
    createdAt: string;
  }[];
  todaySummary: {
    newRequests: number;
    approved: number;
    rejected: number;
    todayJobApplications: number;
  };
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await adminFetch(`${API}/admin/dashboard/stats`);

  if (!res.ok) {
    throw new Error(`Dashboard stats failed: ${res.status}`);
  }

  return res.json();
}
