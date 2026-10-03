import type { PosReceipt } from "@mgl/types";
import { summarizeSoldProducts } from "./sold-product-summary";

const methods: Record<string, string> = {
  CASH: "Бэлэн",
  CARD: "Карт",
  QR: "QR",
  QPAY: "QPay",
  CREDIT: "Зээл",
  MIXED: "Холимог",
  TRANSFER: "Шилжүүлэг",
  BANK_TRANSFER: "Банкны шилжүүлэг",
};
export const salesPaymentMethodName = (method: string) =>
  methods[method.toUpperCase()] || method;
const timeZone = "Asia/Ulaanbaatar";
function context(receipt: PosReceipt) {
  const time = new Date(receipt.createdAt);
  return {
    Баримт: receipt.receiptNo,
    Огноо: new Intl.DateTimeFormat("sv-SE", { timeZone }).format(time),
    "Цаг (Улаанбаатар)": time.toLocaleTimeString("en-GB", {
      timeZone,
      hour12: false,
    }),
    Салбар: receipt.branchName,
    Касс: receipt.registerName ?? "",
    Ажилтан: receipt.cashierName,
  };
}
export function salesPaymentNames(receipt: PosReceipt) {
  return [
    ...new Set(
      receipt.paymentBreakdown?.length
        ? receipt.paymentBreakdown.map((payment) =>
            salesPaymentMethodName(payment.method),
          )
        : [salesPaymentMethodName(receipt.paymentMethod)],
    ),
  ].join(" + ");
}

export function buildSalesExportRows(receipts: PosReceipt[]) {
  const completed = receipts.filter(
    (receipt) => receipt.status === "COMPLETED",
  );
  const details = completed.flatMap((receipt) =>
    receipt.lines.map((line) => {
      const unit = line.measureUnit || "ш";
      const receiptContext = context(receipt);
      const {
        Ажилтан,
        Огноо,
        "Цаг (Улаанбаатар)": saleTime,
        ...metadata
      } = receiptContext;
      return {
        Бараа: line.name,
        Ажилтан,
        Огноо,
        "Цаг (Улаанбаатар)": saleTime,
        "Төлбөрийн хэлбэр": salesPaymentNames(receipt),
        ...metadata,
        SKU: line.sku ?? "",
        Баркод: line.barcode ?? "",
        "Ангилал (одоогийн)": line.catalog?.category ?? "",
        "Тайлбар (одоогийн)": line.catalog?.description ?? "",
        Нэгж: unit,
        "Зарагдсан тоо хэмжээ": line.qty,
        "Нэгж үнэ": line.unitPrice,
        "Нэгж өртөг (борлуулалтын үеийн)": line.unitCost ?? "",
        "Нийт өртөг (борлуулалтын үеийн)": line.costTotal ?? "",
        "Борлуулалтын дүн": line.lineTotal,
      };
    }),
  );
  const totals = summarizeSoldProducts(completed).map((row) => ({
    Бараа: row.name,
    SKU: row.sku,
    Баркод: row.barcode,
    Нэгж: row.unit,
    "Зарагдсан тоо хэмжээ": row.quantity,
    "Баримтын тоо": row.receiptCount,
    "Борлуулалтын дүн": row.amount,
  }));
  const sales = completed.map((receipt) => ({
    ...context(receipt),
    Төлөв: "Амжилттай",
    "Төлбөрийн хэлбэр": salesPaymentNames(receipt),
    "Барааны дүн": receipt.subTotal,
    Хөнгөлөлт: receipt.discountTotal,
    Татвар: receipt.taxTotal,
    "Нийт төлөх": receipt.grandTotal,
    "eBarimt төлөв": receipt.ebarimt?.status ?? "",
    "eBarimt баримтын ID": receipt.ebarimt?.receiptId ?? "",
  }));
  const payments = completed.flatMap((receipt) => {
    const breakdown: NonNullable<PosReceipt["paymentBreakdown"]> = receipt
      .paymentBreakdown?.length
      ? receipt.paymentBreakdown
      : [{ method: receipt.paymentMethod, amount: receipt.grandTotal }];
    return breakdown.map((payment) => ({
      ...context(receipt),
      "Төлбөрийн хэлбэр": salesPaymentMethodName(payment.method),
      "Төлбөрийн дүн": payment.amount,
      "Гүйлгээний ID": payment.transactionId ?? "",
      "Нэхэмжлэх ID": payment.invoiceId ?? "",
      "Терминал ID": payment.terminalId ?? "",
      "Гүйлгээний дугаар": payment.traceno ?? "",
    }));
  });
  return { totals, details, sales, payments };
}
