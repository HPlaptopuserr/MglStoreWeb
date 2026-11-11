import { normalizePosMeasureUnit, toPosStoredStockQuantity } from "@mgl/types";
import type { ReceiptLine } from "./receipt-types";

export function receiptItemPayload(
  line: ReceiptLine,
  canManageProducts: boolean,
) {
  const isCatalogProduct = line.product.id.startsWith("catalog:");
  if (!canManageProducts && isCatalogProduct) {
    throw new Error("Зөвхөн дэлгүүрийн бүртгэлтэй барааг хүлээн авна.");
  }

  return {
    ...(isCatalogProduct
      ? { masterProductId: line.product.masterProductId }
      : { productId: line.product.id }),
    ...(canManageProducts && !isCatalogProduct
      ? {
          productSnapshot: {
            name: line.product.name,
            barcode: line.product.barcode ?? null,
            unit: normalizePosMeasureUnit(line.product.unit),
            ...(line.product.price != null
              ? { price: Number(line.product.price) }
              : {}),
          },
        }
      : {}),
    ...(canManageProducts && line.salePrice.trim()
      ? { salePrice: Number(line.salePrice) }
      : {}),
    quantity: toPosStoredStockQuantity(line.quantity, line.product.unit),
    unitCost: Number(line.unitCost),
    batchNumber: line.batchNumber.trim() || undefined,
    expiryDate: line.expiryDate || undefined,
  };
}
