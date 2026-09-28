import type { PosReceipt } from "../types/receipt.types";
import { formatPosQuantity } from "@mgl/types";

const formatMoney = (value: number) =>
  `₮${value.toLocaleString("mn-MN", { maximumFractionDigits: 2 })}`;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Бэлэн мөнгө",
  CARD: "Карт",
  QPAY: "QPay",
  QR: "QR төлбөр",
  CREDIT: "Зээл",
  MIXED: "Хосолсон төлбөр",
};

const formatPaymentMethod = (method: string) =>
  PAYMENT_METHOD_LABELS[method.toUpperCase()] || method;

export function formatReceipt(receipt: PosReceipt): string {
  const header = [
    `Баримтын дугаар: ${receipt.receiptNo}`,
    `Салбар: ${receipt.branchName}`,
    `Кассчин: ${receipt.cashierName}`,
    `Огноо: ${new Date(receipt.createdAt).toLocaleString("mn-MN")}`,
    "--------------------------------",
  ];

  const lines = receipt.lines.map(
    (line) =>
      `${line.name} ${formatPosQuantity(line.qty, line.measureUnit)}  ${formatMoney(line.lineTotal)}`,
  );

  const footer = [
    "--------------------------------",
    `Барааны дүн: ${formatMoney(receipt.subTotal)}`,
    `Татвар: ${formatMoney(receipt.taxTotal)}`,
    `Хөнгөлөлт: -${formatMoney(receipt.discountTotal)}`,
    `НИЙТ ДҮН: ${formatMoney(receipt.grandTotal)}`,
    `Төлбөрийн хэлбэр: ${formatPaymentMethod(receipt.paymentMethod)}`,
  ];

  const breakdown =
    receipt.paymentBreakdown && receipt.paymentBreakdown.length > 0
      ? [
          "Төлбөрийн задаргаа:",
          ...receipt.paymentBreakdown.flatMap((item) => [
            `- ${item.method === "CASH" && item.cash ? "Бэлнээр тооцсон" : formatPaymentMethod(item.method)}: ${formatMoney(item.amount)}`,
            ...(item.method === "CASH" && item.cash
              ? [
                  `  Авсан мөнгө: ${formatMoney(item.cash.receivedAmount)}`,
                  `  Хариулт: ${formatMoney(item.cash.changeAmount)}`,
                ]
              : []),
          ]),
        ]
      : [];

  const ebarimt =
    receipt.ebarimt?.status === "SUCCESS"
      ? [
          "--------------------------------",
          "eBarimt: Амжилттай",
          receipt.ebarimt.receiptType === "B2B" && receipt.ebarimt.customerRegNo
            ? `Байгууллагын РД: ${receipt.ebarimt.customerRegNo}`
            : "",
          receipt.ebarimt.receiptType === "B2B" && receipt.ebarimt.customerTin
            ? `Байгууллагын TIN: ${receipt.ebarimt.customerTin}`
            : "",
          receipt.ebarimt.lottery ? `Сугалаа: ${receipt.ebarimt.lottery}` : "",
          receipt.ebarimt.billId
            ? `eBarimt баримтын ID: ${receipt.ebarimt.billId}`
            : "",
        ].filter(Boolean)
      : receipt.ebarimt?.status === "FAILED"
        ? [
            "--------------------------------",
            "eBarimt: Амжилтгүй",
            receipt.ebarimt.error ? `Алдаа: ${receipt.ebarimt.error}` : "",
          ].filter(Boolean)
        : [];

  return [...header, ...lines, ...footer, ...breakdown, ...ebarimt].join("\n");
}
