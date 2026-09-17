import { prisma, Prisma } from "@mgl/database";

export class StoreEmployeeError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const employeeSelect = {
  id: true,
  userId: true,
  role: true,
  department: true,
  capabilities: true,
  isActive: true,
  user: {
    select: {
      email: true,
      profile: { select: { fullName: true, phoneNumber: true } },
    },
  },
} satisfies Prisma.OrganizationMemberSelect;

export function serializeEmployee(
  member: Prisma.OrganizationMemberGetPayload<{
    select: typeof employeeSelect;
  }>,
) {
  return {
    id: member.id,
    userId: member.userId,
    email: member.user.email,
    fullName: member.user.profile?.fullName || "",
    phone: member.user.profile?.phoneNumber || null,
    role: member.role,
    roleLabel: {
      OWNER: "Эзэмшигч",
      ADMIN: "Менежер",
      STAFF: "Ажилтан",
      VIEWER: "Ажиглагч",
    }[member.role],
    department: member.department,
    capabilities: member.capabilities,
    isActive: member.isActive,
  };
}

async function requireStoreOwner(
  db: Prisma.TransactionClient,
  actorId: string,
  organizationId: string,
) {
  const owner = await db.organizationMember.findFirst({
    where: {
      userId: actorId,
      organizationId,
      role: "OWNER",
      isActive: true,
      deletedAt: null,
      user: { isActive: true, deletedAt: null },
    },
    select: { id: true },
  });
  if (!owner)
    throw new StoreEmployeeError(
      403,
      "Ажилтнуудыг зөвхөн тухайн дэлгүүрийн эзэмшигч удирдана.",
    );
  const organization = await db.organization.findFirst({
    where: { id: organizationId, deletedAt: null, status: "ACTIVE" },
    select: { id: true, maxMembers: true },
  });
  if (!organization) throw new StoreEmployeeError(404, "Дэлгүүр олдсонгүй.");
  return organization;
}

async function requireAvailableSeat(
  db: Prisma.TransactionClient,
  organizationId: string,
  maxMembers: number,
) {
  const count = await db.organizationMember.count({
    where: { organizationId, isActive: true, deletedAt: null },
  });
  if (count >= maxMembers)
    throw new StoreEmployeeError(
      409,
      `Идэвхтэй ажилтны хязгаар (${maxMembers}) хүрсэн байна. Ашиглахгүй эрхийг түр хааж зай гаргана уу.`,
    );
}

// Serializable transactions prevent simultaneous assignments from exceeding the plan limit.
async function withMembershipTransaction<T>(
  work: (db: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2034" && attempt < 2) continue;
        if (error.code === "P2002")
          throw new StoreEmployeeError(
            409,
            "Энэ хэрэглэгч дэлгүүрт аль хэдийн бүртгэлтэй байна.",
          );
      }
      throw error;
    }
  }
}

export async function searchStorePersonalAccounts(
  actorId: string,
  organizationId: string,
  query: string,
) {
  await requireStoreOwner(prisma, actorId, organizationId);
  const search = query.trim();
  if (search.length < 2) return [];
  if (search.length > 100)
    throw new StoreEmployeeError(400, "Хайлтаа 100 тэмдэгтэд багтаана уу.");
  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      isActive: true,
      deletedAt: null,
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { profile: { fullName: { contains: search, mode: "insensitive" } } },
        { profile: { phoneNumber: { contains: search } } },
      ],
    },
    select: {
      id: true,
      email: true,
      profile: { select: { fullName: true, phoneNumber: true } },
      organizationMemberships: {
        where: { organizationId },
        select: { isActive: true },
        take: 1,
      },
    },
    orderBy: [{ profile: { fullName: "asc" } }, { id: "asc" }],
    take: 10,
  });
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    fullName: user.profile?.fullName || "",
    phone: user.profile?.phoneNumber || null,
    membership: user.organizationMemberships.length
      ? user.organizationMemberships[0].isActive
        ? "ACTIVE"
        : "INACTIVE"
      : null,
  }));
}

