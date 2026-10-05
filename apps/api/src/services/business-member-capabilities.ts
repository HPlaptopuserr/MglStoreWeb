import { prisma, Capability } from "@mgl/database";
import {
  BUSINESS_CAPABILITY_OPTIONS,
  type BusinessAppFeatureKey,
} from "@mgl/types";

import { qualityOrganizationKey } from "./quality-network-settings";

export async function getOrganizationAppFeatures(organizationId: string) {
  const [org, checklist] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: {
        businessPosEnabled: true,
        businessSalesEnabled: true,
        businessOrdersEnabled: true,
        businessInventoryEnabled: true,
        businessAttendanceEnabled: true,
        businessTasksEnabled: true,
        businessDeliveryEnabled: true,
      },
    }),
    prisma.siteSetting.findUnique({
      where: { key: qualityOrganizationKey(organizationId) },
      select: { value: true },
    }),
  ]);
  if (!org) return null;
  return {
    pos: org.businessPosEnabled,
    sales: org.businessSalesEnabled,
    orders: org.businessOrdersEnabled,
    inventory: org.businessInventoryEnabled,
    attendance: org.businessAttendanceEnabled,
    tasks: org.businessTasksEnabled,
    delivery: org.businessDeliveryEnabled,
    checklist: checklist?.value === "true",
  } satisfies Record<BusinessAppFeatureKey, boolean>;
}

export function availableMemberCapabilities(
  features: Record<BusinessAppFeatureKey, boolean>,
): string[] {
  return Object.entries(BUSINESS_CAPABILITY_OPTIONS)
    .filter(([, option]) => features[option.feature])
    .map(([capability]) => capability);
}

export function parseMemberCapabilities(body: unknown): Capability[] | null {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return null;
  const value = body as Record<string, unknown>;
  if (
    Object.keys(value).some(
      (key) => key !== "capabilities" && key !== "expectedCapabilities",
    )
  )
    return null;
  if (
    !Array.isArray(value.capabilities) ||
    !value.capabilities.every(isCapability)
  )
    return null;
  return [...new Set(value.capabilities)];
}

export function isCapability(value: unknown): value is Capability {
  return (
    typeof value === "string" &&
    Object.values(Capability).some((item) => item === value)
  );
}

/** Existing disabled assignments may be retained or revoked; only new grants are checked. */
export function blockedCapabilityGrants(
  next: readonly Capability[],
  previous: readonly Capability[],
  features: Record<BusinessAppFeatureKey, boolean>,
): Capability[] {
  return next.filter((capability) => {
    if (previous.includes(capability)) return false;
    const option = BUSINESS_CAPABILITY_OPTIONS[capability];
    return !option || !features[option.feature];
  });
}

export function sameCapabilities(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length && left.every((item) => right.includes(item))
  );
}
