import type { PosReceipt } from "@mgl/types";

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
const methodName = (method: string) => methods[method.toUpperCase()] || method;
const timeZone = "Asia/Ulaanbaatar";
function context(receipt: PosReceipt) {
  const time = new Date(receipt.createdAt);
  return {
    "Борлуулалтын ID": receipt.id,
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
function paymentNames(receipt: PosReceipt) {
  return [
    ...new Set(
      receipt.paymentBreakdown?.length
        ? receipt.paymentBreakdown.map((payment) => methodName(payment.method))
        : [methodName(receipt.paymentMethod)],
    ),
  ].join(" + ");
}

export function buildSalesExportRows(receipts: PosReceipt[]) {
  const completed = receipts.filter(
    (receipt) => receipt.status === "COMPLETED",
  );
  const summary = new Map<
    string,
    {
      productId: string;
      name: string;
      sku: string;
      barcode: string;
      unit: string;
      qty: number;
      amount: number;
    }
  >();
  const details = completed.flatMap((receipt) =>
    receipt.lines.map((line) => {
      const unit = line.measureUnit || "ш";
      const key = JSON.stringify([
        line.productId,
        unit,
        line.sku,
        line.barcode,
      ]);
      const row = summary.get(key) || {
        productId: line.productId,
        name: line.name,
        sku: line.sku ?? "",
        barcode: line.barcode ?? "",
        unit,
        qty: 0,
        amount: 0,
      };
      row.qty += line.qty;
      row.amount += line.lineTotal;
      summary.set(key, row);
      const receiptContext = context(receipt);
      const { Ажилтан, Огноо, "Цаг (Улаанбаатар)": saleTime, ...metadata } = receiptContext;
      return {
        Бараа: line.name,
        Ажилтан,
        Огноо,
        "Цаг (Улаанбаатар)": saleTime,
        "Төлбөрийн хэлбэр": paymentNames(receipt),
        ...metadata,
        SKU: line.sku ?? "",
        Баркод: line.barcode ?? "",
        "Ангилал (одоогийн)": line.catalog?.category ?? "",
        "Тайлбар (одоогийн)": line.catalog?.description ?? "",
        Нэгж: unit,
        "Тоо хэмжээ": line.qty,
        "Үнийн төрөл": line.priceType ?? "",
        "Нэгж үнэ": line.unitPrice,
        "Нэгж өртөг (борлуулалтын үеийн)": line.unitCost ?? "",
        "Нийт өртөг (борлуулалтын үеийн)": line.costTotal ?? "",
        Хөнгөлөлт: line.discount ?? "",
        "Татварын төрөл": line.taxType ?? "",
        "НӨАТ хувь": line.taxRate ?? "",
        "НӨАТ дүн": line.taxAmount,
        "НХАТ хувь": line.cityTaxRate ?? "",
        "НХАТ дүн": line.cityTaxAmount ?? "",
        "Татварын бүтээгдэхүүний код": line.taxProductCode ?? "",
        "Борлуулалтын дүн": line.lineTotal,
      };
    }),
  );
  const totals = [...summary.values()].map((row) => ({
    Бараа: row.name,
    SKU: row.sku,
    Баркод: row.barcode,
    Нэгж: row.unit,
    "Тоо хэмжээ": Math.round(row.qty * 1000) / 1000,
    "Борлуулалтын дүн": Math.round(row.amount * 100) / 100,
  }));
  const sales = completed.map((receipt) => ({
    ...context(receipt),
    Төлөв: "Амжилттай",
    "Төлбөрийн хэлбэр": paymentNames(receipt),
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
      "Төлбөрийн хэлбэр": methodName(payment.method),
      "Төлбөрийн дүн": payment.amount,
      "Гүйлгээний ID": payment.transactionId ?? "",
      "Нэхэмжлэх ID": payment.invoiceId ?? "",
      "Терминал ID": payment.terminalId ?? "",
      "Гүйлгээний дугаар": payment.traceno ?? "",
    }));
  });
  return { totals, details, sales, payments };
}
