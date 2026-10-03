import type { ProductSaleOccurrence } from "../pos/utils/sold-product-summary";
import {
  salesPaymentMethodName,
  salesPaymentNames,
} from "../pos/utils/sales-export-rows";
import {
  formatReportMoney,
  formatReportQuantity,
  formatSaleDateTime,
} from "./sales-report-format";

function receiptPayments(
  receipt: ProductSaleOccurrence["receipt"],
): NonNullable<ProductSaleOccurrence["receipt"]["paymentBreakdown"]> {
  return receipt.paymentBreakdown?.length
    ? receipt.paymentBreakdown
    : [{ method: receipt.paymentMethod, amount: receipt.grandTotal }];
}

export function SoldProductSalesDetails({
  sales,
  unit,
}: {
  sales: ProductSaleOccurrence[];
  unit: string;
}) {
  return (
    <div
      className="max-h-[520px] space-y-3 overflow-auto p-3 sm:p-5"
      aria-label="Барааны борлуулалт бүрийн мэдээлэл"
    >
      <p className="text-xs text-slate-500">
        Сүүлийн борлуулалтаас эхлэн · Улаанбаатарын цагаар
      </p>
      {sales.map(({ receipt, line }, index) => (
        <article
          key={`${receipt.id}:${index}`}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold text-slate-900">{receipt.receiptNo}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatSaleDateTime(receipt.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-900">{receipt.cashierName}</p>
              <p className="mt-1 text-xs text-slate-500">
                {receipt.branchName} ·{" "}
                {receipt.registerName || "Касс бүртгээгүй"}
              </p>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
            {[
              ["Зарагдсан", `${formatReportQuantity(line.qty)} ${unit}`],
              ["Нэгж үнэ", formatReportMoney(line.unitPrice)],
              ["Барааны дүн", formatReportMoney(line.lineTotal)],
              ["Төлбөрийн хэлбэр", salesPaymentNames(receipt)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <details className="mt-4 border-t border-slate-100 pt-3">
            <summary className="cursor-pointer text-xs font-semibold text-blue-700 hover:text-blue-900">
              Төлбөр, өртөг, татварын бүх мэдээлэл
            </summary>
            <div className="mt-3 grid gap-4 text-xs sm:grid-cols-2">
              <div>
                <p className="font-bold text-slate-800">
                  Баримтын төлбөрийн задаргаа
                </p>
                <p className="mt-1 text-slate-500">
                  Энэ нь тухайн баримтын бүх барааны төлбөр.
                </p>
                {receiptPayments(receipt).map((payment, paymentIndex) => (
                  <div
                    key={paymentIndex}
                    className="mt-2 rounded-lg bg-slate-50 p-3"
                  >
                    <p className="flex justify-between gap-2 font-semibold">
                      <span>{salesPaymentMethodName(payment.method)}</span>
                      <span>{formatReportMoney(payment.amount)}</span>
                    </p>
                    {payment.cash && (
                      <p className="mt-1 text-slate-500">
                        Хүлээн авсан бэлэн:{" "}
                        {formatReportMoney(payment.cash.receivedAmount)} ·
                        Хариулт: {formatReportMoney(payment.cash.changeAmount)}
                      </p>
                    )}
                    {payment.transactionId && (
                      <p className="mt-1 break-all text-slate-500">
                        Гүйлгээ: {payment.transactionId}
                      </p>
                    )}
                    {payment.invoiceId && (
                      <p className="mt-1 break-all text-slate-500">
                        Нэхэмжлэх: {payment.invoiceId}
                      </p>
                    )}
                    {payment.terminalId && (
                      <p className="mt-1 text-slate-500">
                        Терминал: {payment.terminalId}
                      </p>
                    )}
                    {payment.traceno && (
                      <p className="mt-1 text-slate-500">
                        Гүйлгээний дугаар: {payment.traceno}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <dl className="space-y-2">
                {[
                  ["Борлуулсан үеийн SKU", line.sku || "—"],
                  ["Баркод", line.barcode || "—"],
                  [
                    "Барааны хөнгөлөлт",
                    line.discount == null
                      ? "Бүртгээгүй"
                      : formatReportMoney(line.discount),
                  ],
                  ["Барааны татвар", formatReportMoney(line.taxAmount)],
                  [
                    "Хотын татвар",
                    line.cityTaxAmount == null
                      ? "Бүртгээгүй"
                      : formatReportMoney(line.cityTaxAmount),
                  ],
                  [
                    "Нэгж өртөг",
                    line.unitCost == null
                      ? "Бүртгээгүй"
                      : formatReportMoney(line.unitCost),
                  ],
                  [
                    "Нийт өртөг",
                    line.costTotal == null
                      ? "Бүртгээгүй"
                      : formatReportMoney(line.costTotal),
                  ],
                  [
                    "Баримтын нийт төлбөр",
                    formatReportMoney(receipt.grandTotal),
                  ],
                  [
                    "Баримтын хөнгөлөлт",
                    formatReportMoney(receipt.discountTotal),
                  ],
                  ["eBarimt төлөв", receipt.ebarimt?.status || "Бүртгээгүй"],
                  ["eBarimt дугаар", receipt.ebarimt?.receiptId || "—"],
                  ["Ангилал", line.catalog?.category || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="max-w-[65%] break-all text-right font-medium text-slate-800">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>
        </article>
      ))}
    </div>
  );
}
