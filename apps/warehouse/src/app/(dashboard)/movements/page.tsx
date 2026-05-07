"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Loader2, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, ArrowLeftRight,
  RotateCcw, Package, SlidersHorizontal, X,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

const REASON_MAP: Record<string, { label: string; dot: string; badge: string }> = {
  INITIAL_STOCK:  { label: "Анхны нөөц",       dot: "bg-indigo-500",  badge: "bg-indigo-50 text-indigo-700 ring-indigo-100" },
  RESTOCK:        { label: "Нөхөн дүүргэлт",   dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  ORDER:          { label: "Захиалга",           dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 ring-blue-100" },
  RETURN:         { label: "Буцаалт",            dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 ring-amber-100" },
  ORDER_CANCEL:   { label: "Захиалга цуцлалт",  dot: "bg-red-400",    badge: "bg-red-50 text-red-700 ring-red-100" },
  DAMAGE:         { label: "Гэмтэл",             dot: "bg-red-600",    badge: "bg-red-50 text-red-800 ring-red-100" },
  MANUAL_ADJUST:  { label: "Гар тохиргоо",      dot: "bg-slate-400",  badge: "bg-slate-50 text-slate-700 ring-slate-100" },
  TRANSFER_IN:    { label: "Шилжүүлэг орлого",  dot: "bg-teal-500",   badge: "bg-teal-50 text-teal-700 ring-teal-100" },
  TRANSFER_OUT:   { label: "Шилжүүлэг зарлага", dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 ring-orange-100" },
};

type LedgerEntry = {
  id: string;
  productId: string;
  change: number;
  reason: string;
  note: string | null;
  createdAt: string;
  referenceId: string | null;
  referenceType: string | null;
  product: { id: string; name: string; sku: string | null };
  createdBy: { id: string; email: string; name: string | null } | null;
};

type Pag = { page: number; limit: number; total: number; totalPages: number };
type WarehouseOption = { id: string; name: string };

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("mn-MN", { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" }),
    full: d.toLocaleDateString("mn-MN", { year: "numeric", month: "long", day: "numeric" }),
  };
}

export default function MovementsPage() {
  const [warehouses, setWarehouses]   = useState<WarehouseOption[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [entries, setEntries]         = useState<LedgerEntry[]>([]);
  const [pag, setPag]                 = useState<Pag>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [reason, setReason]           = useState("");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [filterOpen, setFilterOpen]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem("wms_user") || "{}");
        const url = user.organizationId
          ? `${API}/warehouses/organization/${user.organizationId}`
          : `${API}/warehouses`;
        const res = await wmsFetch(url);
        if (res.ok) {
          const data = await res.json();
          const list: WarehouseOption[] = Array.isArray(data) ? data : data.warehouses || [];
          setWarehouses(list);
          if (list.length > 0) setWarehouseId(list[0].id);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const fetchEntries = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (warehouseId) p.set("warehouseId", warehouseId);
      if (reason)      p.set("reason", reason);
      if (dateFrom)    p.set("from", dateFrom);
      if (dateTo)      p.set("to", dateTo);
      p.set("page", String(page));
      p.set("limit", "50");
      const res = await wmsFetch(`${API}/inventory-ledger?${p}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setPag(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [warehouseId, reason, dateFrom, dateTo]);

  useEffect(() => { if (warehouseId) fetchEntries(1); }, [warehouseId, reason, dateFrom, dateTo, fetchEntries]);

  const filtered = search
    ? entries.filter((e) =>
        e.product.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.product.sku?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (e.note?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : entries;

  const totalIn  = entries.filter((e) => e.change > 0).reduce((s, e) => s + e.change, 0);
  const totalOut = entries.filter((e) => e.change < 0).reduce((s, e) => s + Math.abs(e.change), 0);
  const net      = totalIn - totalOut;

  const activeFilters = [reason, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="space-y-4">

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total */}
        <div className="col-span-2 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:col-span-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <ArrowLeftRight className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Нийт</p>
            <p className="text-2xl font-black text-slate-900">{pag.total}</p>
          </div>
        </div>
        {/* In */}
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-600">Орлого</p>
            <p className="text-2xl font-black text-emerald-700">+{totalIn}</p>
          </div>
        </div>
        {/* Out */}
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500">
            <TrendingDown className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-red-600">Зарлага</p>
            <p className="text-2xl font-black text-red-700">-{totalOut}</p>
          </div>
        </div>
        {/* Net */}
        <div className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ${
          net >= 0 ? "bg-blue-50 ring-blue-100" : "bg-orange-50 ring-orange-100"
        }`}>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            net >= 0 ? "bg-blue-500" : "bg-orange-500"
          }`}>
            <ArrowLeftRight className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className={`text-xs font-medium ${net >= 0 ? "text-blue-600" : "text-orange-600"}`}>Цэвэр</p>
            <p className={`text-2xl font-black ${net >= 0 ? "text-blue-700" : "text-orange-700"}`}>
              {net >= 0 ? "+" : ""}{net}
            </p>
          </div>
        </div>
      </div>

      {/* ── Search + filter bar ────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {/* Warehouse selector */}
          {warehouses.length > 1 && (
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {warehouses.map((wh) => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
            </select>
          )}

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Бараа, SKU, тэмдэглэл..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              filterOpen || activeFilters > 0
                ? "border-blue-500 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilters > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {activeFilters}
              </span>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchEntries(pag.page)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Filter panel */}
        {filterOpen && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Шүүлтүүр</p>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setReason(""); setDateFrom(""); setDateTo(""); }}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                >
                  <X className="h-3 w-3" /> Цэвэрлэх
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Reason */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Төрөл</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                >
                  <option value="">Бүгд</option>
                  {Object.entries(REASON_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              {/* Date from */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Эхлэх огноо</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>
              {/* Date to */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Дуусах огноо</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── List ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-100">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl bg-white ring-1 ring-slate-100">
          <Package className="h-10 w-10 text-slate-200" />
          <p className="text-sm font-medium text-slate-400">Хөдөлгөөн олдсонгүй</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">

          {/* ── Desktop table ──────────────────────────────────────────── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3.5 text-left font-semibold">Огноо</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Бараа</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Төрөл</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Өөрчлөлт</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Тэмдэглэл</th>
                  <th className="px-5 py-3.5 text-left font-semibold">Хэрэглэгч</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((entry) => {
                  const r = REASON_MAP[entry.reason] || { label: entry.reason, dot: "bg-slate-400", badge: "bg-slate-50 text-slate-700 ring-slate-100" };
                  const pos = entry.change > 0;
                  const { date, time } = formatDate(entry.createdAt);
                  return (
                    <tr key={entry.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-xs font-semibold text-slate-700">{date}</p>
                        <p className="text-[11px] text-slate-400">{time}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{entry.product.name}</p>
                        {entry.product.sku && <p className="font-mono text-xs text-slate-400">{entry.product.sku}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${r.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
                          {r.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`inline-flex items-center gap-1 text-base font-black ${pos ? "text-emerald-600" : "text-red-600"}`}>
                          {pos ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {pos ? "+" : ""}{entry.change}
                        </span>
                      </td>
                      <td className="max-w-[180px] truncate px-5 py-3.5 text-xs text-slate-500">{entry.note || "—"}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {entry.createdBy?.name || entry.createdBy?.email || "Систем"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile card list ───────────────────────────────────────── */}
          <div className="divide-y divide-slate-100 md:hidden">
            {filtered.map((entry) => {
              const r = REASON_MAP[entry.reason] || { label: entry.reason, dot: "bg-slate-400", badge: "bg-slate-50 text-slate-700 ring-slate-100" };
              const pos = entry.change > 0;
              const { date, time } = formatDate(entry.createdAt);
              return (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3.5">
                  {/* Left: colored dot timeline */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`h-3 w-3 rounded-full ring-2 ring-white ${r.dot}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{entry.product.name}</p>
                        {entry.product.sku && (
                          <p className="font-mono text-xs text-slate-400">{entry.product.sku}</p>
                        )}
                      </div>
                      {/* Change amount */}
                      <span className={`shrink-0 text-lg font-black ${pos ? "text-emerald-600" : "text-red-600"}`}>
                        {pos ? "+" : ""}{entry.change}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${r.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
                        {r.label}
                      </span>
                      <span className="text-xs text-slate-400">{date} · {time}</span>
                    </div>

                    {(entry.note || entry.createdBy) && (
                      <p className="mt-1.5 truncate text-xs text-slate-400">
                        {[entry.note, entry.createdBy?.name || entry.createdBy?.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pag.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-slate-700">{pag.total}</span> бичилт · {pag.page}/{pag.totalPages} хуудас
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => fetchEntries(pag.page - 1)}
                  disabled={pag.page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fetchEntries(pag.page + 1)}
                  disabled={pag.page >= pag.totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
