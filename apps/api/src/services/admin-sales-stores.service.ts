import { Prisma, prisma } from "@mgl/database";

export function salesStoresQuery(
  query: Record<string, unknown>,
  now = new Date(),
) {
  const search =
    typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const pageValue = Number(query.page ?? 1);
  const page =
    Number.isSafeInteger(pageValue) && pageValue > 0
      ? Math.min(pageValue, 100000)
      : 1;
  const days =
    query.days === "all"
      ? null
      : [7, 30, 90].includes(Number(query.days))
        ? Number(query.days)
        : 30;
  const where: Prisma.SalesVisitLocationWhereInput = {
    vendorOrganization: { is: { deletedAt: null } },
    organization: { deletedAt: null },
    ...(days !== null && {
      createdAt: { gte: new Date(now.getTime() - days * 86400000) },
    }),
    ...(query.status === "active" && { isActive: true }),
    ...(query.status === "inactive" && { isActive: false }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { contactPhone: { contains: search } },
        {
          assignments: {
            some: {
              member: {
                user: {
                  profile: {
                    is: { fullName: { contains: search, mode: "insensitive" } },
                  },
                },
              },
            },
          },
        },
      ],
    }),
  };
  return { page, pageSize: 12, where };
}

export const adminSalesStoreSelect = {
  id: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  contactName: true,
  contactPhone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  organization: { select: { name: true } },
  vendorOrganization: {
    select: {
      id: true,
      name: true,
      taxId: true,
      email: true,
      phone: true,
      businessCategory: true,
      status: true,
      isVerified: true,
    },
  },
  assignments: {
    orderBy: { createdAt: "asc" },
    select: {
      member: {
        select: {
          id: true,
          isActive: true,
          user: { select: { profile: { select: { fullName: true } } } },
        },
      },
    },
  },
  _count: { select: { visits: true } },
} satisfies Prisma.SalesVisitLocationSelect;

export async function listAdminSalesStores(query: Record<string, unknown>) {
  const { page, pageSize, where } = salesStoresQuery(query);
  const [total, items] = await prisma.$transaction(
    [
      prisma.salesVisitLocation.count({ where }),
      prisma.salesVisitLocation.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: adminSalesStoreSelect,
      }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  return {
    page,
    pageSize,
    total,
    items: items.map(({ assignments, _count, ...item }) => ({
      ...item,
      representatives: assignments.map(({ member }) => ({
        id: member.id,
        name: member.user.profile?.fullName || "Нэр бүртгэгдээгүй",
        isActive: member.isActive,
      })),
      visitCount: _count.visits,
    })),
  };
}

export function salesStoreSummaryFilters(query: Record<string, unknown>) {
  const all = salesStoresQuery({ days: "all" }).where;
  return {
    all,
    active: { ...all, isActive: true },
    registered: salesStoresQuery({ days: query.days }).where,
  };
}
export async function getAdminSalesStoreSummary(
  query: Record<string, unknown>,
) {
  const filters = salesStoreSummaryFilters(query);
  const [total, active, registered] = await prisma.$transaction(
    [
      prisma.salesVisitLocation.count({ where: filters.all }),
      prisma.salesVisitLocation.count({ where: filters.active }),
      prisma.salesVisitLocation.count({ where: filters.registered }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  return { total, active, registered };
}
