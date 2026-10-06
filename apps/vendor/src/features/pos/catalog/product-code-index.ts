import type { PosProduct } from "../types/pos.types";

export const normalizeProductCode = (value: string) =>
  value.trim().replace(/\s+/g, "").toLowerCase();

export function createProductCodeIndex(products: readonly PosProduct[]) {
  const index = new Map<string, PosProduct>();
  for (const product of products) {
    for (const value of [
      product.sku,
      product.barcode,
      product.id,
      ...(product.barcodeAliases ?? []),
    ]) {
      const code = normalizeProductCode(value ?? "");
      if (code && !index.has(code)) index.set(code, product);
    }
  }
  return index;
}
