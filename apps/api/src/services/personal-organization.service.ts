import crypto from "crypto";
import {
  prisma,
  OrgStatus,
  OrgType,
} from "@mgl/database";
import type { Prisma } from "@mgl/database";
import {
  BUSINESS_CATEGORY_ERROR,
  DUPLICATE_ORGANIZATION_NAME_ERROR,
  MONGOLIAN_ORGANIZATION_NAME_ERROR,
  cleanOrganizationName,
  cleanBusinessCategory,
  isValidMongolianOrganizationName,
  normalizeOrganizationName,
  normalizeUserSearchQuery,
} from "./personal-organization.validation";

const INVITE_MESSAGE =
  "Байгууллага идэвхжүүлэх хоёр дахь гишүүний баталгаажуулалт";

type UserSearchResult = {
  id: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
};

type CreatePersonalOrganizationInput = {
  creatorUserId: string;
  organizationName: string;
  businessCategory: string;
  inviteeUserId: string;
};

function createSlugBase(name: string): string {
  const compact = normalizeOrganizationName(name)
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return compact || "organization";
}

async function generateUniqueOrganizationSlug(name: string): Promise<string> {
  const base = createSlugBase(name).slice(0, 48) || "organization";
  let slug = base;
  let counter = 0;

  while (true) {
    const exists = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!exists) return slug;
    counter += 1;
    slug = `${base}-${counter}`;
  }
}

async function generateUniqueTaxId(): Promise<string> {
  while (true) {
    const taxId = `TEMP-PERSONAL-${crypto.randomBytes(6).toString("hex")}`;
    const exists = await prisma.organization.findUnique({
      where: { taxId },
      select: { id: true },
    });
    if (!exists) return taxId;
  }
}

