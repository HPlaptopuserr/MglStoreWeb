import crypto from "node:crypto";
import type { Prisma } from "@mgl/database";
import { normalizePosMeasureUnit } from "@mgl/types";
import type { PosGoodsReceiptLine } from "../routes/operations/pos/goods-receipt";
import { vendorProductReadScope } from "./warehouse-product-scope";

export class ReceiptProductRecoveryError extends Error {}

/** Recover a device draft only into the authorized register's own catalog.
 * Never read another tenant's product by the stale ID or transfer its stock. */
export async function recoverReceiptProducts(
  tx: Prisma.TransactionClient,
  organizationId: string,
  items: PosGoodsReceiptLine[],
): Promise<void> {
  const scope = {
    organizationId,
    deletedAt: null,
    ...vendorProductReadScope(),
  };
  const select = {
    id: true,
    name: true,
    unit: true,
    isActive: true,
    supplyType: true,
  } satisfies Prisma.ProductSelect;
  const resolved = new Map<string, string>();
  for (const item of items) {
    if (item.masterProductId) continue;
    const originalId = item.productId;
    const cached = resolved.get(originalId);
    if (cached) {
      item.productId = cached;
      continue;
    }
    const snapshot = item.productSnapshot;
    let product = await tx.product.findFirst({
      where: { ...scope, id: originalId },
      select,
    });
    if (!product && snapshot?.barcode) {
      const candidates = await tx.product.findMany({
        where: {
          ...scope,
          OR: [
            { barcode: snapshot.barcode },
            { barcodeAliases: { has: snapshot.barcode } },
          ],
        },
        select,
        take: 2,
      });
      if (candidates.length > 1)
        throw new ReceiptProductRecoveryError(
          `“${snapshot.name}” барааны ${snapshot.barcode} баркод давхар бүртгэлтэй байна. Зөв барааг сонгоно уу. Ноорог хэвээр хадгалагдана.`,
        );
      product = candidates[0] ?? null;
    }
    if (
      product &&
      snapshot &&
      normalizePosMeasureUnit(product.unit) !== snapshot.unit
    )
      throw new ReceiptProductRecoveryError(
        `“${snapshot.name}” барааны хэмжих нэгж өөрчлөгдсөн байна. Мөрийн нэгжийг шалгана уу. Ноорог хэвээр хадгалагдана.`,
      );
    if (!product) {
      if (!snapshot)
        throw new ReceiptProductRecoveryError(
          `Барааны бүртгэл шинэчлэгдсэн байна (${originalId}). Нооргоо хадгалсан эсэхийг шалгаад хуудсаа шинэчилж дахин баталгаажуулна уу.`,
        );
      const price = item.salePrice ?? snapshot.price;
      if (price === undefined)
        throw new ReceiptProductRecoveryError(
          `“${snapshot.name}” шинэ барааны зарах үнийг мөрөнд оруулаад дахин баталгаажуулна уу. Бусад мөрийг дахин оруулах шаардлагагүй.`,
        );
      product = await tx.product.create({
        data: {
          organizationId,
          name: snapshot.name,
          barcode: snapshot.barcode,
          sku: `RCV-${crypto.randomUUID()}`,
          unit: snapshot.unit,
          price,
          costPrice: item.unitCost,
        },
        select,
      });
    } else if (!product.isActive || product.supplyType !== "IN_STOCK") {
      // Receiving physical stock makes an owned product available for sale.
      product = await tx.product.update({
        where: { id: product.id },
        data: { isActive: true, supplyType: "IN_STOCK" },
        select,
      });
    }
    item.productId = product.id;
    resolved.set(originalId, product.id);
  }
  // Distinct old IDs can resolve to one current product. Reject conflicting prices
  // instead of silently letting the last lot overwrite the selling price.
  const prices = new Map<string, number>();
  for (const item of items) {
    if (item.salePrice === undefined) continue;
    const previous = prices.get(item.productId);
    if (previous !== undefined && previous !== item.salePrice)
      throw new ReceiptProductRecoveryError(
        `“${item.productSnapshot?.name ?? item.productId}” барааны олон мөрөнд ижил зарах үнэ оруулна уу. Ноорог хэвээр хадгалагдана.`,
      );
    prices.set(item.productId, item.salePrice);
  }
}
