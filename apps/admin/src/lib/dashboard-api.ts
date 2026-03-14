import { API } from "./api";

export interface DashboardStats {
  stats: {
    totalUsers: number;
    activeOrganizations: number;
    totalRegistrations: number;
    totalJobApplications: number;
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
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${API}/admin/dashboard/stats`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Dashboard stats failed: ${res.status}`);
  }

  return res.json();
}
