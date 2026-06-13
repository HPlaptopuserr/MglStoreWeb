import type { AuthOrganization, AuthUser } from "@/lib/auth-context";

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
    return user.organizations;
  }

  if (!user.organizationId || !user.orgRole) return [];

  return [
    {
      id: user.organizationId,
      name: user.organizationName || "Байгууллага",
      role: user.orgRole,
      isPrimary: true,
    },
  ];
}
