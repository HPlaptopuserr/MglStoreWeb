import { prisma, type Prisma } from "@mgl/database";
import type { AuthPayload } from "../../middleware/auth";

export function buildingMembershipScope(
  userId: string,
): Prisma.OrganizationMemberWhereInput {
  return {
    userId,
    isActive: true,
    deletedAt: null,
    role: { in: ["OWNER", "ADMIN"] },
    user: { isActive: true, deletedAt: null },
    organization: {
      deletedAt: null,
      status: "ACTIVE",
      businessBuildingEnabled: true,
    },
  };
}

export async function buildingOrganizationScope(
  auth: AuthPayload,
): Promise<Prisma.OrganizationWhereInput | null> {
  if (!auth.organizationId) return null;
  // Platform administrator roles do not bypass company membership in this workspace.
  const membership = await prisma.organizationMember.findFirst({
    where: {
      ...buildingMembershipScope(auth.userId),
      organizationId: auth.organizationId,
    },
    select: { organizationId: true },
  });
  if (!membership) return null;
  return {
    id: membership.organizationId,
    deletedAt: null,
    status: "ACTIVE",
    businessBuildingEnabled: true,
  };
}
