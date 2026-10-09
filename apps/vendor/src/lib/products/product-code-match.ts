export interface ProductCodes {
  sku?: string | null;
  barcode?: string | null;
}

/** Codes are identifiers: preserve punctuation, internal spaces and leading zeros. */
export function matchingProductCodes(left: ProductCodes, right: ProductCodes) {
  return (["sku", "barcode"] as const).filter((field) => {
    const value = left[field]?.trim().toLowerCase();
    return Boolean(value && value === right[field]?.trim().toLowerCase());
  });
}

export function findProductCodeConflict<T extends ProductCodes & { id: string }>(
  draft: ProductCodes,
  products: readonly T[],
  editingId: string | null,
) {
  for (const product of products) {
    if (product.id === editingId) continue;
    const fields = matchingProductCodes(draft, product);
    if (fields.length) return { product, fields };
  }
  return undefined;
}
