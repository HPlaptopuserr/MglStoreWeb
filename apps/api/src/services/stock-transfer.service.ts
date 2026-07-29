import { InventoryReason, type Prisma } from "@mgl/database";

export async function transferStockToVendor(
  tx: Prisma.TransactionClient,
  request: { organizationId: string; requestNumber: string },
  items: {
    productId: string;
    approvedQuantity: number | null;
    quantity: number;
  }[],
) {
  for (const item of items) {
    const quantity = item.approvedQuantity || item.quantity;
    if (quantity <= 0) continue;
    const sourceProduct = await tx.product.findUnique({
      where: { id: item.productId },
      include: { images: true },
    });
    if (!sourceProduct) continue;

    const existing = sourceProduct.sku
      ? await tx.product.findFirst({
          where: {
            organizationId: request.organizationId,
            sku: sourceProduct.sku,
            deletedAt: null,
          },
        })
      : null;
    const targetProduct = existing
      ? await tx.product.update({
          where: { id: existing.id },
          data: { stock: { increment: quantity } },
        })
      : await tx.product.create({
          data: {
            organizationId: request.organizationId,
            masterProductId: sourceProduct.masterProductId,
            name: sourceProduct.name,
            description: sourceProduct.description,
            sku: sourceProduct.sku,
            barcode: sourceProduct.barcode,
            unit: sourceProduct.unit,
            price: sourceProduct.price,
            costPrice: sourceProduct.costPrice,
            businessCategoryId: sourceProduct.businessCategoryId,
            categoryId: sourceProduct.categoryId,
            isActive: true,
            stock: quantity,
            images: {
              create: sourceProduct.images.map(({ url }) => ({ url })),
            },
          },
        });

    await tx.inventoryLedger.create({
      data: {
        productId: targetProduct.id,
        change: quantity,
        reason: InventoryReason.TRANSFER_IN,
        note: `Бараа таталт батлагдсан (${request.requestNumber})`,
      },
    });
  }
}
