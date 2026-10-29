import { prisma, Prisma } from "@mgl/database";
import {
  fromPosStoredStockQuantity,
  type WarehouseInvestorReport,
  type WarehouseInvestorSale,
  type WarehouseViewerSession,
} from "@mgl/types";
import {
  hasPlatformWarehouseAccess,
  hasWarehouseAccess,
  type WarehouseActor,
} from "./warehouse-access.service";
import {
  WarehouseViewerError,
  parseViewerReportQuery,
} from "./warehouse-viewer.policy";

export async function assertActiveWarehouseViewerActor(actor: WarehouseActor) {
  if (
    !actor.userId ||
    !(await prisma.user.findFirst({
      where: { id: actor.userId, isActive: true, deletedAt: null },
      select: { id: true },
    }))
  )
    throw new WarehouseViewerError("Нэвтрэх эрх идэвхгүй байна.", 403);
}

export async function warehouseViewerSession(actor: WarehouseActor): Promise<WarehouseViewerSession> {
  await assertActiveWarehouseViewerActor(actor);
  const platform = hasPlatformWarehouseAccess(actor.role);
  const warehouses = await prisma.warehouse.findMany({
    where: {
      type: "CENTRAL",
      isActive: true,
      deletedAt: null,
      ...(!platform
        ? {
            OR: [
              {
                setupTokens: {
                  some: { userId: actor.userId, usedAt: { not: null } },
                },
              },
              { viewers: { some: { userId: actor.userId } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      address: true,
      setupTokens: {
        where: { userId: actor.userId, usedAt: { not: null } },
        select: { id: true },
        take: 1,
      },
      organizations: {
        select: { organization: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
  return {
    viewerOnly:
      !platform &&
      !warehouses.some((warehouse) => warehouse.setupTokens.length > 0),
    warehouses: warehouses.map(
      ({ setupTokens, organizations, ...warehouse }) => ({
        ...warehouse,
        accessMode: platform || setupTokens.length ? "OPERATOR" : "VIEWER",
        organizations: organizations.map(({ organization }) => organization),
      }),
    ),
  };
}

export async function assertWarehouseReportAccess(
  actor: WarehouseActor,
  warehouseId: string,
) {
  await assertActiveWarehouseViewerActor(actor);
  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id: warehouseId,
      type: "CENTRAL",
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, name: true, address: true },
  });
  if (!warehouse)
    throw new WarehouseViewerError(
      "Дэлгүүр олдсонгүй эсвэл хандах эрхгүй байна.",
      403,
    );
  const assignment = await prisma.warehouseViewer.findUnique({
    where: { warehouseId_userId: { warehouseId, userId: actor.userId! } },
    select: { id: true },
  });
  if (!assignment && !(await hasWarehouseAccess(actor, warehouseId)))
    throw new WarehouseViewerError(
      "Энэ дэлгүүрийн тайланг харах эрхгүй байна.",
      403,
    );
  return warehouse;
}

// Each channel has its own invoice identifier. Costs are immutable snapshots;
// NULL intentionally represents old/unknown costs, never a fabricated zero.
function salesQuery(warehouseId: string, from: Date | null, to: Date | null) {
  return Prisma.sql`WITH sales AS (
    SELECT o.id, o."orderNumber" AS number, 'RETAIL'::text AS channel, coalesce(o."paidAt", o."createdAt") AS "paidAt",
      o.total AS revenue,
      CASE WHEN count(*) FILTER (WHERE i."costPrice" IS NULL) > 0 THEN NULL
        ELSE sum(i."costPrice" * i.quantity) END AS cost,
      string_agg(i."productName" || ' × ' || i.quantity::text, ', ' ORDER BY i.id) AS products
    FROM "WarehouseRetailOrder" o JOIN "WarehouseRetailOrderItem" i ON i."orderId" = o.id
    WHERE o."warehouseId" = ${warehouseId} AND o."paymentStatus" = 'PAID'
      AND o.status <> 'CANCELLED' AND o."fulfillmentIssue" IS NULL
    GROUP BY o.id
    UNION ALL
    SELECT p.id, p."invoiceNumber", 'WHOLESALE'::text, coalesce(p."paidAt", p."confirmedAt", p."updatedAt"),
      p."totalAmount", p."costAmount",
      string_agg(product.name || ' × ' || (coalesce(i."approvedQuantity", i.quantity) / CASE WHEN lower(trim(product.unit)) IN ('kg', 'кг', 'kilogram', 'kilograms') THEN 1000.0 ELSE 1 END)::numeric::text || ' ' || coalesce(product.unit, 'ш'), ', ' ORDER BY i.id)
    FROM "StockRequestPayment" p
      JOIN "WarehouseStockRequest" r ON r.id = p."requestId"
      JOIN "WarehouseStockRequestItem" i ON i."requestId" = r.id
      JOIN "Product" product ON product.id = i."productId"
    WHERE r."warehouseId" = ${warehouseId} AND p.status = 'PAID'
      AND r.status NOT IN ('CANCELLED', 'REJECTED')
    GROUP BY p.id
  ), filtered AS (
    SELECT * FROM sales WHERE true
      ${from ? Prisma.sql`AND "paidAt" >= ${from.toISOString()}::timestamp` : Prisma.empty}
      ${to ? Prisma.sql`AND "paidAt" <= ${to.toISOString()}::timestamp` : Prisma.empty}
  )`;
}

export async function getWarehouseInvestorReport(
  actor: WarehouseActor,
  warehouseId: string,
  query: Record<string, unknown>,
): Promise<WarehouseInvestorReport> {
  const warehouse = await assertWarehouseReportAccess(actor, warehouseId);
  const { from, to, productPage, salesPage, limit } =
    parseViewerReportQuery(query);
  const productWhere: Prisma.ProductWhereInput = {
    managedByWarehouseId: warehouseId,
    organizationId: null,
    deletedAt: null,
  };
  const sales = salesQuery(warehouseId, from, to);
  // A repeatable-read snapshot keeps summaries and paginated rows consistent.
  return prisma.$transaction(
    async (tx) => {
      const [products, inventoryRows, saleSummary, history] = await Promise.all(
        [
          tx.product.findMany({
            where: productWhere,
            orderBy: [{ name: "asc" }, { id: "asc" }],
            skip: (productPage - 1) * limit,
            take: limit,
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              price: true,
              costPrice: true,
              warehouseInventories: {
                where: { warehouseId },
                select: { quantity: true },
              },
            },
          }),
          tx.$queryRaw<Array<WarehouseInvestorReport["inventory"]>>`SELECT
        count(*)::int AS "productCount",
        count(*) FILTER (WHERE coalesce(i.quantity, 0) > 0)::int AS "inStockCount",
        coalesce(sum(p."costPrice" * coalesce(i.quantity, 0) / CASE WHEN lower(trim(p.unit)) IN ('kg', 'кг', 'kilogram', 'kilograms') THEN 1000.0 ELSE 1 END), 0)::float8 AS "stockCost",
        coalesce(sum(p.price * coalesce(i.quantity, 0) / CASE WHEN lower(trim(p.unit)) IN ('kg', 'кг', 'kilogram', 'kilograms') THEN 1000.0 ELSE 1 END), 0)::float8 AS "stockValue",
        count(*) FILTER (WHERE p."costPrice" IS NULL AND coalesce(i.quantity, 0) > 0)::int AS "missingCostCount"
        FROM "Product" p LEFT JOIN "WarehouseInventory" i ON i."productId" = p.id AND i."warehouseId" = ${warehouseId}
        WHERE p."managedByWarehouseId" = ${warehouseId} AND p."organizationId" IS NULL AND p."deletedAt" IS NULL`,
          tx.$queryRaw<
            Array<WarehouseInvestorReport["sales"]>
          >(Prisma.sql`${sales} SELECT
        count(*)::int AS "orderCount", coalesce(sum(revenue), 0)::float8 AS revenue,
        coalesce(sum(cost), 0)::float8 AS cost,
        CASE WHEN count(*) FILTER (WHERE cost IS NULL) > 0 THEN NULL ELSE coalesce(sum(revenue - cost), 0)::float8 END AS "grossProfit",
        count(*) FILTER (WHERE cost IS NULL)::int AS "missingCostCount" FROM filtered`),
          tx.$queryRaw<
            Array<Omit<WarehouseInvestorSale, "paidAt"> & { paidAt: Date }>
          >(Prisma.sql`${sales} SELECT id, number, channel, "paidAt",
        revenue::float8, cost::float8, (revenue - cost)::float8 AS "grossProfit", products
        FROM filtered ORDER BY "paidAt" DESC, id DESC LIMIT ${limit} OFFSET ${(salesPage - 1) * limit}`),
        ],
      );
      return {
        warehouse,
        inventory: inventoryRows[0],
        sales: saleSummary[0],
        products: {
          total: inventoryRows[0].productCount,
          items: products.map(({ warehouseInventories, ...product }) => {
            const quantity = fromPosStoredStockQuantity(
              warehouseInventories[0]?.quantity ?? 0,
              product.unit,
            );
            const costPrice =
              product.costPrice === null ? null : Number(product.costPrice);
            return {
              ...product,
              price: Number(product.price),
              costPrice,
              quantity,
              stockCost: costPrice === null ? null : quantity * costPrice,
            };
          }),
        },
        history: {
          items: history.map((sale) => ({
            ...sale,
            paidAt: sale.paidAt.toISOString(),
          })),
          total: saleSummary[0].orderCount,
        },
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
