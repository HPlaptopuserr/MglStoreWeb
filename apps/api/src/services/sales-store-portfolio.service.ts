import { OrgStatus, OrgType, prisma } from "@mgl/database";

type VendorOrganization = {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  businessCategory: string | null;
};

export type SalesLocationSource = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  contactName: string | null;
  contactPhone: string | null;
  assignments: Array<{ memberId: string }>;
  vendorOrganization: VendorOrganization | null;
};

export type AdminBranchSource = {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  organization: VendorOrganization;
};

export type SalesStoreLocationSource = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  contactName: string | null;
  contactPhone: string | null;
  assignedMemberIds: string[];
  assignedToMe: boolean;
  vendorOrganization: VendorOrganization;
  locationSource: "ADMIN_BRANCH" | "SALES_VISIT";
};

export function isMongoliaStoreCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= 41.5 &&
    latitude <= 52.2 &&
    longitude >= 87.5 &&
    longitude <= 120
  );
}

export function mergeSalesStoreLocationSources(
  salesLocations: SalesLocationSource[],
  adminBranches: AdminBranchSource[],
  currentMemberId: string,
): SalesStoreLocationSource[] {
  const salesLocationByVendor = new Map(
    salesLocations.flatMap((location) =>
      location.vendorOrganization
        ? [[location.vendorOrganization.id, location] as const]
        : [],
    ),
  );
  const validBranches = adminBranches.filter(
    (branch): branch is AdminBranchSource & { lat: number; lng: number } =>
      branch.lat !== null &&
      branch.lng !== null &&
      isMongoliaStoreCoordinate(branch.lat, branch.lng),
  );
  const vendorsWithMappedBranches = new Set(
    validBranches.map((branch) => branch.organizationId),
  );

  const branchStores = validBranches.map((branch) => {
    const salesLocation = salesLocationByVendor.get(branch.organizationId);
    const assignedMemberIds =
      salesLocation?.assignments.map(({ memberId }) => memberId) ?? [];
    return {
      id: `branch:${branch.id}`,
      name: branch.name,
      address: branch.address,
      latitude: branch.lat,
      longitude: branch.lng,
      radiusMeters: salesLocation?.radiusMeters ?? 150,
      contactName: salesLocation?.contactName ?? null,
      contactPhone:
        salesLocation?.contactPhone ?? branch.organization.phone ?? null,
      assignedMemberIds,
      assignedToMe: assignedMemberIds.includes(currentMemberId),
      vendorOrganization: branch.organization,
      locationSource: "ADMIN_BRANCH" as const,
    };
  });

  const fallbackSalesLocations = salesLocations.flatMap((location) => {
    const vendor = location.vendorOrganization;
    if (
      !vendor ||
      vendorsWithMappedBranches.has(vendor.id) ||
      !isMongoliaStoreCoordinate(location.latitude, location.longitude)
    )
      return [];
    const assignedMemberIds = location.assignments.map(
      ({ memberId }) => memberId,
    );
    return [
      {
        id: location.id,
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: location.radiusMeters,
        contactName: location.contactName,
        contactPhone: location.contactPhone,
        assignedMemberIds,
        assignedToMe: assignedMemberIds.includes(currentMemberId),
        vendorOrganization: vendor,
        locationSource: "SALES_VISIT" as const,
      },
    ];
  });

  return [...branchStores, ...fallbackSalesLocations].sort((left, right) =>
    left.name.localeCompare(right.name, "mn"),
  );
}

const vendorSelect = {
  id: true,
  name: true,
  taxId: true,
  email: true,
  phone: true,
  address: true,
  businessCategory: true,
} as const;

export async function getSalesStoreLocationSources(currentMemberId: string) {
  const [salesLocations, adminBranches] = await Promise.all([
    prisma.salesVisitLocation.findMany({
      where: {
        isActive: true,
        vendorOrganizationId: { not: null },
        vendorOrganization: {
          is: {
            type: OrgType.VENDOR,
            status: OrgStatus.ACTIVE,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
        contactName: true,
        contactPhone: true,
        assignments: { select: { memberId: true } },
        vendorOrganization: { select: vendorSelect },
      },
    }),
    prisma.branch.findMany({
      where: {
        deletedAt: null,
        lat: { not: null },
        lng: { not: null },
        organization: {
          type: OrgType.VENDOR,
          status: OrgStatus.ACTIVE,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        organization: { select: vendorSelect },
      },
    }),
  ]);

  return mergeSalesStoreLocationSources(
    salesLocations,
    adminBranches,
    currentMemberId,
  );
}
