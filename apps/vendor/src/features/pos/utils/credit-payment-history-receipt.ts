import type { PosReceipt } from "../types/receipt.types";
import type { CreditPaymentHistoryItem } from "../api/credit-payment-history";
import { readPosFiscalTaxTotals } from "@mgl/types";
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
/** Reprint only the recorded installment; this never calls a bank or PosAPI. */
export function creditPaymentHistoryReceipt(
  payment: CreditPaymentHistoryItem,
): PosReceipt {
  const raw = object(payment.ebarimt) ? payment.ebarimt : null;
  const readText = (key: string) =>
    typeof raw?.[key] === "string" ? (raw[key] as string) : null;
  const ebarimt: PosReceipt["ebarimt"] =
    raw && ["SUCCESS", "FAILED"].includes(String(raw.status))
      ? {
          ...readPosFiscalTaxTotals(raw.payload),
          status: String(raw.status),
          billId: readText("billId"),
          receiptId: readText("receiptId"),
          qrData: readText("qrData"),
          lottery: readText("lottery"),
          date: readText("date"),
          error: readText("error"),
          receiptType:
            raw.receiptType === "B2C" || raw.receiptType === "B2B"
              ? raw.receiptType
              : null,
          customerName: readText("customerName"),
          customerTin: readText("customerTin"),
          customerRegNo: readText("customerRegNo"),
        }
      : null;
  const allocations = payment.allocations.filter((item) => item.amount > 0);
  const sameTotal =
    allocations.reduce(
      (sum, item) => sum + Math.round(item.amount * 100),
      0,
    ) === Math.round(payment.paidAmount * 100);
  const lines = (
    sameTotal && allocations.length
      ? allocations
      : [{ creditSaleId: payment.id, amount: payment.paidAmount }]
  ).map((item) => ({
    productId: `credit-payment:${item.creditSaleId}`,
    name: `${payment.borrowerNames.join(", ") || "Зээл"} · Зээлийн төлөлт (${item.creditSaleId.slice(0, 8)})`,
    qty: 1,
    unitPrice: item.amount,
    taxAmount: 0,
    lineTotal: item.amount,
  }));
  return {
    id: `credit-payment:${payment.id}`,
    receiptNo: `ТӨЛ-${payment.id.slice(0, 8)}`,
    branchName: "Зээлийн төлөлтийн түүх",
    cashierName: "Дахин хэвлэсэн баримт",
    shiftId: payment.shiftId || undefined,
    createdAt: payment.createdAt,
    status: "PAID",
    paymentMethod: payment.paymentMethod,
    paymentBreakdown: [
      {
        method: payment.paymentMethod === "QPAY" ? "QR" : payment.paymentMethod,
        amount: payment.paidAmount,
        invoiceId: payment.invoiceId || undefined,
        attemptId: payment.attemptId || undefined,
      },
    ],
    lines,
    subTotal: payment.paidAmount,
    grandTotal: payment.paidAmount,
    taxTotal: (ebarimt?.totalVAT || 0) + (ebarimt?.totalCityTax || 0),
    discountTotal: 0,
    loyalty: null,
    ebarimt,
  };
}
