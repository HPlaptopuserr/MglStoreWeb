export const ACCESS_PIN_PATTERN = /^\d{4}$/;

export const PROTECTED_SECTION_SCOPES = [
  "PRODUCTS",
  "REPORTS",
  "RESTAURANT_POS",
  "CUSTOMERS",
] as const;

export type ProtectedSectionScope =
  (typeof PROTECTED_SECTION_SCOPES)[number];

type AccessPinActor = {
  platformRole?: string | null;
  orgRole?: string | null;
  capabilities?: readonly string[];
};

export function isValidAccessPin(value: unknown): value is string {
  return typeof value === "string" && ACCESS_PIN_PATTERN.test(value);
}

export function parseProtectedSectionScope(
  value: unknown,
): ProtectedSectionScope | null {
  const scope = String(value || "").trim().toUpperCase();
  return PROTECTED_SECTION_SCOPES.includes(
    scope as ProtectedSectionScope,
  )
    ? (scope as ProtectedSectionScope)
    : null;
}

export function canUseAccessPinForScope(
  scope: ProtectedSectionScope,
  actor: AccessPinActor,
): boolean {
  const platformRole = String(actor.platformRole || "").toUpperCase();
  if (platformRole === "ADMIN" || platformRole === "SUPER_ADMIN") return true;

  const orgRole = String(actor.orgRole || "").toUpperCase();
  if (orgRole === "OWNER" || orgRole === "ADMIN") return true;

  if (scope !== "RESTAURANT_POS") return false;
  return (
    orgRole === "STAFF" ||
    (actor.capabilities || []).includes("POS_CASHIER")
  );
}
