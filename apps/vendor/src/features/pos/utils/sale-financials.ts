import type { ReceiptLine } from "@mgl/types";

export const roundSalesMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
const validCost = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value) && value >= 0;
export function calculateSaleFinancials(line: ReceiptLine) {
  const cost = validCost(line.costTotal)
    ? line.costTotal
    : validCost(line.unitCost)
      ? line.unitCost * line.qty
      : null;
  const profit = cost == null ? null : roundSalesMoney(line.lineTotal - cost);
  return {
    cost: cost == null ? null : roundSalesMoney(cost),
    unitCost:
      cost != null && line.qty > 0
        ? cost / line.qty
        : validCost(line.unitCost)
          ? line.unitCost
          : null,
    sellingPrice: line.qty > 0 ? line.lineTotal / line.qty : null,
    profit,
    margin:
      profit != null && line.lineTotal > 0
        ? (profit / line.lineTotal) * 100
        : null,
    markup:
      profit != null && cost != null && cost > 0 ? (profit / cost) * 100 : null,
    discount:
      line.discount ?? Math.max(0, line.unitPrice * line.qty - line.lineTotal),
  };
}
