import { AlertTriangle, CalendarClock } from "lucide-react";
import { formatReportExpiry } from "../reports/report-expiry";
import { expiryMoney, type ExpiryInsightProduct } from "./expiry-insights";

export function ExpiryProductCard({
  product,
}: {
  product: ExpiryInsightProduct;
}) {
  const expired = product.daysUntilExpiry < 0;
  const urgent = product.daysUntilExpiry <= 14;
  const tone = expired
    ? "border-red-200 bg-red-50 text-red-700"
    : urgent
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-50 text-slate-600";
  const deadline = expired
    ? `${Math.abs(product.daysUntilExpiry)} хоног хэтэрсэн`
    : product.daysUntilExpiry === 0
      ? "Өнөөдөр дуусна"
      : `${product.daysUntilExpiry} хоног үлдсэн`;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md motion-reduce:transition-none sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-bold text-slate-900">
            {product.name}
          </h3>
          <p className="mt-1 break-words text-xs leading-5 text-slate-500">
            {product.sku || "Кодгүй"} · {product.warehouseName}
          </p>
        </div>
        <span
          title="Хугацаа, үлдэгдэл, сүүлийн 30 хоногийн борлуулалтаар тооцсон 0–100 оноо"
          className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-700"
        >
          {product.riskScore}/100
        </span>
      </div>
      <div
        className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${tone}`}
      >
        <span className="inline-flex items-center gap-1.5 font-bold">
          <CalendarClock size={15} aria-hidden="true" />
          {deadline}
        </span>
        <time dateTime={product.expiryDate} className="tabular-nums">
          {formatReportExpiry(product.expiryDate)}
        </time>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-slate-500">Үлдэгдэл</dt>
          <dd className="mt-1 font-bold tabular-nums text-slate-900">
            {product.quantity.toLocaleString("mn-MN")}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Нөөцийн дүн</dt>
          <dd className="mt-1 break-words font-bold tabular-nums text-slate-900">
            {expiryMoney(product.stockValue)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">30 хоногт зарагдсан</dt>
          <dd className="mt-1 font-bold tabular-nums text-slate-900">
            {product.salesLast30Days.toLocaleString("mn-MN")}
          </dd>
        </div>
      </dl>
      <details className="mt-4 border-t border-slate-100 pt-3 text-xs">
        <summary className="cursor-pointer rounded font-semibold text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
          Зөвлөмж харах
        </summary>
        <p className="mt-2 flex items-start gap-2 leading-5 text-slate-600">
          <AlertTriangle
            className="mt-0.5 shrink-0 text-amber-600"
            size={14}
            aria-hidden="true"
          />
          {product.recommendation}
        </p>
        {product.sellThroughDays != null && (
          <p className="mt-2 text-slate-500">
            Одоогийн борлуулалтын хурдаар ойролцоогоор {product.sellThroughDays}{" "}
            хоногт борлуулагдана.
          </p>
        )}
      </details>
    </article>
  );
}
