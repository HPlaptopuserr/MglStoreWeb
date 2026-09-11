import { prisma } from "@mgl/database";

export const QUALITY_SETTINGS_PREFIX = "quality-network-";
export function qualityOrganizationKey(organizationId: string): string {
  return `${QUALITY_SETTINGS_PREFIX}organization-${organizationId}`;
}

export async function isOrganizationQualityEnabled(organizationId: string): Promise<boolean> {
  const setting = await prisma.siteSetting.findUnique({ where: { key: qualityOrganizationKey(organizationId) } });
  return setting?.value === "true";
}
