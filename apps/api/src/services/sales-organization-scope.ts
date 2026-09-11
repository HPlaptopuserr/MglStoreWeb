import type { Prisma } from "@mgl/database";

/** Network membership is separate from optional assignments to individual reps. */
export function salesLocationScope(organizationId: string): Prisma.SalesVisitLocationWhereInput {
  if (!organizationId.trim()) throw new Error("Sales organization is required");
  return { organizationId, isActive: true };
}

export function salesVendorScope(organizationId: string): Prisma.OrganizationWhereInput {
  return {
    deletedAt: null,
    status: "ACTIVE",
    representedSalesLocations: { some: salesLocationScope(organizationId) },
  };
}
