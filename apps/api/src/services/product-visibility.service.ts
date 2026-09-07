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
  name: { not: "" },
  price: { gte: 100 },
  images: { some: {} },
} as const;

interface PublicProductState {
  isActive: boolean;
  deletedAt: Date | null;
  organization: {
    status: string;
    deletedAt: Date | null;
  };
}

interface PublicProductCatalogQuality {
  name: string;
  price: number | { toString(): string };
  images: Array<{ id?: string; url?: string }>;
}

export function hasPublicProductState(product: PublicProductState) {
  return (
    product.isActive &&
    product.deletedAt === null &&
    product.organization.status === "ACTIVE" &&
    product.organization.deletedAt === null
  );
}

export function hasPublicProductCatalogQuality(
  product: PublicProductCatalogQuality,
) {
  return (
    product.name.trim().length > 0 &&
    Number(product.price) >= 100 &&
    product.images.some((image) => String(image.url ?? image.id ?? "").trim())
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

  // Public marketplace publication is explicit opt-in. Operational/POS
  // products must never leak into the online catalog because a setting is absent.
  if (!setting?.value) return false;
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
  const enabledSettings = await prisma.siteSetting.findMany({
    where: { key: { startsWith: `${WEB_PRODUCTS_FEATURE_KEY}-` } },
    select: { key: true, value: true },
  });

  const enabledOrganizationIds = enabledSettings
    .filter((setting) => isTruthySetting(setting.value))
    .map((setting) => getOrganizationIdFromSettingKey(setting.key))
    .filter(Boolean);

  if (enabledOrganizationIds.length === 0) return [];

  const organizations = await prisma.organization.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      id: { in: enabledOrganizationIds },
    },
    select: { id: true },
  });
  return organizations.map((organization) => organization.id);
}
