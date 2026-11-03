export interface CatalogProductIdentity {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  barcodeAliases: string[];
  masterProductId: string | null;
  deletedAt: Date | null;
}

/** Never guess which of two existing records is the canonical product. */
export function catalogIdentityConflicts(
  products: readonly CatalogProductIdentity[],
): string[] {
  const identifiers = new Map<string, CatalogProductIdentity>();
  const conflicts = new Set<string>();
  for (const product of products) {
    const keys = [
      ...(product.sku ? [`sku:${product.sku}`] : []),
      ...(!product.deletedAt
        ? [
            ...[product.barcode, ...product.barcodeAliases, product.sku]
              .filter((value): value is string => Boolean(value))
              .map((value) => `code:${value.trim().toLowerCase()}`),
            ...(product.masterProductId
              ? [`master:${product.masterProductId}`]
              : []),
          ]
        : []),
    ];
    for (const key of keys) {
      const previous = identifiers.get(key);
      if (previous && previous.id !== product.id) {
        conflicts.add(
          `${previous.name} (${previous.id}) / ${product.name} (${product.id})`,
        );
      } else {
        identifiers.set(key, product);
      }
    }
  }
  return [...conflicts];
}
