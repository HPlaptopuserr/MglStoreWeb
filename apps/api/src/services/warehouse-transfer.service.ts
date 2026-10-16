import { prisma, Prisma } from "@mgl/database";
import { adjustStock } from "./inventory.service";
import { canReserveStock } from "./stock-reservation.service";
import { assertWarehouseProductsOwned } from "./warehouse-product-ownership";
import {
  assertTransferCounts,
  parseTransfer,
  parseTransferAcceptance,
  TransferError,
} from "./warehouse-transfer.policy";

export const transferInclude = {
  sourceWarehouse: { select: { id: true, name: true } },
  destinationWarehouse: { select: { id: true, name: true } },
  items: { orderBy: { id: "asc" as const } },
} satisfies Prisma.WarehouseTransferInclude;

async function activeWarehouse(tx: Prisma.TransactionClient, id: string) {
  const warehouse = await tx.warehouse.findFirst({
    where: { id, type: "CENTRAL", isActive: true, deletedAt: null },
  });
  if (!warehouse)
    throw new TransferError("Идэвхтэй админ агуулах олдсонгүй", 404);
  return warehouse;
}
export async function sendWarehouseTransfer(
  input: ReturnType<typeof parseTransfer>,
  actorId: string,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.id}))`;
    const existing = await tx.warehouseTransfer.findUnique({
      where: { id: input.id },
      include: transferInclude,
    });
    if (existing) {
      if (
        existing.sourceWarehouseId !== input.sourceWarehouseId ||
        existing.destinationWarehouseId !== input.destinationWarehouseId ||
        existing.sentById !== actorId ||
        existing.note !== input.note ||
        existing.items.length !== input.items.length ||
        existing.items.some(
          (row) =>
            input.items.find((item) => item.productId === row.sourceProductId)
              ?.quantity !== row.quantity,
        )
      )
        throw new TransferError(
          "Хүсэлтийн дугаар өөр шилжүүлэгт ашиглагдсан байна",
          409,
        );
      return existing;
    }
    await activeWarehouse(tx, input.sourceWarehouseId);
    await activeWarehouse(tx, input.destinationWarehouseId);
    const sorted = [...input.items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    );
    await assertWarehouseProductsOwned(
      tx,
      input.sourceWarehouseId,
      sorted.map((item) => item.productId),
    );
    if (!(await canReserveStock(tx, input.sourceWarehouseId, sorted)))
      throw new TransferError(
        "Шилжүүлэх боломжтой үлдэгдэл хүрэлцэхгүй байна",
        409,
      );
    const products = await tx.product.findMany({
      where: {
        id: { in: sorted.map((item) => item.productId) },
        deletedAt: null,
        isActive: true,
      },
    });
    if (products.length !== sorted.length)
      throw new TransferError("Бараа идэвхгүй эсвэл устсан байна", 409);
    const transfer = await tx.warehouseTransfer.create({
      data: {
        id: input.id,
        sourceWarehouseId: input.sourceWarehouseId,
        destinationWarehouseId: input.destinationWarehouseId,
        sentById: actorId,
        note: input.note,
        items: {
          create: sorted.map((item) => {
            const product = products.find(
              (product) => product.id === item.productId,
            )!;
            return {
              sourceProductId: product.id,
              unitCost: product.price,
              name: product.name,
              sku: product.sku,
              barcode: product.barcode,
              quantity: item.quantity,
            };
          }),
        },
      },
      include: transferInclude,
    });
    for (const item of sorted)
      await adjustStock(tx, {
        productId: item.productId,
        warehouseId: input.sourceWarehouseId,
        change: -item.quantity,
        reason: "TRANSFER_OUT",
        createdById: actorId,
        referenceId: transfer.id,
        referenceType: "WAREHOUSE_TRANSFER",
        note: `Шилжүүлэг → ${transfer.destinationWarehouse.name}`,
      });
    return transfer;
  });
}

export async function matchingTransferProducts(
  tx: Prisma.TransactionClient,
  warehouseId: string,
  source: {
    masterProductId: string | null;
    barcode: string | null;
    sku: string | null;
    barcodeAliases?: string[];
  },
) {
  const identities: Prisma.ProductWhereInput[] = [];
  if (source.masterProductId)
    identities.push({ masterProductId: source.masterProductId });
  const codes = [
    ...new Set(
      [source.barcode, ...(source.barcodeAliases ?? [])].filter(
        (code): code is string => Boolean(code),
      ),
    ),
  ];
  if (codes.length)
    identities.push(
      { barcode: { in: codes } },
      { barcodeAliases: { hasSome: codes } },
    );
  if (source.sku) identities.push({ sku: source.sku });
  if (!identities.length) return [];
  return tx.product.findMany({
    where: {
      organizationId: null,
      managedByWarehouseId: warehouseId,
      deletedAt: null,
      OR: identities,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      price: true,
      isActive: true,
    },
    take: 20,
  });
}

export async function receiveWarehouseTransfer(
  id: string,
  items: ReturnType<typeof parseTransferAcceptance>,
  actorId: string,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "WarehouseTransfer" WHERE "id" = ${id} FOR UPDATE`;
    const transfer = await tx.warehouseTransfer.findUnique({
      where: { id },
      include: {
        ...transferInclude,
        items: {
          include: { sourceProduct: { include: { images: true } } },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!transfer) throw new TransferError("Падаан олдсонгүй", 404);
    assertTransferCounts(transfer.items, items);
    if (transfer.status === "RECEIVED") {
      if (
        transfer.items.some((row) => {
          const input = items.find((item) => item.id === row.id)!;
          return (
            Number(row.salePrice) !== input.salePrice ||
            (input.targetProductId !== null &&
              input.targetProductId !== row.targetProductId)
          );
        })
      )
        throw new TransferError(
          "Падааныг өөр мэдээллээр аль хэдийн хүлээн авсан байна. Түүхийг шалгана уу.",
          409,
        );
      return transfer;
    }
    await activeWarehouse(tx, transfer.destinationWarehouseId);
    // Same catalog lock as barcode registration; prevents two incoming receipts creating duplicate identities.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${transfer.destinationWarehouseId}))`;
    const usedTargets = new Set<string>();
    for (const row of transfer.items) {
      const input = items.find((item) => item.id === row.id)!;
      const source = row.sourceProduct;
      let targetId = input.targetProductId;
      if (targetId) {
        await assertWarehouseProductsOwned(
          tx,
          transfer.destinationWarehouseId,
          [targetId],
        );
        const target = await tx.product.findFirst({
          where: { id: targetId, deletedAt: null, isActive: true },
        });
        if (!target)
          throw new TransferError("Холбох бараа идэвхгүй байна", 409);
      } else {
        const matches = await matchingTransferProducts(
          tx,
          transfer.destinationWarehouseId,
          source,
        );
        if (matches.length)
          throw new TransferError(
            `“${row.name}” бүртгэлтэй байна. Барааг тулгаж сонгоно уу.`,
            409,
          );
        const target = await tx.product.create({
          data: {
            organizationId: null,
            managedByWarehouseId: transfer.destinationWarehouseId,
            masterProductId: source.masterProductId,
            name: row.name,
            sku: row.sku,
            barcode: row.barcode,
            barcodeAliases: source.barcodeAliases,
            unit: source.unit,
            description: source.description,
            businessCategoryId: source.businessCategoryId,
            categoryId: source.categoryId,
            price: input.salePrice,
            costPrice: source.costPrice,
            stock: 0,
            isActive: true,
            images: {
              create: source.images.map((image) => ({ url: image.url })),
            },
          },
        });
        targetId = target.id;
      }
      if (usedTargets.has(targetId))
        throw new TransferError("Хоёр мөр нэг бараатай давхардсан байна", 409);
      usedTargets.add(targetId);
      await tx.product.update({
        where: { id: targetId },
        data: { price: input.salePrice },
      });
      await adjustStock(tx, {
        productId: targetId,
        warehouseId: transfer.destinationWarehouseId,
        change: row.quantity,
        reason: "TRANSFER_IN",
        createdById: actorId,
        referenceId: id,
        referenceType: "WAREHOUSE_TRANSFER",
        note: `Шилжүүлэг ← ${transfer.sourceWarehouse.name}`,
      });
      await tx.warehouseTransferItem.update({
        where: { id: row.id },
        data: { targetProductId: targetId, salePrice: input.salePrice },
      });
    }
    return tx.warehouseTransfer.update({
      where: { id },
      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
        receivedById: actorId,
      },
      include: transferInclude,
    });
  });
}
