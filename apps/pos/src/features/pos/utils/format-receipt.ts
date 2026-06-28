import type { PosReceipt } from "../types/receipt.types";

const formatMoney = (value: number) => `₮${Math.round(value).toLocaleString("mn-MN")}`;

export function formatReceipt(receipt: PosReceipt): string {
  const header = [
    `Receipt: ${receipt.receiptNo}`,
    `Branch: ${receipt.branchName}`,
    `Cashier: ${receipt.cashierName}`,
    `Date: ${new Date(receipt.createdAt).toLocaleString()}`,
    "--------------------------------",
  ];

  const lines = receipt.lines.map(
    (line) => `${line.name} x${line.qty}  ${formatMoney(line.lineTotal)}`,
  );

  const footer = [
    "--------------------------------",
    `Subtotal: ${formatMoney(receipt.subTotal)}`,
    `Tax: ${formatMoney(receipt.taxTotal)}`,
    `Discount: -${formatMoney(receipt.discountTotal)}`,
    `TOTAL: ${formatMoney(receipt.grandTotal)}`,
    `Payment: ${receipt.paymentMethod}`,
  ];

  const breakdown =
    receipt.paymentBreakdown && receipt.paymentBreakdown.length > 0
      ? [
          "Payment Breakdown:",
          ...receipt.paymentBreakdown.map(
            (item) => `- ${item.method}: ${formatMoney(item.amount)}`,
          ),
        ]
      : [];

  const ebarimt =
    receipt.ebarimt?.status === "SUCCESS"
      ? [
          "--------------------------------",
          "eBarimt: SUCCESS",
          receipt.ebarimt.lottery ? `Lottery: ${receipt.ebarimt.lottery}` : "",
          receipt.ebarimt.billId ? `Bill ID: ${receipt.ebarimt.billId}` : "",
        ].filter(Boolean)
      : receipt.ebarimt?.status === "FAILED"
        ? [
            "--------------------------------",
            "eBarimt: FAILED",
            receipt.ebarimt.error ? `Error: ${receipt.ebarimt.error}` : "",
          ].filter(Boolean)
        : [];

  return [...header, ...lines, ...footer, ...breakdown, ...ebarimt].join("\n");
}