export async function assignStoreCashier(
  actorId: string,
  organizationId: string,
  userId: string,
) {
  return withMembershipTransaction(async (db) => {
    const organization = await requireStoreOwner(db, actorId, organizationId);
    const user = await db.user.findFirst({
      where: { id: userId, role: "USER", isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!user)
      throw new StoreEmployeeError(
        404,
        "Идэвхтэй хувийн бүртгэл олдсонгүй. Хэрэглэгчээ дахин хайна уу.",
      );
    const existing = await db.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { id: true },
    });
    if (existing)
      throw new StoreEmployeeError(
        409,
        "Энэ хэрэглэгч дэлгүүрт бүртгэлтэй байна. Ажилтны жагсаалтаас эрхийг нь удирдана уу.",
      );
    await requireAvailableSeat(db, organizationId, organization.maxMembers);
    // Link the existing identity. Never write their profile, credentials or other memberships.
    return serializeEmployee(
      await db.organizationMember.create({
        data: {
          userId,
          organizationId,
          role: "STAFF",
          department: "Касс",
          capabilities: ["POS_CASHIER"],
          isActive: true,
        },
        select: employeeSelect,
      }),
    );
  });
}

async function requireStoreEmployee(
  db: Prisma.TransactionClient,
  organizationId: string,
  memberId: string,
) {
  const member = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId, deletedAt: null },
    select: {
      ...employeeSelect,
      user: {
        select: {
          ...employeeSelect.user.select,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  });
  if (!member)
    throw new StoreEmployeeError(404, "Ажилтан энэ дэлгүүрт бүртгэлгүй байна.");
  return member;
}

export async function setStoreEmployeeStatus(
  actorId: string,
  organizationId: string,
  memberId: string,
  isActive: boolean,
) {
  return withMembershipTransaction(async (db) => {
    const organization = await requireStoreOwner(db, actorId, organizationId);
    const member = await requireStoreEmployee(db, organizationId, memberId);
    if (member.role === "OWNER" || member.userId === actorId)
      throw new StoreEmployeeError(
        403,
        "Эзэмшигчийн болон өөрийн эрхийг түр хаах боломжгүй.",
      );
    if (isActive && (!member.user.isActive || member.user.deletedAt))
      throw new StoreEmployeeError(
        409,
        "Хэрэглэгчийн хувийн бүртгэл идэвхгүй байна.",
      );
    if (member.isActive === isActive) return serializeEmployee(member);
    if (isActive)
      await requireAvailableSeat(db, organizationId, organization.maxMembers);
    return serializeEmployee(
      await db.organizationMember.update({
        where: { id: memberId },
        data: { isActive },
        select: employeeSelect,
      }),
    );
  });
}

export async function grantStoreCashierAccess(
  actorId: string,
  organizationId: string,
  memberId: string,
) {
  return withMembershipTransaction(async (db) => {
    await requireStoreOwner(db, actorId, organizationId);
    const member = await requireStoreEmployee(db, organizationId, memberId);
    if (member.role === "OWNER" || member.userId === actorId)
      throw new StoreEmployeeError(
        403,
        "Эзэмшигчийн эрхийг өөрчлөх шаардлагагүй.",
      );
    if (!member.isActive || !member.user.isActive || member.user.deletedAt)
      throw new StoreEmployeeError(
        409,
        "Эхлээд ажилтны болон хувийн бүртгэлийн эрхийг сэргээнэ үү.",
      );
    if (member.capabilities.includes("POS_CASHIER"))
      return serializeEmployee(member);
    return serializeEmployee(
      await db.organizationMember.update({
        where: { id: member.id },
        data: { capabilities: [...member.capabilities, "POS_CASHIER"] },
        select: employeeSelect,
      }),
    );
  });
}
