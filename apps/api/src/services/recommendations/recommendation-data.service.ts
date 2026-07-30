import { Prisma, prisma } from "@mgl/database";
import type { RecommendationCandidate } from "./recommendation.types";

interface NetworkDemandRow {
  productId: string;
  requestedQuantity: bigint;
  requestCount: bigint;
  organizationCount: bigint;
}

function safeNumber(value: bigint | number | null | undefined) {
  const normalized = Number(value || 0);
  return Number.isFinite(normalized) ? Math.max(0, normalized) : 0;
}

export async function collectRecommendationCandidates({
  organizationId,
  warehouseId,
}: {
  organizationId: string;
  warehouseId: string;
}): Promise<RecommendationCandidate[]> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const inventory = await prisma.warehouseInventory.findMany({
    where: {
      warehouseId,
      quantity: { gt: 0 },
      product: { isActive: true, deletedAt: null },
    },
    select: {
      id: true,
      productId: true,
      quantity: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          images: { take: 1, select: { url: true } },
          category: { select: { id: true, name: true } },
          businessCategory: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (inventory.length === 0) return [];

  const productIds = inventory.map((item) => item.productId);
  const [personalDemand, organizationInventory, networkDemand] =
    await Promise.all([
      prisma.warehouseStockRequestItem.groupBy({
        by: ["productId"],
        where: {
          productId: { in: productIds },
          request: {
            organizationId,
            warehouseId,
            requestedAt: { gte: since },
            status: { notIn: ["CANCELLED", "REJECTED"] },
          },
        },
        _sum: { quantity: true },
        _count: { _all: true },
      }),
      prisma.warehouseInventory.groupBy({
        by: ["productId"],
        where: {
          productId: { in: productIds },
          warehouse: {
            type: "VENDOR_INTERNAL",
            organizations: { some: { organizationId } },
          },
        },
        _sum: { quantity: true },
      }),
      prisma.$queryRaw<NetworkDemandRow[]>(Prisma.sql`
        SELECT
          item."productId" AS "productId",
          COALESCE(SUM(item."quantity"), 0)::bigint AS "requestedQuantity",
          COUNT(DISTINCT item."requestId")::bigint AS "requestCount",
          COUNT(DISTINCT request."organizationId")::bigint AS "organizationCount"
        FROM "WarehouseStockRequestItem" item
        INNER JOIN "WarehouseStockRequest" request
          ON request."id" = item."requestId"
        WHERE request."warehouseId" = ${warehouseId}
          AND request."requestedAt" >= ${since}
          AND request."status" NOT IN ('CANCELLED', 'REJECTED')
          AND item."productId" IN (${Prisma.join(productIds)})
        GROUP BY item."productId"
      `),
    ]);

  const personalByProduct = new Map(
    personalDemand.map((item) => [
      item.productId,
      {
        quantity: item._sum.quantity || 0,
        count: item._count._all,
      },
    ]),
  );
  const stockByProduct = new Map(
    organizationInventory.map((item) => [
      item.productId,
      item._sum.quantity || 0,
    ]),
  );
  const networkByProduct = new Map(
    networkDemand.map((item) => [item.productId, item]),
  );

  return inventory.map((item) => {
    const personal = personalByProduct.get(item.productId);
    const network = networkByProduct.get(item.productId);
    return {
      inventoryId: item.id,
      productId: item.productId,
      product: {
        ...item.product,
        price: item.product.price.toString(),
      },
      features: {
        availableStock: item.quantity,
        organizationStock: stockByProduct.get(item.productId) || 0,
        personalRequestedQuantity90d: personal?.quantity || 0,
        personalRequestCount90d: personal?.count || 0,
        networkRequestedQuantity90d: safeNumber(network?.requestedQuantity),
        networkRequestCount90d: safeNumber(network?.requestCount),
        networkOrganizationCount90d: safeNumber(network?.organizationCount),
      },
    };
  });
}
