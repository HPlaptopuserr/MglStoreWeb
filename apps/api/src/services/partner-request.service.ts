import crypto from "crypto";
import {
  prisma,
  ApprovalStatus,
  OnboardingSource,
  OrgStatus,
  OrgType,
  PlatformRole,
} from "@mgl/database";
import type { Prisma } from "@mgl/database";

type ApprovePartnerRequestResult = {
  organization: {
    id: string;
    name: string;
    slug: string;
    taxId: string;
  };
  user: {
    id: string;
    email: string;
    role: PlatformRole;
  };
  request: {
    id: string;
    status: ApprovalStatus;
    approvedAt: Date | null;
    reviewedAt: Date | null;
    inviteToken: string | null;
    inviteTokenExpiresAt: Date | null;
  };
  inviteLink: string | null;
};

type RejectPartnerRequestResult = {
  id: string;
  status: ApprovalStatus;
  rejectedAt: Date | null;
  reviewedAt: Date | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueOrganizationSlug(name: string): Promise<string> {
  const baseSlug = slugify(name) || "organization";
  let slug = baseSlug;
  let counter = 0;

  while (true) {
    const exists = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!exists) return slug;

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

async function generateUniqueTaxId(prefix = "TEMP"): Promise<string> {
  let taxId = `${prefix}-${Date.now()}`;

  while (true) {
    const exists = await prisma.organization.findUnique({
      where: { taxId },
      select: { id: true },
    });

    if (!exists) return taxId;

    taxId = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getInviteTokenExpiry(): Date {
  const now = new Date();
  now.setHours(now.getHours() + 24); // 24 цагийн дотор дуусна
  return now;
}

function normalizeEmail(value?: string | null): string | null {
  const raw = value?.trim().toLowerCase();
  if (!raw) return null;
  if (!raw.includes("@")) return null;
  return raw;
}

const VENDOR_APP_URL =
  process.env.VENDOR_APP_URL || "https://vendor.mglstore.mn";

const TRIAL_PLAN_DAYS = 14;

export async function approvePartnerRequest(
  id: string,
): Promise<ApprovePartnerRequestResult> {
  const existingRequest = await prisma.registrationRequest.findUnique({
    where: { id },
  });

  if (!existingRequest) {
    throw new Error("Хүсэлт олдсонгүй");
  }

  if (existingRequest.requestedOrgType !== OrgType.SUPPLIER) {
    throw new Error("Энэ хүсэлт supplier бүртгэл биш байна");
  }

  if (existingRequest.status !== ApprovalStatus.PENDING) {
    throw new Error("Зөвхөн PENDING хүсэлтийг approve хийж болно");
  }

  if (!existingRequest.organizationName?.trim()) {
    throw new Error("Байгууллагын нэр дутуу байна");
  }

  const normalizedEmail = normalizeEmail(existingRequest.email);
  const fallbackEmail = `vendor-${existingRequest.id}@no-email.local`;
  const resolvedUserEmail = normalizedEmail || fallbackEmail;

  // Check if user with this email already exists (only when a real email exists)
  const existingUser = normalizedEmail
    ? await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          passwordHash: true,
        },
      })
    : null;

  // Reuse existing users across organizations. OrganizationMember enforces
  // uniqueness only for the same user + organization pair.

  const slug = await generateUniqueOrganizationSlug(
    existingRequest.organizationName,
  );

  const taxId =
    existingRequest.taxId?.trim() || (await generateUniqueTaxId("TEMP"));

  // Generate invite token only when the reused/new user still needs a password.
  const inviteToken = existingUser?.passwordHash ? null : generateInviteToken();
  const inviteTokenExpiresAt = inviteToken ? getInviteTokenExpiry() : null;

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const now = new Date();
    const trialExpiresAt = new Date(
      now.getTime() + TRIAL_PLAN_DAYS * 24 * 60 * 60 * 1000,
    );

    const newOrganization = await tx.organization.create({
      data: {
        name: existingRequest.organizationName!,
        slug,
        taxId,
        type: existingRequest.organizationType || OrgType.SUPPLIER,
        status: OrgStatus.ACTIVE,
        email: normalizeEmail(existingRequest.organizationEmail) || normalizedEmail,
        phone: existingRequest.organizationPhone || existingRequest.phoneNumber,
        address: existingRequest.organizationAddress,
        businessCategory: existingRequest.businessCategory,
        isVerified: false,
        subdomainEnabled: true,
        planType: "trial",
        planActivatedAt: now,
        planExpiresAt: trialExpiresAt,
        trialUsed: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        taxId: true,
      },
    });

    // Either reuse an existing account or create a new user.
    let finalUser;
    if (existingUser) {
      finalUser = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          isActive: true,
          emailVerified: true,
        },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });
    } else {
      // Create new user WITHOUT password - vendor will set it via invite link
      finalUser = await tx.user.create({
        data: {
          email: resolvedUserEmail,
          // passwordHash is null - vendor needs to set password via invite link
          role: PlatformRole.USER,
          isActive: true,
          emailVerified: true,
          onboardingSource: OnboardingSource.ADMIN,
        },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });
    }

    // Upsert profile with phone number so vendor can login by phone
    await tx.profile.upsert({
      where: { userId: finalUser.id },
      update: {
        ...(existingRequest.phoneNumber
          ? { phoneNumber: existingRequest.phoneNumber }
          : {}),
      },
      create: {
        userId: finalUser.id,
        fullName: existingRequest.fullName || existingRequest.organizationName || "",
        phoneNumber: existingRequest.phoneNumber || null,
      },
    });

    if (inviteToken && inviteTokenExpiresAt) {
      await tx.vendorSetupToken.create({
        data: {
          userId: finalUser.id,
          token: inviteToken,
          expiresAt: inviteTokenExpiresAt,
        },
      });
    }

    await tx.organizationMember.create({
      data: {
        userId: finalUser.id,
        organizationId: newOrganization.id,
        role: "OWNER",
        isPrimary: true,
        isActive: true,
      },
    });

    const updatedRequest = await tx.registrationRequest.update({
      where: { id: existingRequest.id },
      data: {
        status: ApprovalStatus.APPROVED,
        approvedUserId: finalUser.id,
        approvedAt: new Date(),
        reviewedAt: new Date(),
        inviteToken,
        inviteTokenExpiresAt,
      },
      select: {
        id: true,
        status: true,
        approvedAt: true,
        reviewedAt: true,
        inviteToken: true,
        inviteTokenExpiresAt: true,
      },
    });

    return {
      organization: newOrganization,
      user: finalUser,
      request: updatedRequest,
    };
  });

  const inviteLink = inviteToken ? `${VENDOR_APP_URL}/set-password?token=${inviteToken}` : null;

  return {
    ...result,
    inviteLink,
  };
}

export async function rejectPartnerRequest(
  id: string,
): Promise<RejectPartnerRequestResult> {
  const existingRequest = await prisma.registrationRequest.findUnique({
    where: { id },
  });

  if (!existingRequest) {
    throw new Error("Хүсэлт олдсонгүй");
  }

  if (existingRequest.status !== ApprovalStatus.PENDING) {
    throw new Error("Зөвхөн PENDING хүсэлтийг reject хийж болно");
  }

  return prisma.registrationRequest.update({
    where: { id },
    data: {
      status: ApprovalStatus.REJECTED,
      rejectedAt: new Date(),
      reviewedAt: new Date(),
    },
    select: {
      id: true,
      status: true,
      rejectedAt: true,
      reviewedAt: true,
    },
  });
}

export async function activateOrganizationInvite(): Promise<never> {
  throw new Error("Invite flow түр идэвхгүй байна");
}
