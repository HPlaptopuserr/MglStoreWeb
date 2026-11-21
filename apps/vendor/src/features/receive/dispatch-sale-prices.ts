import type { WarehouseDispatchDocument } from "@mgl/types";

export const MAX_DISPATCH_SALE_PRICE = 1_000_000_000;

export function calculateDispatchSalePrices(
  items: WarehouseDispatchDocument["items"],
  percentage: string,
): Record<string, string> | null {
  if (!/^\d{1,3}$/.test(percentage.trim())) return null;
  const percent = Number(percentage);
  if (percent < 1 || percent > 100) return null;
  const prices: Record<string, string> = {};
  for (const item of items) {
    const cost = item.unitPrice === null ? NaN : Number(item.unitPrice);
    if (!Number.isFinite(cost) || cost <= 0 || cost > MAX_DISPATCH_SALE_PRICE)
      return null;
    const cents = Math.round(cost * 100);
    const salePrice = Math.round((cents * (100 + percent)) / 100) / 100;
    if (salePrice > MAX_DISPATCH_SALE_PRICE) return null;
    prices[item.id] = salePrice.toFixed(2);
  }
  return prices;
}
