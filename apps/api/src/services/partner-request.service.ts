import bcrypt from "bcryptjs";
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
  };
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

  const existingUser = await prisma.user.findUnique({
    where: { email: existingRequest.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("Энэ email дээр user аль хэдийн бүртгэлтэй байна");
  }

  const slug = await generateUniqueOrganizationSlug(
    existingRequest.organizationName,
  );

  const taxId =
    existingRequest.taxId?.trim() || (await generateUniqueTaxId("TEMP"));

  const tempPassword = "12345678";
  const passwordHash = await bcrypt.hash(tempPassword, 10);

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
        isVerified: false,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        taxId: true,
      },
    });

    const newUser = await tx.user.create({
      data: {
        email: existingRequest.email,
        passwordHash,
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

    await tx.organizationMember.create({
      data: {
        userId: newUser.id,
        organizationId: newOrganization.id,
        role: "OWNER",
        isActive: true,
      },
    });

    const updatedRequest = await tx.registrationRequest.update({
      where: { id: existingRequest.id },
      data: {
        status: ApprovalStatus.APPROVED,
        approvedUserId: newUser.id,
        approvedAt: new Date(),
        reviewedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        approvedAt: true,
        reviewedAt: true,
      },
    });

    return {
      organization: newOrganization,
      user: newUser,
      request: updatedRequest,
    };
  });

  return result;
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
