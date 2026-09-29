import type { PosReceipt } from "@mgl/types";

export function salesDay(timestamp: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(timestamp));
}

export function cashierKey(receipt: PosReceipt): string {
  return receipt.cashierId || receipt.cashierName;
}

export function filterSalesHistory(
  receipts: PosReceipt[],
  date: string,
  cashier: string,
  endDate: string = date,
): PosReceipt[] {
  if (date && endDate && date > endDate) return [];
  return receipts.filter(
    (receipt) =>
      (!date || salesDay(receipt.createdAt) >= date) &&
      (!endDate || salesDay(receipt.createdAt) <= endDate) &&
      (!cashier || cashierKey(receipt) === cashier),
  );
}
