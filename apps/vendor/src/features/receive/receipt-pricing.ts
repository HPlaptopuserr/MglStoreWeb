import type { ProductOption } from "./receipt-types";

export function markedUpPrice(cost: string, percent: string): string {
  if (!cost.trim() || !percent.trim()) return "";
  const amount = Number(cost);
  const rate = Number(percent);
  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(rate) ||
    amount < 0 ||
    rate < 0
  )
    return "";
  return String(Math.round(amount * (1 + rate / 100) * 100) / 100);
}

export function receiptSalePrice(
  product: ProductOption,
  unitCost: string,
  markup: string,
): string {
  const calculated = markedUpPrice(unitCost, markup);
  if (calculated) return calculated;
  const price = Number(product.price);
  return product.price != null && Number.isFinite(price) && price >= 0
    ? String(price)
    : "";
}
