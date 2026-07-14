import { API, adminFetch } from "./api";

export interface StatisticsInsights {
  generatedAt: string;
  windowDays: number | "all";
  dataQuality: {
    basis: "DATABASE_AGGREGATES";
    generatedAt: string;
    rules: string[];
  };
  financialOverview: {
    privacyLevel: "ANONYMIZED_AGGREGATE";
    generatedAt: string;
    windowDays: number | "all";
    confirmedAmount: number;
    confirmedTransactions: number;
    amountTrend: number | null;
    transactionTrend: number | null;
    sources: {
      onlineOrders: { amount: number; transactions: number };
      posSales: { amount: number; transactions: number };
      paidInvoices: { amount: number; transactions: number };
    };
    verifiedQPay: { amount: number; transactions: number };
    excluded: {
      bankAccountBalances: boolean;
      organizationBreakdown: boolean;
      customerIdentity: boolean;
      pendingAndFailedPayments: boolean;
      localFakePayments: boolean;
    };
    note: string;
  };
  hero: {
    activeUsers: number;
    activeUsersTrend: number | null;
    loginSessions: number;
    loginSessionsTrend: number | null;
    totalRevenue: number;
    revenueTrend: number | null;
    totalOrders: number;
    ordersTrend: number | null;
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
    trend: number | null;
    category: string;
    description: string;
    scope: "SELECTED_PERIOD" | "CURRENT_SNAPSHOT" | "LIFETIME";
    source: string;
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
  loyalty: {
    earnedPoints: number;
    redeemedPoints: number;
    transactions: number;
    earnTransactions: number;
    redeemTransactions: number;
    recent: {
      id: string;
      action: "EARN" | "SPEND" | "ADJUST" | string;
      customerPhone: string;
      customerName: string | null;
      receiptNo: string;
      paymentMethod: string;
      saleTotal: number;
      earnedPoints: number;
      redeemedPoints: number;
      effectiveRate: number;
      membershipBadge: string | null;
      createdAt: string;
      organizationName: string;
      branchName: string;
    }[];
  };
}

export async function fetchStatisticsInsights(
  days: number | "all",
): Promise<StatisticsInsights> {
  const res = await adminFetch(`${API}/admin/statistics/insights?days=${days}`);
  if (!res.ok) throw new Error(`Statistics insights failed: ${res.status}`);
  return res.json();
}
