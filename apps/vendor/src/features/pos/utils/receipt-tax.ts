import type { PosReceipt } from "../types/receipt.types";

/** A successful fiscal receipt is authoritative; preserve explicit zero VAT. */
export function receiptTaxTotal(receipt: PosReceipt): number {
  const fiscal = receipt.ebarimt;
  if (
    fiscal?.status === "SUCCESS" &&
    typeof fiscal.totalVAT === "number" &&
    Number.isFinite(fiscal.totalVAT) &&
    fiscal.totalVAT >= 0
  ) {
    const cityTax =
      typeof fiscal.totalCityTax === "number" &&
      Number.isFinite(fiscal.totalCityTax) &&
      fiscal.totalCityTax >= 0
        ? fiscal.totalCityTax
        : 0;
    return Math.round((fiscal.totalVAT + cityTax) * 100) / 100;
  }
  return receipt.taxTotal;
}
