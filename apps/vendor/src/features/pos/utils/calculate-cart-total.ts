import { calculatePosInclusiveVat, calculatePosLineAmounts } from "@mgl/types";
import type { CartLine, CartTotals } from "../types/pos.types";

export function calculateCartTotal(lines: CartLine[]): CartTotals {
  let subTotalCents = 0;
  let discountCents = 0;
  let totalCents = 0;
  const taxGroups = new Map<string, { totalAmount: number; totalCityTax: number }[]>();
  for (const line of lines) {
    const amounts = calculatePosLineAmounts(line);
    subTotalCents += Math.round(amounts.subTotal * 100);
    discountCents += Math.round(amounts.discountTotal * 100);
    totalCents += Math.round(amounts.lineTotal * 100);
    const cityRate = Math.max(0, line.cityTaxRate || 0);
    const cityTax = Math.round((amounts.lineTotal * cityRate / (100 + cityRate) + Number.EPSILON) * 100) / 100;
    const taxType = line.taxType || "VAT_ABLE";
    const group = taxGroups.get(taxType) || [];
    group.push({ totalAmount: amounts.lineTotal, totalCityTax: cityTax });
    taxGroups.set(taxType, group);
  }
  const taxCents = Array.from(taxGroups, ([type, items]) =>
    Math.round(calculatePosInclusiveVat(items, true, type).totalVAT * 100),
  ).reduce((sum, cents) => sum + cents, 0);
  return {
    subTotal: subTotalCents / 100,
    discountTotal: discountCents / 100,
    taxTotal: taxCents / 100,
    grandTotal: totalCents / 100,
  };
}
