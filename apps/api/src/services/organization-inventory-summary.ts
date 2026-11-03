import { prisma } from "@mgl/database";
import {
  SELF_SERVICE_TAKEAWAY_PACKAGING_SKU,
  fromPosStoredStockQuantity,
  normalizePosMeasureUnit,
} from "@mgl/types";

/** Store-scoped aggregates; never derive global counters from a paginated list. */
export async function readOrganizationInventorySummary(organizationId: string) {
  const where = {
    organizationId,
    managedByWarehouseId: null,
    deletedAt: null,
    OR: [{ sku: null }, { sku: { not: SELF_SERVICE_TAKEAWAY_PACKAGING_SKU } }],
    organization: { deletedAt: null, status: "ACTIVE" as const },
  };
  const [total, lowStock, soldOut, units, groups] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.count({
      where: {
        ...where,
        supplyType: { not: "CHINA_PREORDER" },
        AND: [
          {
            OR: [
              { unit: "kg", stock: { gt: 0, lte: 5000 } },
              { unit: null, stock: { gt: 0, lte: 5 } },
              { unit: { not: "kg" }, stock: { gt: 0, lte: 5 } },
            ],
          },
        ],
      },
    }),
    prisma.product.count({
      where: {
        ...where,
        supplyType: { not: "CHINA_PREORDER" },
        stock: { lte: 0 },
      },
    }),
    prisma.product.groupBy({
      by: ["unit"],
      where: { ...where, supplyType: { not: "CHINA_PREORDER" } },
      _sum: { stock: true },
    }),
    prisma.product.groupBy({
      by: ["businessCategoryId"],
      where,
      _count: { _all: true },
    }),
  ]);
  const categories = await prisma.businessCategory.findMany({
    where: {
      id: {
        in: groups.flatMap((group) =>
          group.businessCategoryId ? [group.businessCategoryId] : [],
        ),
      },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const quantities = new Map<string, number>();
  for (const group of units) {
    const unit = normalizePosMeasureUnit(group.unit);
    quantities.set(
      unit,
      (quantities.get(unit) ?? 0) +
        fromPosStoredStockQuantity(group._sum.stock ?? 0, unit),
    );
  }
  return {
    total,
    lowStock,
    soldOut,
    stockByUnit: Array.from(quantities, ([unit, quantity]) => ({
      unit,
      quantity,
    })),
    categories: categories.map((category) => ({
      ...category,
      count:
        groups.find((group) => group.businessCategoryId === category.id)?._count
          ._all ?? 0,
    })),
  };
}
