import { API, adminFetch } from "./api";

export interface StatisticsInsights {
  generatedAt: string;
  windowDays: number | "all";
  hero: {
    activeUsers: number;
    activeUsersTrend: number;
    loginSessions: number;
    loginSessionsTrend: number;
    totalRevenue: number;
    revenueTrend: number;
    totalOrders: number;
    ordersTrend: number;
    unitsSold: number;
    avgTicket: number;
  };
  topProducts: {
    productId: string;
    name: string;
    sku: string | null;
    stock: number;
    price: number;
    organizationName: string;
    imageUrl: string | null;
    units: number;
    revenue: number;
    transactions: number;
    velocityScore: number;
  }[];
  topBranches: {
    branchId: string;
    name: string;
    address: string;
    organizationName: string;
    orders: number;
    onlineOrders: number;
    posSales: number;
    revenue: number;
    avgTicket: number;
    sharePercent: number;
  }[];
  marketingMetrics: {
    id: string;
    label: string;
    value: number;
    previousValue: number | null;
    unit: string;
    trend: number;
    category: string;
    description: string;
  }[];
  marketingSegments: {
    paymentMethods: { method: string; count: number; amount: number }[];
    organizationTypes: { type: string; count: number }[];
    businessCategories: { category: string; count: number }[];
  };
  orderStatus: { status: string; count: number }[];
  paymentStatus: { status: string; count: number }[];
  recentSales: {
    id: string;
    receiptNo: string;
    total: number;
    createdAt: string;
    branchName: string;
    organizationName: string;
  }[];
}

export async function fetchStatisticsInsights(days: number | "all"): Promise<StatisticsInsights> {
  const res = await adminFetch(`${API}/admin/statistics/insights?days=${days}`);
  if (!res.ok) throw new Error(`Statistics insights failed: ${res.status}`);
  return res.json();
}
