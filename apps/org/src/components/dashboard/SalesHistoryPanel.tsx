"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { money } from "@/lib/org-format";
import {
  getRestaurantSalesHistory,
  type RestaurantSalesHistoryItem,
} from "@/lib/restaurant-pos-api";

const paymentLabels: Record<string, string> = {
  CASH: "Бэлэн",
  CARD: "Карт",
  QPAY: "QPay",
  QR: "QPay",
  CREDIT: "Зээл",
  MIXED: "Холимог",
};

const saleStatusLabels: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Амжилттай", className: "bg-emerald-50 text-emerald-700" },
  VOIDED: { label: "Буцаагдсан", className: "bg-rose-50 text-rose-700" },
};

const formatSaleDate = (value: string) =>
  new Intl.DateTimeFormat("mn-MN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

function saleLineSummary(sale: RestaurantSalesHistoryItem) {
  if (sale.lines.length === 0) return "Барааны мөр алга";
  const visible = sale.lines
    .slice(0, 2)
    .map((line) => `${line.productName} × ${line.qty}`)
    .join(", ");
  const hidden = sale.lines.length - 2;
  return hidden > 0 ? `${visible} +${hidden}` : visible;
}

export default function SalesHistoryPanel({
  organizationId,
}: {
  organizationId?: string | null;
}) {
  const [sales, setSales] = useState<RestaurantSalesHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [error, setError] = useState("");

  const loadSales = useCallback(
    async (signal?: AbortSignal) => {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const result = await getRestaurantSalesHistory(
          organizationId,
          { limit: 8 },
          signal,
        );
        setSales(result.sales);
        setTotal(result.total);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Борлуулалтын түүх авахад алдаа гарлаа",
        );
        setSales([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadSales(controller.signal);
    return () => controller.abort();
  }, [loadSales]);

  const recentTotal = useMemo(
    () =>
      sales.reduce(
        (sum, sale) => (sale.status === "VOIDED" ? sum : sum + sale.grandTotal),
        0,
      ),
    [sales],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
            Restaurant POS
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-950">
            Сүүлийн борлуулалт
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Dashboard дээр ресторан кассаар бүртгэгдсэн борлуулалтын сүүлийн
            түүх харагдана.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
            {total.toLocaleString("mn-MN")} баримт
          </span>
          <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
            {money(recentTotal)}
          </span>
          <button
            type="button"
            onClick={() => void loadSales()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Шинэчлэх
          </button>
          <Link
            href="/dashboard/restaurant-pos"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800"
          >
            Касс нээх
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Борлуулалтын түүх ачаалж байна...
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
            <ReceiptText className="h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-700">
              Борлуулалтын түүх алга байна
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Restaurant POS дээр борлуулалт хаахад энд автоматаар харагдана.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            {sales.map((sale, index) => {
              const isVoided = sale.status === "VOIDED";
              const statusConfig = saleStatusLabels[sale.status] || {
                label: sale.status,
                className: "bg-amber-50 text-amber-700",
              };

              return (
                <article
                  key={sale.id}
                  className={`grid gap-3 p-4 md:grid-cols-[minmax(0,1.4fr)_110px_120px] md:items-center ${
                    index === 0 ? "" : "border-t border-slate-100"
                  } ${isVoided ? "bg-rose-50/40" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`truncate text-sm font-black ${
                        isVoided ? "text-rose-700 line-through" : "text-slate-950"
                      }`}>
                        {sale.receiptNo}
                      </p>
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                        {paymentLabels[sale.paymentMethod] || sale.paymentMethod}
                      </span>
                      {sale.status !== "COMPLETED" ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${statusConfig.className}`}>
                          {statusConfig.label}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                      {sale.branchName}
                      {sale.registerName ? ` · ${sale.registerName}` : ""} ·{" "}
                      {sale.cashierName}
                    </p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-400">
                      {saleLineSummary(sale)}
                    </p>
                    {isVoided && sale.voidReason ? (
                      <p className="mt-1 truncate text-xs font-bold text-rose-600">
                        {sale.voidReason}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs font-bold text-slate-500 md:text-right">
                    {formatSaleDate(sale.createdAt)}
                  </p>
                  <p className={`text-base font-black tabular-nums md:text-right ${
                    isVoided ? "text-rose-600 line-through" : "text-slate-950"
                  }`}>
                    {money(sale.grandTotal)}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
