import { Prisma, prisma } from "@mgl/database";
import { salesStoresQuery } from "./admin-sales-stores.service";

// Explicit allowlist: organization records also contain payment credentials.
export const storeProfileSelect = {
  id: true,
  name: true,
  slug: true,
  taxId: true,
  type: true,
  status: true,
  isVerified: true,
  email: true,
  phone: true,
  address: true,
  logoUrl: true,
  bannerUrl: true,
  description: true,
  shortDescription: true,
  businessCategory: true,
  openingHours: true,
  operatingYears: true,
  deliveryPrice: true,
  deliveryText: true,
  customerCount: true,
  rating: true,
  reviewCount: true,
  soldCount: true,
  createdAt: true,
  updatedAt: true,
  maxMembers: true,
  planType: true,
  planActivatedAt: true,
  planExpiresAt: true,
  trialUsed: true,
  qpayEnabled: true,
  qpayConnectedAt: true,
  webQpayEnabled: true,
  webQpayConnectedAt: true,
  minuAgentEnabled: true,
  minuAgentConnectedAt: true,
  subdomainEnabled: true,
  businessOrdersEnabled: true,
  businessInventoryEnabled: true,
  businessAttendanceEnabled: true,
  businessAttendanceManualEnabled: true,
  salesRepVendorRestrictionEnabled: true,
  businessTasksEnabled: true,
  businessDeliveryEnabled: true,
  ceoServiceEnabled: true,
  ceoAdviceNotificationsEnabled: true,
  ceoCalendarRemindersEnabled: true,
  ceoWeeklyDigestEnabled: true,
  ceoRiskAlertsEnabled: true,
  ceoKpiInsightsEnabled: true,
  ceoDecisionBriefEnabled: true,
} satisfies Prisma.OrganizationSelect;

export async function getAdminSalesStoreDetails(
  id: string,
  query: Record<string, unknown>,
) {
  const { page } = salesStoresQuery({ page: query.page });
  const pageSize = 10;
  const store = await prisma.salesVisitLocation.findFirst({
    where: { id, ...salesStoresQuery({ days: "all" }).where },
    select: {
      radiusMeters: true,
      vendorOrganization: {
        select: {
          ...storeProfileSelect,
          branches: {
            where: { deletedAt: null },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              name: true,
              address: true,
              lat: true,
              lng: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          _count: {
            select: {
              branches: { where: { deletedAt: null } },
              members: { where: { deletedAt: null, isActive: true } },
            },
          },
        },
      },
      _count: { select: { visits: true, qualityInspections: true } },
    },
  });
  if (!store?.vendorOrganization) return null;
  const { branches, _count, ...profile } = store.vendorOrganization;
  return {
    radiusMeters: store.radiusMeters,
    profile,
    activeMemberCount: _count.members,
    visitCount: store._count.visits,
    inspectionCount: store._count.qualityInspections,
    branches: { items: branches, total: _count.branches, page, pageSize },
  };
}
