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
    const discount = index * 100;
    const total = qty * price - discount;
    const tax = Math.round((total / 11) * 100) / 100;
    return {
      id: `demo-receipt-${index}`,
      receiptNo: `TEST-${index + 1}`,
      branchName: "Тест салбар",
      cashierId: `demo-cashier-${index % 2}`,
      cashierName: index % 2 ? "Тест — Саруул" : "Тест — Бат",
      createdAt: `${day}T${index % 2 ? "15" : "09"}:30:00+08:00`,
      registerName: "Тест касс 1",
      shiftId: `demo-shift-${daysAgo}`,
      cashierEmail: `cashier${index % 2}@example.test`,
      paymentMethod: index === 0 ? "MIXED" : index % 2 ? "CARD" : "QPAY",
      paymentBreakdown:
        index === 0
          ? [
              {
                method: "CASH", amount: 2000,
                transactionId: "Хамаарахгүй (бэлэн)",
                invoiceId: "TEST-INV-1",
                terminalId: "Хамаарахгүй (бэлэн)",
                traceno: "Хамаарахгүй (бэлэн)",
              },
              {
                method: "CARD",
                amount: total - 2000,
                transactionId: "TEST-TXN-1",
                invoiceId: "TEST-INV-1",
                terminalId: "TEST-TERMINAL-01",
                traceno: "000001",
              },
            ]
          : [
              {
                method: index % 2 ? "CARD" : "QPAY",
                amount: total,
                transactionId: `TEST-TXN-${index + 1}`,
                invoiceId: `TEST-INV-${index + 1}`,
                terminalId: index % 2 ? "TEST-TERMINAL-01" : "Хамаарахгүй (QPay)",
                traceno: String(index + 1).padStart(6, "0"),
              },
            ],
      status: index === 5 ? "VOIDED" : "COMPLETED",
      ebarimt: {
        status: "SUCCESS",
        receiptId: `TEST-EBARIMT-${index + 1}`,
      },
      lines: [
        {
          productId: `demo-product-${index % 2}`,
          name: index % 2 ? "Тест — Талх" : "Тест — Coca Cola",
          sku: `TEST-SKU-${index % 2}`,
          barcode: index % 2 ? "0012345678902" : "0012345678901",
          priceType: "UNIT",
          unitCost: 2000,
          costTotal: qty * 2000,
          discount,
          taxType: "VAT_ABLE",
          taxRate: 10,
          cityTaxRate: 0,
          cityTaxAmount: 0,
          classificationCode: index % 2 ? "2341000" : "2441000",
          taxProductCode: `TEST-TAX-${index % 2 + 1}`,
          catalog: {
            category: "Тест ангилал",
            description: "Зөвхөн турших зориулалттай бараа",
          },
          qty,
          unitPrice: price,
          taxAmount: tax,
          lineTotal: total,
          measureUnit: "ш",
        },
      ],
      subTotal: qty * price,
      taxTotal: tax,
      discountTotal: discount,
      grandTotal: total,
    };
  });
}
