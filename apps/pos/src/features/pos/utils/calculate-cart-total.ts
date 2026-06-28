import type { CartLine, CartTotals } from "../types/pos.types";

export function calculateCartTotal(lines: CartLine[]): CartTotals {
  const subTotal = lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  const discountTotal = lines.reduce((sum, line) => sum + line.discountAmount, 0);
  const taxableBase = Math.max(subTotal - discountTotal, 0);
  const taxTotal = lines.reduce((sum, line) => {
    const lineBase = Math.max(line.unitPrice * line.qty - line.discountAmount, 0);
    const taxRate = line.taxType === "VAT_ABLE" ? Math.max(0, line.taxRate || 0) : 0;
    return sum + (taxRate > 0 ? lineBase * (taxRate / (100 + taxRate)) : 0);
  }, 0);

  return {
    subTotal: round2(subTotal),
    discountTotal: round2(discountTotal),
    taxTotal: round2(taxTotal),
    grandTotal: round2(taxableBase),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
