import { Prisma } from "@mgl/database";

interface ValuationItem {
  quantity: number;
  product: { costPrice: Prisma.Decimal | null };
}

export function inventoryValuation(items: ValuationItem[]) {
  let total = new Prisma.Decimal(0);
  let missingCostCount = 0;
  for (const item of items) {
    if (item.quantity <= 0) continue;
    const cost = item.product.costPrice;
    if (cost === null || cost.isNegative()) {
      missingCostCount += 1;
    } else {
      total = total.plus(cost.times(item.quantity));
    }
  }
  return { totalCost: total.toFixed(2), missingCostCount };
}
