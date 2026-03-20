import crypto from "crypto";
import {
  prisma,
  ApprovalStatus,
  OnboardingSource,
  OrgStatus,
  OrgType,
  Role,
} from "@mgl/database";

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
    role: Role;
    organizationId: string | null;
  };
  request: {
    id: string;
    status: ApprovalStatus;
    approvedAt: Date | null;
    reviewedAt: Date | null;
    inviteToken: string | null;
    inviteTokenExpiresAt: Date | null;
  };
  inviteLink: string;
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

const VENDOR_APP_URL =
  process.env.VENDOR_APP_URL || "https://vendor.mglstore.mn";

export async function approvePartnerRequest(
  id: string,
): Promise<ApprovePartnerRequestResult> {
  const existingRequest = await prisma.registrationRequest.findUnique({
    where: { id },
  });

  if (!existingRequest) {
    throw new Error("Хүсэлт олдсонгүй");
  }

  if (existingRequest.requestedRole !== Role.SUPPLIER) {
    throw new Error("Энэ хүсэлт supplier бүртгэл биш байна");
  }

  if (existingRequest.status !== ApprovalStatus.PENDING) {
    throw new Error("Зөвхөн PENDING хүсэлтийг approve хийж болно");
  }

  if (!existingRequest.organizationName?.trim()) {
    throw new Error("Байгууллагын нэр дутуу байна");
  }

  // Check if user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: existingRequest.email },
    select: {
      id: true,
      organizationId: true,
      passwordHash: true,
    },
  });

  // If user exists and already has an organization, we can't approve
  if (existingUser?.organizationId) {
    throw new Error(
      "Энэ email дээр user аль хэдийн өөр байгууллагад бүртгэлтэй байна",
    );
  }

  // If user exists with password but no org, they might be from another system
  if (existingUser?.passwordHash) {
    throw new Error(
      "Энэ email дээр user аль хэдийн бүртгэлтэй байна. Өөр email ашиглана уу.",
    );
  }

  // If existingUser exists but has no org and no password, we'll reuse it
  // (likely from a previous failed/cancelled approval)

  const slug = await generateUniqueOrganizationSlug(
    existingRequest.organizationName,
  );

  const taxId =
    existingRequest.taxId?.trim() || (await generateUniqueTaxId("TEMP"));

  // Generate invite token for password setup
  const inviteToken = generateInviteToken();
  const inviteTokenExpiresAt = getInviteTokenExpiry();

  const result = await prisma.$transaction(async (tx) => {
    const newOrganization = await tx.organization.create({
      data: {
        name: existingRequest.organizationName!,
        slug,
        taxId,
        type: existingRequest.organizationType || OrgType.SUPPLIER,
        status: OrgStatus.ACTIVE,
        email: existingRequest.organizationEmail || existingRequest.email,
        phone: existingRequest.organizationPhone || existingRequest.phoneNumber,
        address: existingRequest.organizationAddress,
        businessCategory: existingRequest.businessCategory,
        isVerified: false,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        taxId: true,
      },
    });

    // Either use existing user (no org, no password) or create new user
    let finalUser;
    if (existingUser) {
      // Update existing user to link to new organization
      finalUser = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          role: Role.SUPPLIER,
          isActive: true,
          emailVerified: true,
          onboardingSource: OnboardingSource.ADMIN,
          organizationId: newOrganization.id,
        },
        select: {
          id: true,
          email: true,
          role: true,
          organizationId: true,
        },
      });
    } else {
      // Create new user WITHOUT password - vendor will set it via invite link
      finalUser = await tx.user.create({
        data: {
          email: existingRequest.email,
          // passwordHash is null - vendor needs to set password via invite link
          role: Role.SUPPLIER,
          isActive: true,
          emailVerified: true,
          onboardingSource: OnboardingSource.ADMIN,
          organizationId: newOrganization.id,
        },
        select: {
          id: true,
          email: true,
          role: true,
          organizationId: true,
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

    // Create setup token for vendor
    await tx.vendorSetupToken.create({
      data: {
        userId: finalUser.id,
        token: inviteToken,
        expiresAt: inviteTokenExpiresAt,
      },
    });

    await tx.organizationMember.create({
      data: {
        userId: finalUser.id,
        organizationId: newOrganization.id,
        role: "OWNER",
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

  const inviteLink = `${VENDOR_APP_URL}/set-password?token=${inviteToken}`;

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
