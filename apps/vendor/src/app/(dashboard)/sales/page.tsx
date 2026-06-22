"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  RefreshCw,
  ReceiptText,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";
import { sendAllLocalEbarimtInvalidReceipts, sendLocalEbarimtData } from "@/features/pos/api/ebarimt";

/* ── Types ─────────────────────────────────────────────── */
type SaleLine = {
  productId: string;
  productName: string;
  productSku: string | null;
  qty: number;
  unitPrice: number;
  taxAmount: number;
  discount: number;
  lineTotal: number;
};

type Sale = {
  id: string;
  receiptNo: string;
  branchName: string;
  registerName: string | null;
  cashierName: string;
  paymentMethod: string;
  status: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  createdAt: string;
  lines: SaleLine[];
};

type SalesResponse = {
  total: number;
  page: number;
  limit: number;
  pages: number;
  sales: Sale[];
};

/* ── Helpers ────────────────────────────────────────────── */
const PAY_LABELS: Record<string, string> = {
  CASH: "Бэлэн",
  CARD: "Карт",
  QPAY: "QPay",
  MIXED: "Холимог",
};

const fmt = (n: number) =>
  n.toLocaleString("mn-MN", { minimumFractionDigits: 0 });

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/* ── Component ──────────────────────────────────────────── */
export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ebarimtSyncing, setEbarimtSyncing] = useState(false);
  const [ebarimtSyncMessage, setEbarimtSyncMessage] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        from: `${fromDate}T00:00:00.000Z`,
        to: `${toDate}T23:59:59.999Z`,
        page: String(p),
        limit: "50",
      });
      const res = await authFetch(`${API}/pos/sales/history?${params}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Алдаа гарлаа");
      }
      const data: SalesResponse = await res.json();
      setSales(data.sales);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } catch (e: any) {
      setError(e.message || "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { load(1); }, [load]);

  const syncEbarimt = async () => {
    setEbarimtSyncing(true);
    setEbarimtSyncMessage(null);
    try {
      const invalidSummary = await sendAllLocalEbarimtInvalidReceipts();
      const info = await sendLocalEbarimtData();
      const lastSentDate = info.lastSentDate || "-";

      setEbarimtSyncMessage(
        invalidSummary.total > 0
          ? `eBarimt invalid sent ${invalidSummary.sent}/${invalidSummary.total}, failed ${invalidSummary.failed.length}. lastSentDate: ${lastSentDate}`
          : `eBarimt invalid list empty; sendData done. lastSentDate: ${lastSentDate}`,
      );
    } catch (e: any) {
      setEbarimtSyncMessage(e?.message || "eBarimt sync failed");
    } finally {
      setEbarimtSyncing(false);
    }
  };

  const filtered = search.trim()
    ? sales.filter(
        (s) =>
          s.receiptNo.toLowerCase().includes(search.toLowerCase()) ||
          s.cashierName.toLowerCase().includes(search.toLowerCase()) ||
          s.lines.some((l) => l.productName.toLowerCase().includes(search.toLowerCase())),
      )
    : sales;

  /* ── Summary ─────────────────────────────────────────── */
  const totalRevenue = filtered.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalItems = filtered.reduce((sum, s) => sum + s.lines.reduce((a, l) => a + l.qty, 0), 0);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
            <ReceiptText className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Борлуулалтын түүх</h1>
            <p className="text-sm text-slate-500">POS гүйлгээний бүртгэл</p>
          </div>
        </div>
        <button
          onClick={syncEbarimt}
          disabled={ebarimtSyncing}
          className="flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${ebarimtSyncing ? "animate-spin" : ""}`} />
          eBarimt SendData
        </button>
        <button
          onClick={() => load(1)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Шинэчлэх
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Эхлэх огноо</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Дуусах огноо</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>
        <button
          onClick={() => load(1)}
          disabled={loading}
          className="h-9 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          Хайх
        </button>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Баримт №, нэр, бараа..."
            className="h-9 rounded-lg border border-slate-200 pl-9 pr-3 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Нийт гүйлгээ", value: `${filtered.length} / ${total}` },
          { label: "Нийт орлого", value: `₮${fmt(totalRevenue)}` },
          { label: "Нийт ширхэг", value: `${totalItems} ш` },
          { label: "Дундаж чек", value: filtered.length ? `₮${fmt(Math.round(totalRevenue / filtered.length))}` : "—" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.label}</p>
            <p className="mt-1 text-xl font-black text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {ebarimtSyncMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {ebarimtSyncMessage}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-700">Гүйлгээний жагсаалт</span>
          <span className="ml-auto text-xs text-slate-400">{filtered.length} гүйлгээ</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin h-6 w-6 text-violet-400" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Receipt className="h-10 w-10 mb-2" />
            <p className="text-sm font-medium">Гүйлгээ олдсонгүй</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="divide-y divide-slate-100">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span>Баримт / Огноо</span>
              <span>Салбар / Касс</span>
              <span>Худалдагч</span>
              <span>Төлбөр</span>
              <span className="text-right">Дүн</span>
              <span></span>
            </div>

            {filtered.map((sale) => {
              const expanded = expandedId === sale.id;
              return (
                <div key={sale.id}>
                  {/* Main row */}
                  <button
                    onClick={() => setExpandedId(expanded ? null : sale.id)}
                    className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 items-center text-left hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900 font-mono">{sale.receiptNo}</p>
                      <p className="text-xs text-slate-500">{fmtDate(sale.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-700">{sale.branchName}</p>
                      {sale.registerName && <p className="text-xs text-slate-400">{sale.registerName}</p>}
                    </div>
                    <p className="text-sm text-slate-700">{sale.cashierName}</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold w-fit ${
                      sale.paymentMethod === "CASH" ? "bg-emerald-50 text-emerald-700" :
                      sale.paymentMethod === "CARD" ? "bg-blue-50 text-blue-700" :
                      sale.paymentMethod === "QPAY" ? "bg-violet-50 text-violet-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {PAY_LABELS[sale.paymentMethod] || sale.paymentMethod}
                    </span>
                    <p className="text-sm font-bold text-slate-900 text-right">₮{fmt(sale.grandTotal)}</p>
                    {expanded
                      ? <ChevronDown className="h-4 w-4 text-slate-400" />
                      : <ChevronRight className="h-4 w-4 text-slate-400" />
                    }
                  </button>

                  {/* Expanded lines */}
                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Барааны жагсаалт</p>
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-slate-50 text-xs font-bold text-slate-400 uppercase">
                          <span>Бараа</span>
                          <span className="text-right">Тоо</span>
                          <span className="text-right">Нэгж үнэ</span>
                          <span className="text-right">Хөнгөлөлт</span>
                          <span className="text-right">Нийт</span>
                        </div>
                        {sale.lines.map((line, li) => (
                          <div key={li} className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 border-t border-slate-100 text-sm">
                            <div>
                              <p className="font-medium text-slate-900">{line.productName}</p>
                              {line.productSku && <p className="text-xs text-slate-400">{line.productSku}</p>}
                            </div>
                            <p className="text-right text-slate-700">{line.qty} ш</p>
                            <p className="text-right text-slate-700">₮{fmt(line.unitPrice)}</p>
                            <p className="text-right text-slate-500">{line.discount > 0 ? `-₮${fmt(line.discount)}` : "—"}</p>
                            <p className="text-right font-semibold text-slate-900">₮{fmt(line.lineTotal)}</p>
                          </div>
                        ))}
                        <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 border-t border-slate-200 bg-slate-50 text-sm font-bold">
                          <span className="text-slate-500">Нийт дүн</span>
                          <span className="text-right text-slate-700">{sale.lines.reduce((a, l) => a + l.qty, 0)} ш</span>
                          <span></span>
                          <span className="text-right text-slate-500">{sale.discountTotal > 0 ? `-₮${fmt(sale.discountTotal)}` : "—"}</span>
                          <span className="text-right text-violet-700">₮{fmt(sale.grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => load(p)}
              className={`h-8 w-8 rounded-lg text-sm font-semibold ${p === page ? "bg-violet-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
