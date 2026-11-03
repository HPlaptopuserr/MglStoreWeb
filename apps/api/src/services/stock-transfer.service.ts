import { InventoryReason, type Prisma } from "@mgl/database";
import type { Product } from "@prisma/client";
import { adjustStock, resolveOrgWarehouse } from "./inventory.service";

export class StockTransferConflictError extends Error {}

const transferReferenceType = "STOCK_REQUEST_TRANSFER";
const transferReference = (requestNumber: string, productId: string) =>
  `${requestNumber}:${productId}`;

/** Match identity, never an arbitrary first product with a missing SKU. */
export async function findVendorTransferProduct(
  tx: Prisma.TransactionClient,
  organizationId: string,
  source: Pick<
    Product,
    "id" | "sku" | "barcode" | "barcodeAliases" | "masterProductId" | "unit"
  >,
  requestNumber?: string,
): Promise<Product | null> {
  if (requestNumber) {
    const received = await tx.inventoryLedger.findFirst({
      where: {
        referenceType: transferReferenceType,
        referenceId: transferReference(requestNumber, source.id),
        product: { organizationId },
      },
      select: { product: true },
    });
    if (received) {
      if (
        received.product.deletedAt ||
        received.product.id === source.id ||
        received.product.unit !== source.unit
      ) {
        throw new StockTransferConflictError(
          "Хүлээн авсан дэлгүүрийн бараа устгагдсан эсвэл нэгж нь өөрчлөгдсөн байна",
        );
      }
      return received.product;
    }
  }
  const barcodes = [source.barcode, ...source.barcodeAliases].filter(
    (barcode): barcode is string => Boolean(barcode?.trim()),
  );
  const identities: Prisma.ProductWhereInput[] = [
    { sku: source.sku?.trim() || `transfer-${source.id}` },
    ...(barcodes.length
      ? [
          { barcode: { in: barcodes } },
          { barcodeAliases: { hasSome: barcodes } },
        ]
      : []),
    ...(source.masterProductId
      ? [{ masterProductId: source.masterProductId }]
      : []),
  ];
  const candidates = await tx.product.findMany({
    where: { organizationId, deletedAt: null, OR: identities },
    take: 2,
  });
  if (candidates.length > 1) {
    throw new StockTransferConflictError(
      "Дэлгүүрт ижил кодтой олон бараа байна. Барааны холбоосыг тулгана уу.",
    );
  }
  const product = candidates[0] ?? null;
  if (
    !product &&
    (await tx.product.findFirst({
      where: { organizationId, deletedAt: { not: null }, OR: identities },
      select: { id: true },
    }))
  ) {
    throw new StockTransferConflictError(
      "Ижил кодтой дэлгүүрийн бараа устгагдсан байна. Бүртгэлийг тулгана уу.",
    );
  }
  if (product && (product.id === source.id || product.unit !== source.unit)) {
    throw new StockTransferConflictError(
      "Дэлгүүр болон агуулахын барааны холбоос, нэгж зөрүүтэй байна",
    );
  }
  return product;
}

export async function transferStockToVendor(
  tx: Prisma.TransactionClient,
  request: { organizationId: string; requestNumber: string },
  items: {
    productId: string;
    approvedQuantity: number | null;
    quantity: number;
  }[],
): Promise<void> {
  // Serializes identity matching/creation and receipt retries for this store.
  await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${request.organizationId} FOR UPDATE`;
  for (const item of items) {
    const quantity = item.approvedQuantity ?? item.quantity;
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new StockTransferConflictError("Шилжүүлэх барааны тоо буруу байна");
    }
    if (quantity === 0) continue;
    const referenceId = transferReference(
      request.requestNumber,
      item.productId,
    );
    const previous = await tx.inventoryLedger.findFirst({
      where: {
        referenceType: transferReferenceType,
        referenceId,
        product: { organizationId: request.organizationId },
      },
      select: { change: true },
    });
    if (previous) {
      if (previous.change !== quantity)
        throw new StockTransferConflictError(
          "Энэ таталтын бүртгэсэн тоо өөрчлөгдсөн байна",
        );
      continue;
    }
    const sourceProduct = await tx.product.findUnique({
      where: { id: item.productId, deletedAt: null },
      include: { images: true },
    });
    if (!sourceProduct)
      throw new StockTransferConflictError("Илгээх бараа олдсонгүй");
    const existing = await findVendorTransferProduct(
      tx,
      request.organizationId,
      sourceProduct,
    );
    // Existing store prices, costs and product details belong to that store.
    const targetProduct =
      existing ??
      (await tx.product.create({
        data: {
          organizationId: request.organizationId,
          masterProductId: sourceProduct.masterProductId,
          name: sourceProduct.name,
          description: sourceProduct.description,
          sku: sourceProduct.sku?.trim() || `transfer-${sourceProduct.id}`,
          barcode: sourceProduct.barcode,
          barcodeAliases: sourceProduct.barcodeAliases,
          unit: sourceProduct.unit,
          price: sourceProduct.price,
          costPrice: sourceProduct.costPrice,
          businessCategoryId: sourceProduct.businessCategoryId,
          categoryId: sourceProduct.categoryId,
          isActive: true,
          stock: 0,
          images: { create: sourceProduct.images.map(({ url }) => ({ url })) },
        },
      }));
    const warehouseId = await resolveOrgWarehouse(
      tx,
      request.organizationId,
      targetProduct.id,
    );
    if (!warehouseId)
      throw new StockTransferConflictError(
        "Дэлгүүрийн үндсэн агуулах олдсонгүй",
      );
    await adjustStock(tx, {
      productId: targetProduct.id,
      warehouseId,
      change: quantity,
      reason: InventoryReason.TRANSFER_IN,
      note: `Бараа таталт батлагдсан (${request.requestNumber})`,
      referenceType: transferReferenceType,
      referenceId,
    });
  }
}
