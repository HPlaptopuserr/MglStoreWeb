import type { PosReceipt } from "@mgl/types";
import { salesDay } from "./sales-history-filters";

/** Read-only fixtures; never sent to the sales, stock or payment APIs. */
export function createSalesHistoryDemo(now = new Date()): PosReceipt[] {
  return [0, 0, 1, 1, 2, 2].map((daysAgo, index) => {
    const day = salesDay(
      new Date(now.getTime() - daysAgo * 86400000).toISOString(),
    );
    const qty = index + 1;
    const price = index % 2 ? 3500 : 5500;
    return {
      id: `demo-receipt-${index}`,
      receiptNo: `TEST-${index + 1}`,
      branchName: "Тест салбар",
      cashierId: `demo-cashier-${index % 2}`,
      cashierName: index % 2 ? "Тест — Саруул" : "Тест — Бат",
      createdAt: `${day}T${index % 2 ? "15" : "09"}:30:00+08:00`,
      paymentMethod: "CASH",
      status: index === 5 ? "VOIDED" : "COMPLETED",
      lines: [
        {
          productId: `demo-product-${index % 2}`,
          name: index % 2 ? "Тест — Талх" : "Тест — Coca Cola",
          qty,
          unitPrice: price,
          taxAmount: 0,
          lineTotal: qty * price,
          measureUnit: "ш",
        },
      ],
      subTotal: qty * price,
      taxTotal: 0,
      discountTotal: 0,
      grandTotal: qty * price,
    };
  });
}
