import { prisma } from "@mgl/database";
import {
  StoreMiniAppValidationError,
  emptyStoreMiniAppSettings,
  normalizeMiniAppPhone,
  parseStoreMiniAppSettings,
  STORE_MINI_APP_SETTINGS_KEY,
  type StoreMiniAppSettings,
} from "@mgl/types";

interface PhoneGrant {
  phone: string;
  userId: string;
}
export interface StoredMiniApps {
  settings: StoreMiniAppSettings;
  grants: PhoneGrant[];
}
export async function readStoreMiniApps(): Promise<StoredMiniApps> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: STORE_MINI_APP_SETTINGS_KEY },
    select: { value: true },
  });
  if (!row) return { settings: emptyStoreMiniAppSettings(), grants: [] };
  const raw: unknown = JSON.parse(row.value);
  if (
    !raw ||
    typeof raw !== "object" ||
    !("settings" in raw) ||
    !("grants" in raw) ||
    !Array.isArray(raw.grants)
  )
    throw new Error("Каталогийн тохиргоо гэмтсэн байна.");
  const grants = raw.grants.map((grant: unknown): PhoneGrant => {
    if (
      !grant ||
      typeof grant !== "object" ||
      !("phone" in grant) ||
      !("userId" in grant) ||
      typeof grant.phone !== "string" ||
      typeof grant.userId !== "string"
    )
      throw new Error("Хэрэглэгчийн зөвшөөрөл буруу байна.");
    return { phone: grant.phone, userId: grant.userId };
  });
  return { settings: parseStoreMiniAppSettings(raw.settings), grants };
}

// Resolve a number to an existing account at grant time. Never trust a submitted
// shipping phone or let another account gain access by editing its profile.
export async function resolvePhoneGrants(
  phones: string[],
): Promise<PhoneGrant[]> {
  if (!phones.length) return [];
  const profiles = await prisma.profile.findMany({
    where: {
      user: { isActive: true, deletedAt: null },
      phoneNumber: { not: null },
    },
    select: { userId: true, phoneNumber: true },
  });
  return phones.map((phone) => {
    const matches = profiles.filter(
      (profile) =>
        profile.phoneNumber &&
        normalizeMiniAppPhone(profile.phoneNumber) === phone,
    );
    if (matches.length !== 1)
      throw new StoreMiniAppValidationError(
        `${phone}: идэвхтэй хэрэглэгчийн бүртгэл ${matches.length ? "давхардсан" : "олдсонгүй"}.`,
      );
    return { phone, userId: matches[0].userId };
  });
}
export function canOrderVendorMiniApp(
  config: StoredMiniApps,
  userId: string,
): boolean {
  const app = config.settings["store-owners"];
  return (
    app.enabled &&
    config.grants.some(
      (grant) =>
        grant.userId === userId && app.allowedPhones.includes(grant.phone),
    )
  );
}
export async function assertMiniAppOrderAccess(
  userId: string,
  products: ReadonlyArray<{
    organizationId: string | null;
    managedByWarehouseId: string | null;
    miniAppId?: unknown;
  }>,
): Promise<boolean> {
  const config = await readStoreMiniApps();
  for (const product of products) {
    if (product.miniAppId == null) continue;
    if (
      product.miniAppId !== "shared-store" &&
      product.miniAppId !== "store-owners"
    )
      return false;
    const app = config.settings[product.miniAppId];
    if (!app.enabled) return false;
    const sourceId =
      product.miniAppId === "shared-store"
        ? product.managedByWarehouseId
        : !product.managedByWarehouseId
          ? product.organizationId
          : null;
    if (!sourceId || !app.sourceIds.includes(sourceId)) return false;
  }
  const restrictedVendors = new Set(config.settings["store-owners"].sourceIds);
  const containsRestricted = products.some(
    (product) =>
      !product.managedByWarehouseId &&
      product.organizationId &&
      restrictedVendors.has(product.organizationId),
  );
  return !containsRestricted || canOrderVendorMiniApp(config, userId);
}
