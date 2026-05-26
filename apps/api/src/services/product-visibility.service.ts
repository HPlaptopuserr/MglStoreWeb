import type { Request } from "express";
import { prisma } from "@mgl/database";
import { isAdminRole } from "@mgl/types";
import type { AuthPayload } from "../middleware/auth";
import { hasOrgMembership } from "./permission.service";

export const WEB_PRODUCTS_FEATURE_KEY = "web-products-enabled";

const TRUE_VALUES = new Set(["1", "true", "on", "yes"]);

function isTruthySetting(value?: string | null) {
  return TRUE_VALUES.has(String(value ?? "").trim().toLowerCase());
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

  return isTruthySetting(setting?.value);
}

export async function shouldExposeOrgProductsOnWeb(
  req: Request,
  organizationId: string,
) {
  if (await canBypassWebProductsVisibility(req, organizationId)) return true;
  return isOrgWebProductsEnabled(organizationId);
}

export async function getWebProductsEnabledOrganizationIds() {
  const settings = await prisma.siteSetting.findMany({
    where: { key: { startsWith: `${WEB_PRODUCTS_FEATURE_KEY}-` } },
    select: { key: true, value: true },
  });

  return settings
    .filter((setting) => isTruthySetting(setting.value))
    .map((setting) => getOrganizationIdFromSettingKey(setting.key))
    .filter(Boolean);
}
