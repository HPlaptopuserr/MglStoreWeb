import type { Request } from "express";
import { prisma } from "@mgl/database";
import { isAdminRole } from "@mgl/types";
import type { AuthPayload } from "../middleware/auth";
import { hasOrgMembership } from "./permission.service";

export const WEB_PRODUCTS_FEATURE_KEY = "web-products-enabled";

/**
 * Canonical publication state used by every public product projection.
 * Review status is intentionally not part of storefront publication: an
 * active product in an active storefront must remain reachable from its card.
 */
export const PUBLIC_PRODUCT_STATE_FILTER = {
  isActive: true,
  deletedAt: null,
} as const;

interface PublicProductState {
  isActive: boolean;
  deletedAt: Date | null;
  organization: {
    status: string;
    deletedAt: Date | null;
  };
}

export function hasPublicProductState(product: PublicProductState) {
  return (
    product.isActive &&
    product.deletedAt === null &&
    product.organization.status === "ACTIVE" &&
    product.organization.deletedAt === null
  );
}

const TRUE_VALUES = new Set(["1", "true", "on", "yes"]);

function isTruthySetting(value?: string | null) {
  return TRUE_VALUES.has(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

function getSettingKey(organizationId: string) {
  return `${WEB_PRODUCTS_FEATURE_KEY}-${organizationId}`;
}

function getOrganizationIdFromSettingKey(key: string) {
  const prefix = `${WEB_PRODUCTS_FEATURE_KEY}-`;
  return key.startsWith(prefix) ? key.slice(prefix.length) : "";
}

export function canBypassAllWebProductsVisibility(req: Request) {
  const user = (req as any).user as AuthPayload | undefined;
  return !!user?.role && isAdminRole(user.role);
}

export async function canBypassWebProductsVisibility(
  req: Request,
  organizationId: string,
) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user?.userId) return false;
  if (canBypassAllWebProductsVisibility(req)) return true;
  if (user.organizationId === organizationId) return true;
  return hasOrgMembership(user.userId, organizationId);
}

export async function isOrgWebProductsEnabled(organizationId: string) {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: getSettingKey(organizationId) },
    select: { value: true },
  });

  // Organizations are storefronts by default. An explicit false value is the
  // opt-out switch; a missing setting must not silently hide every product the
  // owner just published.
  if (
    setting?.value === undefined ||
    setting.value === null ||
    setting.value === ""
  ) {
    return true;
  }
  return isTruthySetting(setting?.value);
}

export async function areWebProductsGloballyEnabled() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: WEB_PRODUCTS_FEATURE_KEY },
    select: { value: true },
  });

  if (
    setting?.value === undefined ||
    setting?.value === null ||
    setting.value === ""
  ) {
    return true;
  }

  return isTruthySetting(setting.value);
}

export async function shouldExposeOrgProductsOnWeb(
  req: Request,
  organizationId: string,
) {
  if (await canBypassWebProductsVisibility(req, organizationId)) return true;
  if (!(await areWebProductsGloballyEnabled())) return false;
  return isOrgWebProductsEnabled(organizationId);
}

export async function getWebProductsEnabledOrganizationIds() {
  const disabledSettings = await prisma.siteSetting.findMany({
    where: { key: { startsWith: `${WEB_PRODUCTS_FEATURE_KEY}-` } },
    select: { key: true, value: true },
  });

  const disabledOrganizationIds = disabledSettings
    .filter((setting) => !isTruthySetting(setting.value))
    .map((setting) => getOrganizationIdFromSettingKey(setting.key))
    .filter(Boolean);

  const organizations = await prisma.organization.findMany({
    where: {
      deletedAt: null,
      ...(disabledOrganizationIds.length
        ? { id: { notIn: disabledOrganizationIds } }
        : {}),
    },
    select: { id: true },
  });
  return organizations.map((organization) => organization.id);
}
