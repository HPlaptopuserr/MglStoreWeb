import { prisma } from "@mgl/database";

export const MEMBERSHIP_SPONSORED_PLAN_ID = "membership_sponsored";

export interface OrganizationPlanRecord {
  id: string;
  name: string;
  slug?: string | null;
  subdomainEnabled: boolean;
  planType: string | null;
  planActivatedAt?: Date | null;
  planExpiresAt: Date | null;
  trialUsed?: boolean;
}

interface PersonalMembershipRecord {
  userId: string;
  membershipPaidAt: Date | null;
  membershipStartedAt: Date | null;
  membershipExpiresAt: Date | null;
}

export interface VendorPlanEntitlement extends OrganizationPlanRecord {
  isActive: boolean;
  effectivePlanType: string | null;
  effectivePlanActivatedAt: Date | null;
  effectivePlanExpiresAt: Date | null;
  source: "ORGANIZATION_PLAN" | "MEMBER_MEMBERSHIP" | "NONE";
}

export function isPersonalMembershipActive(
  membership: Pick<PersonalMembershipRecord, "membershipExpiresAt"> & {
    isPrime: boolean;
  },
  now = new Date(),
) {
  return Boolean(
    membership.isPrime &&
    (!membership.membershipExpiresAt || membership.membershipExpiresAt > now),
  );
}

export function resolveVendorPlanEntitlementFromRecords(
  organization: OrganizationPlanRecord,
  memberships: PersonalMembershipRecord[],
  now = new Date(),
): VendorPlanEntitlement {
  const organizationPlanActive = Boolean(
    organization.subdomainEnabled &&
    organization.planExpiresAt &&
    organization.planExpiresAt > now,
  );

  if (organizationPlanActive) {
    return {
      ...organization,
      isActive: true,
      effectivePlanType: organization.planType,
      effectivePlanActivatedAt: organization.planActivatedAt ?? null,
      effectivePlanExpiresAt: organization.planExpiresAt,
      source: "ORGANIZATION_PLAN",
    };
  }

  const sponsor = memberships.reduce<PersonalMembershipRecord | null>(
    (best, membership) => {
      if (!best) return membership;
      if (!best.membershipExpiresAt) return best;
      if (!membership.membershipExpiresAt) return membership;
      return membership.membershipExpiresAt > best.membershipExpiresAt
        ? membership
        : best;
    },
    null,
  );

  if (sponsor) {
    return {
      ...organization,
      isActive: true,
      effectivePlanType: MEMBERSHIP_SPONSORED_PLAN_ID,
      effectivePlanActivatedAt:
        sponsor.membershipStartedAt ?? sponsor.membershipPaidAt,
      effectivePlanExpiresAt: sponsor.membershipExpiresAt,
      source: "MEMBER_MEMBERSHIP",
    };
  }

  return {
    ...organization,
    isActive: false,
    effectivePlanType: organization.planType,
    effectivePlanActivatedAt: organization.planActivatedAt ?? null,
    effectivePlanExpiresAt: organization.planExpiresAt,
    source: "NONE",
  };
}

export async function resolveVendorPlanEntitlement(organizationId: string) {
  const now = new Date();
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, status: "ACTIVE", deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      subdomainEnabled: true,
      planType: true,
      planActivatedAt: true,
      planExpiresAt: true,
      trialUsed: true,
    },
  });
  if (!organization) return null;

  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      isActive: true,
      deletedAt: null,
      user: {
        isActive: true,
        deletedAt: null,
        isPrime: true,
        OR: [
          { membershipExpiresAt: null },
          { membershipExpiresAt: { gt: now } },
        ],
      },
    },
    select: {
      user: {
        select: {
          id: true,
          membershipPaidAt: true,
          membershipStartedAt: true,
          membershipExpiresAt: true,
        },
      },
    },
  });

  return resolveVendorPlanEntitlementFromRecords(
    organization,
    members.map(({ user }) => ({ userId: user.id, ...user })),
    now,
  );
}
