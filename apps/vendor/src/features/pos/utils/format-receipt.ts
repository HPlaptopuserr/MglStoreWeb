import type { PosReceipt } from "../types/receipt.types";

export function formatReceipt(receipt: PosReceipt): string {
  const header = [
    `Receipt: ${receipt.receiptNo}`,
    `Branch: ${receipt.branchName}`,
    `Cashier: ${receipt.cashierName}`,
    `Date: ${new Date(receipt.createdAt).toLocaleString()}`,
    "--------------------------------",
  ];

  const lines = receipt.lines.map(
    (line) => `${line.name} x${line.qty}  ${line.lineTotal.toFixed(2)}`,
  );

  const footer = [
    "--------------------------------",
    `Subtotal: ${receipt.subTotal.toFixed(2)}`,
    `Tax: ${receipt.taxTotal.toFixed(2)}`,
    `Discount: -${receipt.discountTotal.toFixed(2)}`,
    `TOTAL: ${receipt.grandTotal.toFixed(2)}`,
    `Payment: ${receipt.paymentMethod}`,
  ];

  const breakdown =
    receipt.paymentBreakdown && receipt.paymentBreakdown.length > 0
      ? [
          "Payment Breakdown:",
          ...receipt.paymentBreakdown.map(
            (item) => `- ${item.method}: ${item.amount.toFixed(2)}`,
          ),
        ]
      : [];

  return [...header, ...lines, ...footer, ...breakdown].join("\n");
}
