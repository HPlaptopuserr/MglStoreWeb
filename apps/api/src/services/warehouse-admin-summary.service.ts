import { prisma } from "@mgl/database";

interface WarehouseCategorySummaryRow {
  categoryName: string;
  productCount: number;
  totalQuantity: number;
}

interface WarehouseStockSummaryRow {
  totalProducts: number;
  totalQuantity: number;
  normalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
}

const emptyStockSummary: WarehouseStockSummaryRow = {
  totalProducts: 0,
  totalQuantity: 0,
  normalItems: 0,
  lowStockItems: 0,
  outOfStockItems: 0,
};

export async function getWarehouseAdminSummary(id: string) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, deletedAt: null },
    include: {
      organizations: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true } },
        },
      },
      setupTokens: {
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          expiresAt: true,
          usedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              registerNumber: true,
              isActive: true,
              lastLoginAt: true,
              profile: {
                select: { fullName: true, phoneNumber: true, avatarUrl: true },
              },
            },
          },
        },
      },
    },
  });
  if (!warehouse) return null;

  const [stockRows, categories] = await Promise.all([
    prisma.$queryRaw<WarehouseStockSummaryRow[]>`
      SELECT COUNT(*)::int AS "totalProducts", COALESCE(SUM(wi."quantity"), 0)::int AS "totalQuantity",
        COUNT(*) FILTER (WHERE wi."quantity" > wi."minQuantity")::int AS "normalItems",
        COUNT(*) FILTER (WHERE wi."quantity" > 0 AND wi."quantity" <= wi."minQuantity")::int AS "lowStockItems",
        COUNT(*) FILTER (WHERE wi."quantity" = 0)::int AS "outOfStockItems"
      FROM "WarehouseInventory" wi WHERE wi."warehouseId" = ${id}
    `,
    prisma.$queryRaw<WarehouseCategorySummaryRow[]>`
      SELECT COALESCE(bc."name", c."name", 'Ангилалгүй') AS "categoryName", COUNT(*)::int AS "productCount", COALESCE(SUM(wi."quantity"), 0)::int AS "totalQuantity"
      FROM "WarehouseInventory" wi INNER JOIN "Product" p ON p."id" = wi."productId"
      LEFT JOIN "BusinessCategory" bc ON bc."id" = p."businessCategoryId" LEFT JOIN "Category" c ON c."id" = p."categoryId"
      WHERE wi."warehouseId" = ${id} GROUP BY COALESCE(bc."name", c."name", 'Ангилалгүй')
      ORDER BY "productCount" DESC, "categoryName" ASC
    `,
  ]);

  const employeesById = new Map<string, object>();
  for (const token of warehouse.setupTokens) {
    if (employeesById.has(token.user.id)) continue;
    employeesById.set(token.user.id, {
      id: token.user.id,
      fullName: token.user.profile?.fullName || "Нэр оруулаагүй",
      email: token.user.email,
      phoneNumber: token.user.profile?.phoneNumber || null,
      avatarUrl: token.user.profile?.avatarUrl || null,
      operatorId: token.user.registerNumber || null,
      isActive: token.user.isActive,
      lastLoginAt: token.user.lastLoginAt,
      assignedAt: token.createdAt,
      setupCompletedAt: token.usedAt,
      setupExpiresAt: token.expiresAt,
    });
  }

  const stock = stockRows[0] ?? emptyStockSummary;
  const { setupTokens: _setupTokens, ...warehouseDetail } = warehouse;
  return {
    ...warehouseDetail,
    organizations: warehouse.organizations.map(
      ({ organization }) => organization,
    ),
    responsibleEmployees: Array.from(employeesById.values()),
    summary: {
      ...stock,
      categoryCount: categories.length,
      capacityUsed:
        warehouse.capacity > 0
          ? Math.round((stock.totalQuantity / warehouse.capacity) * 100)
          : 0,
    },
    categories,
  };
}
