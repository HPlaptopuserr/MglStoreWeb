import type { Prisma } from "@mgl/database";

type PrismaLike = Prisma.TransactionClient | typeof import("@mgl/database").prisma;

function laterDate(a: Date | null | undefined, b: Date) {
  if (!a) return b;
  return a.getTime() > b.getTime() ? a : b;
}

export async function syncOwnerPersonalMembershipFromOrgPlan({
  prisma,
  organizationId,
  paidAt,
  expiresAt,
}: {
  prisma: PrismaLike;
  organizationId: string;
  paidAt: Date;
  expiresAt: Date;
}) {
  const owner = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      role: "OWNER",
      isActive: true,
      deletedAt: null,
      user: { deletedAt: null, isActive: true },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: {
      userId: true,
      user: {
        select: {
          membershipExpiresAt: true,
          profile: { select: { phoneNumber: true } },
        },
      },
    },
  });

  if (!owner) return null;

  const membershipExpiresAt = laterDate(owner.user.membershipExpiresAt, expiresAt);
  const membershipDiscountPhone = owner.user.profile?.phoneNumber?.trim() || null;

  return prisma.user.update({
    where: { id: owner.userId },
    data: {
      isPrime: true,
      membershipPaidAt: paidAt,
      membershipStartedAt: paidAt,
      membershipExpiresAt,
      membershipDiscountPhone,
    },
    select: {
      id: true,
      email: true,
      membershipExpiresAt: true,
      membershipDiscountPhone: true,
    },
  });
}

export async function syncOwnerPersonalMembershipFromActiveOrgPlan({
  prisma,
  organizationId,
  paidAt,
}: {
  prisma: PrismaLike;
  organizationId: string;
  paidAt?: Date;
}) {
  const org = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      subdomainEnabled: true,
      planExpiresAt: { gt: new Date() },
      deletedAt: null,
    },
    select: {
      planActivatedAt: true,
      planExpiresAt: true,
    },
  });

  if (!org?.planExpiresAt) return null;

  return syncOwnerPersonalMembershipFromOrgPlan({
    prisma,
    organizationId,
    paidAt: paidAt ?? org.planActivatedAt ?? new Date(),
    expiresAt: org.planExpiresAt,
  });
}
