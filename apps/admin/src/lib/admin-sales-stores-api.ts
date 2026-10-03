import { API, getApiErrorMessage } from "./api";
import type { AuthenticatedFetch } from "./statistics-api";

export interface AdminSalesStore {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contactName: string | null;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  visitCount: number;
  organization: { name: string };
  representatives: { id: string; name: string; isActive: boolean }[];
  vendorOrganization: {
    id: string;
    name: string;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    businessCategory: string | null;
    status: string;
    isVerified: boolean;
  } | null;
}
export interface AdminSalesStoresPage {
  items: AdminSalesStore[];
  total: number;
  page: number;
  pageSize: number;
}
export async function fetchAdminSalesStores(
  authFetch: AuthenticatedFetch,
  filters: { days: number | "all"; q: string; status: string; page: number },
  signal: AbortSignal,
): Promise<AdminSalesStoresPage> {
  const query = new URLSearchParams(
    Object.entries(filters).map(([key, value]) => [key, String(value)]),
  );
  const response = await authFetch(`${API}/admin/statistics/stores?${query}`, {
    signal,
  });
  if (!response.ok)
    throw new Error(
      await getApiErrorMessage(response, "Дэлгүүрийн мэдээлэл ачаалагдсангүй"),
    );
  return response.json();
}

export interface SalesStoreProfile {
  id: string;
  name: string;
  slug: string;
  taxId: string;
  type: string;
  status: string;
  isVerified: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  shortDescription: string | null;
  businessCategory: string | null;
  openingHours: string[];
  operatingYears: number;
  deliveryPrice: string | null;
  deliveryText: string | null;
  customerCount: string | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
  maxMembers: number;
  planType: string | null;
  planActivatedAt: string | null;
  planExpiresAt: string | null;
  trialUsed: boolean;
  qpayEnabled: boolean;
  qpayConnectedAt: string | null;
  webQpayEnabled: boolean;
  webQpayConnectedAt: string | null;
  minuAgentEnabled: boolean;
  minuAgentConnectedAt: string | null;
  subdomainEnabled: boolean;
  businessOrdersEnabled: boolean;
  businessInventoryEnabled: boolean;
  businessAttendanceEnabled: boolean;
  businessAttendanceManualEnabled: boolean;
  salesRepVendorRestrictionEnabled: boolean;
  businessTasksEnabled: boolean;
  businessDeliveryEnabled: boolean;
  ceoServiceEnabled: boolean;
  ceoAdviceNotificationsEnabled: boolean;
  ceoCalendarRemindersEnabled: boolean;
  ceoWeeklyDigestEnabled: boolean;
  ceoRiskAlertsEnabled: boolean;
  ceoKpiInsightsEnabled: boolean;
  ceoDecisionBriefEnabled: boolean;
}
export interface SalesStoreBranch {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  updatedAt: string;
}
export interface SalesStoreDetailsResponse {
  radiusMeters: number;
  profile: SalesStoreProfile;
  activeMemberCount: number;
  visitCount: number;
  inspectionCount: number;
  branches: {
    items: SalesStoreBranch[];
    total: number;
    page: number;
    pageSize: number;
  };
}
export interface SalesStoreSummary {
  total: number;
  active: number;
  registered: number;
}
