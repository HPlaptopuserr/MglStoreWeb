import { randomUUID } from "node:crypto";
import { prisma, Prisma, InventoryReason } from "@mgl/database";
import type {
  WarehouseDispatchDocument,
  WarehouseDispatchHistory,
} from "@mgl/types";
import type { WarehouseActor } from "./warehouse-access.service";
import { assertWarehouseViewerManagement } from "./warehouse-viewer-access.service";
import { assertWarehouseProductsOwned } from "./warehouse-product-ownership";
import { syncProductStock } from "./inventory.service";
import { canReserveStock } from "./stock-reservation.service";
import {
  ManualDispatchError,
  parseDispatchHistoryQuery,
  parseManualDispatch,
} from "./warehouse-manual-dispatch.policy";

const documentInclude = {
  warehouse: { select: { id: true, name: true, address: true } },
  createdBy: {
    select: { email: true, profile: { select: { fullName: true } } },
  },
  items: {
    orderBy: { id: "asc" },
    include: { product: { select: { name: true, sku: true } } },
  },
} satisfies Prisma.WarehouseManualDispatchInclude;
type DispatchRecord = Prisma.WarehouseManualDispatchGetPayload<{
  include: typeof documentInclude;
}>;
type Actor = WarehouseActor & { userId: string };

function serialize(record: DispatchRecord): WarehouseDispatchDocument {
  const hasPrices = record.items.every((item) => item.unitPrice !== null);
  const total = record.items.reduce(
    (sum, item) => sum.plus(item.unitPrice?.times(item.quantity) ?? 0),
    new Prisma.Decimal(0),
  );
  return {
    id: record.id,
    dispatchNumber: record.dispatchNumber,
    storeName: record.storeName,
    recipientName: record.recipientName,
    recipientPhone: record.recipientPhone,
    address: record.address,
    lat: record.lat,
    lng: record.lng,
    reason: record.reason,
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    createdByName: record.createdBy.profile?.fullName || record.createdBy.email,
    warehouse: record.warehouse,
    totalQuantity: record.items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: hasPrices ? total.toFixed(2) : null,
    items: record.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.productName ?? item.product.name,
      sku: item.productName !== null ? item.productSku : item.product.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice?.toFixed(2) ?? null,
      totalAmount: item.unitPrice?.times(item.quantity).toFixed(2) ?? null,
    })),
  };
}

export async function createManualDispatch(
  actor: Actor,
  warehouseId: string,
  body: unknown,
) {
  await assertWarehouseViewerManagement(actor, warehouseId);
  const input = parseManualDispatch(body);
  return prisma.$transaction(
    async (tx) => {
      if (input.requestId) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`manual-dispatch:${input.requestId}`}, 0))`;
        const existing = await tx.warehouseManualDispatch.findUnique({
          where: { requestId: input.requestId },
          include: documentInclude,
        });
        if (existing) {
          const sameFields = (
            [
              "storeName",
              "recipientName",
              "recipientPhone",
              "address",
              "lat",
              "lng",
              "reason",
              "note",
            ] as const
          ).every((key) => existing[key] === input[key]);
          const sameItems =
            existing.items.length === input.items.length &&
            input.items.every((item) =>
              existing.items.some(
                (saved) =>
                  saved.productId === item.productId &&
                  saved.quantity === item.quantity,
              ),
            );
          if (
            existing.warehouseId !== warehouseId ||
            existing.createdById !== actor.userId ||
            !sameFields ||
            !sameItems
          )
            throw new ManualDispatchError(
              "Энэ хүсэлт өмнө нь өөр паданд ашиглагдсан байна.",
              409,
            );
          return serialize(existing);
        }
      }
      await assertWarehouseProductsOwned(
        tx,
        warehouseId,
        input.items.map((item) => item.productId),
      );
      const products = await tx.product.findMany({
        where: {
          id: { in: input.items.map((item) => item.productId) },
          deletedAt: null,
          isActive: true,
        },
        select: { id: true, name: true, sku: true, price: true },
      });
      const byId = new Map(products.map((product) => [product.id, product]));
      if (products.length !== input.items.length)
        throw new ManualDispatchError(
          "Зарим бараа идэвхгүй эсвэл олдсонгүй.",
          409,
        );
      const lines = input.items.map((item) => {
        const product = byId.get(item.productId)!;
        const unitPrice = new Prisma.Decimal(product.price.toString());
        if (!unitPrice.isFinite() || unitPrice.lessThanOrEqualTo(0))
          throw new ManualDispatchError(
            `${product.name} барааны үнийг тохируулна уу.`,
          );
        return {
          ...item,
          productName: product.name,
          productSku: product.sku,
          unitPrice,
        };
      });
      const { items: dispatchItems, ...destination } = input;
      if (!(await canReserveStock(tx, warehouseId, dispatchItems)))
        throw new ManualDispatchError(
          "Захиалгад нөөцөлсөн барааг хассан боломжит үлдэгдэл хүрэлцэхгүй байна.",
          409,
        );
      const created = await tx.warehouseManualDispatch.create({
        data: {
          ...destination,
          warehouseId,
          createdById: actor.userId,
          dispatchNumber: `WD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
          items: { create: lines },
        },
        include: documentInclude,
      });
      for (const item of dispatchItems) {
        const result = await tx.warehouseInventory.updateMany({
          where: {
            warehouseId,
            productId: item.productId,
            quantity: { gte: item.quantity },
          },
          data: { quantity: { decrement: item.quantity } },
        });
        if (result.count !== 1)
          throw new ManualDispatchError(
            "Нэг буюу хэд хэдэн барааны үлдэгдэл хүрэлцэхгүй байна.",
            409,
            item.productId,
          );
        await tx.inventoryLedger.create({
          data: {
            productId: item.productId,
            warehouseId,
            change: -item.quantity,
            reason: InventoryReason.MANUAL_ADJUST,
            note: `${created.dispatchNumber} · ${input.storeName}${input.address ? ` · ${input.address}` : ""}`,
            createdById: actor.userId,
            referenceId: created.id,
            referenceType: "WAREHOUSE_MANUAL_DISPATCH",
          },
        });
        await syncProductStock(tx, item.productId);
      }
      return serialize(created);
    },
    { timeout: 30000, maxWait: 10000 },
  );
}

export async function listManualDispatches(
  actor: Actor,
  warehouseId: string,
  query: Record<string, unknown>,
): Promise<WarehouseDispatchHistory> {
  await assertWarehouseViewerManagement(actor, warehouseId);
  const { page, pageSize, search } = parseDispatchHistoryQuery(query);
  const contains = { contains: search, mode: "insensitive" as const };
  const where: Prisma.WarehouseManualDispatchWhereInput = {
    warehouseId,
    ...(search
      ? {
          OR: [
            { dispatchNumber: contains },
            { storeName: contains },
            { recipientName: contains },
            { recipientPhone: contains },
            { address: contains },
          ],
        }
      : {}),
  };
  return prisma.$transaction(
    async (tx) => {
      const [total, records] = await Promise.all([
        tx.warehouseManualDispatch.count({ where }),
        tx.warehouseManualDispatch.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: documentInclude,
        }),
      ]);
      return {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        items: records.map(serialize),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

export async function getManualDispatch(
  actor: Actor,
  warehouseId: string,
  id: string,
) {
  await assertWarehouseViewerManagement(actor, warehouseId);
  const record = await prisma.warehouseManualDispatch.findFirst({
    where: { id, warehouseId },
    include: documentInclude,
  });
  if (!record) throw new ManualDispatchError("Падан олдсонгүй.", 404);
  return serialize(record);
}
