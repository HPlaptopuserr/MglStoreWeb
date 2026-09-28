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
): PosReceipt[] {
  return receipts.filter(
    (receipt) =>
      (!date || salesDay(receipt.createdAt) === date) &&
      (!cashier || cashierKey(receipt) === cashier),
  );
}
