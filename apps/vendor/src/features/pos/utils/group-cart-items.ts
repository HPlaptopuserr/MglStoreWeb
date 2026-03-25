import type { CartLine } from "../types/pos.types";

export function groupCartItems(lines: CartLine[]): CartLine[] {
  const grouped = new Map<string, CartLine>();

  for (const line of lines) {
    const key = `${line.productId}:${line.unitPrice}:${line.taxRate}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.qty += line.qty;
      existing.discountAmount += line.discountAmount;
      continue;
    }
    grouped.set(key, { ...line });
  }

  return Array.from(grouped.values());
}
