import type { AuthOrganization, AuthUser } from "@/lib/auth-context";

// ADMIN is the organization-level manager role in the current RBAC model.
const ORGANIZATION_MANAGEMENT_ROLES = new Set(["OWNER", "ADMIN"]);

export function canManageOrganization(role?: string | null): boolean {
  return ORGANIZATION_MANAGEMENT_ROLES.has((role || "").toUpperCase());
}

export function getMembershipTierLabel(user: AuthUser) {
  const membership = user.membership as
    | { tier?: string; membershipType?: string; active?: boolean }
    | undefined;
  const tier = (membership?.tier || membership?.membershipType || "").toUpperCase();

  if (tier === "BRANCH_COUNCIL" || tier === "GOLD") return "Gold";
  if (tier === "GOVERNING_COUNCIL" || tier === "PLATINUM") return "Platinum";
  if (tier === "ACTIVE" || tier === "SILVER") return "Silver";
  return user.membership?.active || user.isPrime ? "Member" : "Идэвхгүй";
}

export function getManagedOrganizations(user: AuthUser): AuthOrganization[] {
  if (Array.isArray(user.organizations) && user.organizations.length > 0) {
    return user.organizations.filter((organization) =>
      canManageOrganization(organization.role),
    );
  }

  if (
    !user.organizationId ||
    !user.orgRole ||
    !canManageOrganization(user.orgRole)
  ) {
    return [];
  }

  return [
    {
      id: user.organizationId,
      name: user.organizationName || "Байгууллага",
      role: user.orgRole,
      isPrimary: true,
    },
  ];
}
