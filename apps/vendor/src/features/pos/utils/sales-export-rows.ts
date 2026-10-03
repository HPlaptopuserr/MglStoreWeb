import type { PosReceipt } from "@mgl/types";
import { calculateSaleFinancials } from "./sale-financials";
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
      const financials = calculateSaleFinancials(line);
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
        "Нэгж өртөг (борлуулалтын үеийн)": financials.unitCost ?? ("" as const),
        "Нийт өртөг (борлуулалтын үеийн)": financials.cost ?? ("" as const),
        "Хөнгөлөлтийн дараах нэгж үнэ":
          financials.sellingPrice ?? ("" as const),
        Хөнгөлөлт: financials.discount,
        "Борлуулалтын дүн": line.lineTotal,
        "Барааны ашиг": financials.profit ?? ("" as const),
        "Ашгийн хувь (%)": financials.margin ?? ("" as const),
        "Өртгийн нэмэгдэл (%)": financials.markup ?? ("" as const),
        "Өртгийн мэдээлэл":
          financials.cost == null ? "Мэдээлэл дутуу" : "Бүрэн",
        НӨАТ: line.taxAmount,
        "Хотын татвар": line.cityTaxAmount ?? ("" as const),
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
    "Дундаж авсан үнэ": row.unitCost ?? ("" as const),
    "Дундаж зарсан үнэ": row.sellingPrice ?? ("" as const),
    "Нийт өртөг": row.cost ?? ("" as const),
    Хөнгөлөлт: row.discount,
    "Борлуулалтын дүн": row.amount,
    "Барааны ашиг": row.profit ?? ("" as const),
    "Ашгийн хувь (%)": row.margin ?? ("" as const),
    "Өртгийн нэмэгдэл (%)": row.markup ?? ("" as const),
    "Өртөг дутуу борлуулалтын мөр": row.missingCostCount,
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
