export type VendorAccessMode = "owner" | "cashier" | "member";

export interface VendorOrganization {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  status: string;
}

export interface VendorSessionUser extends Record<string, unknown> {
  id: string;
  fullName: string;
  email: string | null;
  organizationId: string | null;
  organizationName: string;
  orgRole: string | null;
  capabilities: string[];
  organizations: VendorOrganization[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item: unknown): item is string => typeof item === "string")
    : [];
}

function parseOrganizations(value: unknown): VendorOrganization[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.role !== "string"
    )
      return [];
    return [
      {
        id: item.id,
        name: item.name,
        role: item.role,
        capabilities: stringArray(item.capabilities),
        status: typeof item.status === "string" ? item.status : "ACTIVE",
      },
    ];
  });
}

export function parseVendorSessionUser(value: unknown): VendorSessionUser {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
    throw new Error("Нэвтрэлтийн мэдээлэл бүрэн ирсэнгүй. Дахин оролдоно уу.");
  }
  return {
    ...value,
    id: value.id,
    fullName: typeof value.fullName === "string" ? value.fullName : "",
    email: typeof value.email === "string" ? value.email : null,
    organizationId:
      typeof value.organizationId === "string" ? value.organizationId : null,
    organizationName:
      typeof value.organizationName === "string" ? value.organizationName : "",
    orgRole: typeof value.orgRole === "string" ? value.orgRole : null,
    capabilities: stringArray(value.capabilities),
    organizations: parseOrganizations(value.organizations),
  };
}

export function vendorAccessMode(
  role: string | null,
  capabilities: readonly string[],
): VendorAccessMode | null {
  if (role === "OWNER") return "owner";
  if (capabilities.includes("POS_CASHIER")) return "cashier";
  return role === "STAFF" || role === "ADMIN" || role === "VIEWER"
    ? "member"
    : null;
}

export function canSwitchToOrganization(organization: VendorOrganization) {
  return (
    organization.status === "ACTIVE" &&
    vendorAccessMode(organization.role, organization.capabilities) !== null
  );
}

export function canAccessVendorPath(mode: VendorAccessMode, pathname: string) {
  if (mode === "member") return pathname === "/dashboard";
  return (
    mode === "owner" ||
    ["/pos", "/inventory", "/goods-receipts"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  );
}

export function organizationDestination(
  mode: VendorAccessMode,
  pathname: string,
) {
  return canAccessVendorPath(mode, pathname)
    ? pathname
    : mode === "member"
      ? "/dashboard"
      : "/pos";
}