async function organizationNameExists(normalizedName: string): Promise<boolean> {
  const direct = await prisma.organization.findFirst({
    where: {
      deletedAt: null,
      nameNormalized: normalizedName,
    },
    select: { id: true },
  });
  if (direct) return true;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "Organization"
    WHERE "deletedAt" IS NULL
      AND lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) = ${normalizedName}
    LIMIT 1
  `;

  return rows.length > 0;
}

export async function assertOrganizationNameAvailable(name: string) {
  if (!isValidMongolianOrganizationName(name)) {
    throw new Error(MONGOLIAN_ORGANIZATION_NAME_ERROR);
  }

  const normalizedName = normalizeOrganizationName(name);
  if (await organizationNameExists(normalizedName)) {
    throw new Error(DUPLICATE_ORGANIZATION_NAME_ERROR);
  }

  return normalizedName;
}

export async function searchPersonalOrganizationInvitees(
  currentUserId: string,
  rawQuery: string,
): Promise<UserSearchResult[]> {
  const query = normalizeUserSearchQuery(rawQuery);
  if (query.length < 3) {
    throw new Error("Хайлтын утга 3-аас дээш тэмдэгт байх ёстой");
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      isActive: true,
      deletedAt: null,
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { profile: { phoneNumber: { contains: query } } },
        { profile: { fullName: { contains: query, mode: "insensitive" } } },
      ],
    },
    take: 12,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          fullName: true,
          phoneNumber: true,
          avatarUrl: true,
        },
      },
    },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email?.endsWith("@temp.local") ? null : user.email,
    fullName: user.profile?.fullName || "",
    phone: user.profile?.phoneNumber || null,
    avatarUrl: user.profile?.avatarUrl || null,
  }));
}

export async function createPersonalOrganization({
  creatorUserId,
  organizationName,
  businessCategory,
  inviteeUserId,
}: CreatePersonalOrganizationInput) {
  const normalizedName = await assertOrganizationNameAvailable(organizationName);
  const cleanedCategory = cleanBusinessCategory(businessCategory);
  if (!cleanedCategory) {
    throw new Error(BUSINESS_CATEGORY_ERROR);
  }
  if (inviteeUserId === creatorUserId) {
    throw new Error("Өөрийгөө хоёр дахь гишүүнээр урих боломжгүй.");
  }

  const [creator, invitee] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: creatorUserId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, email: true },
    }),
    prisma.user.findFirst({
      where: {
        id: inviteeUserId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    }),
  ]);

  if (!creator) throw new Error("Хэрэглэгч олдсонгүй.");
  if (!invitee) throw new Error("Урих хэрэглэгч олдсонгүй.");

  const pendingOwned = await prisma.organizationMember.findFirst({
    where: {
      userId: creatorUserId,
      isActive: true,
      deletedAt: null,
      role: "OWNER",
      organization: {
        deletedAt: null,
        status: OrgStatus.PENDING,
      },
    },
    select: { organization: { select: { name: true } } },
  });
  if (pendingOwned) {
    throw new Error(
      `"${pendingOwned.organization.name}" байгууллагын баталгаажуулалт хүлээгдэж байна.`,
    );
  }

  const slug = await generateUniqueOrganizationSlug(organizationName);
  const taxId = await generateUniqueTaxId();
  const displayName = cleanOrganizationName(organizationName);

  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const organization = await tx.organization.create({
        data: {
          name: displayName,
          nameNormalized: normalizedName,
          slug,
          taxId,
          type: OrgType.SUPPLIER,
          status: OrgStatus.PENDING,
          businessCategory: cleanedCategory,
          email: creator.email?.endsWith("@temp.local") ? null : creator.email,
          shortDescription: `${cleanedCategory} чиглэлээр баталгаажуулалт хүлээгдэж байна.`,
          isVerified: false,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          businessCategory: true,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId: creatorUserId,
          organizationId: organization.id,
          role: "OWNER",
          isPrimary: true,
          isActive: true,
        },
      });

      const invitation = await tx.orgJoinRequest.create({
        data: {
          userId: inviteeUserId,
          organizationId: organization.id,
          message: INVITE_MESSAGE,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              profile: { select: { fullName: true, phoneNumber: true } },
            },
          },
        },
      });

      return {
        organization,
        invitation: {
          id: invitation.id,
          status: invitation.status,
          createdAt: invitation.createdAt,
          inviteeEmail: invitation.user.email?.endsWith("@temp.local")
            ? null
            : invitation.user.email,
          inviteeName: invitation.user.profile?.fullName || "",
          inviteePhone: invitation.user.profile?.phoneNumber || null,
        },
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Unique constraint")) {
      throw new Error(DUPLICATE_ORGANIZATION_NAME_ERROR);
    }
    throw error;
  }
}

export async function getPersonalOrganizationOverview(userId: string) {
  const [ownedPending, invitations] = await Promise.all([
    prisma.organizationMember.findMany({
      where: {
        userId,
        deletedAt: null,
        isActive: true,
        role: "OWNER",
        organization: { deletedAt: null, status: OrgStatus.PENDING },
      },
      orderBy: { createdAt: "desc" },
      select: {
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            businessCategory: true,
            createdAt: true,
            joinRequests: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                status: true,
                rejectedReason: true,
                createdAt: true,
                user: {
                  select: {
                    email: true,
                    profile: {
                      select: { fullName: true, phoneNumber: true, avatarUrl: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.orgJoinRequest.findMany({
      where: {
        userId,
        status: "PENDING",
        organization: { deletedAt: null, status: OrgStatus.PENDING },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        message: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            businessCategory: true,
            members: {
              where: { role: "OWNER", deletedAt: null, isActive: true },
              take: 1,
              select: {
                user: {
                  select: {
                    email: true,
                    profile: { select: { fullName: true, phoneNumber: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    ownedPending: ownedPending.map(({ organization }) => {
      const request = organization.joinRequests[0] || null;
      return {
        id: organization.id,
        name: organization.name,
        status: organization.status,
        businessCategory: organization.businessCategory,
        createdAt: organization.createdAt,
        invitation: request
          ? {
              id: request.id,
              status: request.status,
              rejectedReason: request.rejectedReason,
              createdAt: request.createdAt,
              inviteeName: request.user.profile?.fullName || "",
              inviteeEmail: request.user.email?.endsWith("@temp.local")
                ? null
                : request.user.email,
              inviteePhone: request.user.profile?.phoneNumber || null,
              inviteeAvatarUrl: request.user.profile?.avatarUrl || null,
            }
          : null,
      };
    }),
    invitations: invitations.map((invitation) => {
      const owner = invitation.organization.members[0]?.user;
      return {
        id: invitation.id,
        message: invitation.message,
        createdAt: invitation.createdAt,
        organizationId: invitation.organization.id,
        organizationName: invitation.organization.name,
        businessCategory: invitation.organization.businessCategory,
        ownerName: owner?.profile?.fullName || "",
        ownerEmail: owner?.email?.endsWith("@temp.local") ? null : owner?.email || null,
        ownerPhone: owner?.profile?.phoneNumber || null,
      };
    }),
  };
}

export async function respondToPersonalOrganizationInvitation(
  userId: string,
  requestId: string,
  action: "approve" | "reject",
) {
  const request = await prisma.orgJoinRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      status: true,
      organization: { select: { status: true, name: true } },
    },
  });

  if (!request) throw new Error("Хүсэлт олдсонгүй.");
  if (request.userId !== userId) {
    throw new Error("Энэ хүсэлтийг шийдвэрлэх эрхгүй байна.");
  }
  if (request.status !== "PENDING") {
    throw new Error("Хүсэлт аль хэдийн шийдвэрлэгдсэн байна.");
  }
  if (request.organization.status !== OrgStatus.PENDING) {
    throw new Error("Байгууллагын баталгаажуулалт идэвхгүй байна.");
  }

  if (action === "reject") {
    const rejected = await prisma.orgJoinRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        rejectedReason: "Уригдсан хэрэглэгч татгалзсан.",
      },
      select: { id: true, status: true, rejectedReason: true },
    });
    return { organizationStatus: request.organization.status, request: rejected };
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const alreadyMember = await tx.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: request.organizationId,
        },
      },
      select: { id: true },
    });

    if (!alreadyMember) {
      await tx.organizationMember.create({
        data: {
          userId,
          organizationId: request.organizationId,
          role: "STAFF",
          isActive: true,
        },
      });
    }

    const [updatedRequest, organization] = await Promise.all([
      tx.orgJoinRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", rejectedReason: null },
        select: { id: true, status: true },
      }),
      tx.organization.update({
        where: { id: request.organizationId },
        data: { status: OrgStatus.ACTIVE },
        select: { id: true, name: true, status: true },
      }),
    ]);

    return { organizationStatus: organization.status, request: updatedRequest };
  });

  return result;
}
