"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  RotateCcw,
  Package,
  Calendar,
  Filter,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

const REASON_MAP: Record<string, { label: string; color: string; icon: string }> = {
  ORDER: { label: "Захиалга", color: "bg-blue-100 text-blue-700", icon: "📦" },
  RETURN: { label: "Буцаалт", color: "bg-amber-100 text-amber-700", icon: "↩️" },
  RESTOCK: { label: "Нөхөн дүүргэлт", color: "bg-emerald-100 text-emerald-700", icon: "📥" },
  MANUAL_ADJUST: { label: "Гар тохиргоо", color: "bg-slate-100 text-slate-700", icon: "✏️" },
  ORDER_CANCEL: { label: "Захиалга цуцлалт", color: "bg-red-100 text-red-700", icon: "❌" },
  DAMAGE: { label: "Гэмтэл", color: "bg-red-100 text-red-700", icon: "💥" },
  TRANSFER_IN: { label: "Шилжүүлэг орлого", color: "bg-teal-100 text-teal-700", icon: "📥" },
  TRANSFER_OUT: { label: "Шилжүүлэг зарлага", color: "bg-orange-100 text-orange-700", icon: "📤" },
  INITIAL_STOCK: { label: "Анхны нөөц", color: "bg-indigo-100 text-indigo-700", icon: "🏁" },
};

const ALL_REASONS = Object.keys(REASON_MAP);

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

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type WarehouseOption = { id: string; name: string };

export default function MovementsPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Load warehouses
  useEffect(() => {
    const load = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("wms_user") || "{}");
        let url = `${API}/warehouses`;
        if (user.organizationId) {
          url = `${API}/warehouses/organization/${user.organizationId}`;
        }
        const res = await wmsFetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.warehouses || [];
          setWarehouses(list);
          if (list.length > 0) setWarehouseId(list[0].id);
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  const fetchEntries = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (warehouseId) params.set("warehouseId", warehouseId);
        if (reason) params.set("reason", reason);
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);
        params.set("page", String(page));
        params.set("limit", "50");

        const res = await wmsFetch(
          `${API}/inventory-ledger?${params.toString()}`,
        );
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries || []);
          setPagination(
            data.pagination || {
              page: 1,
              limit: 50,
              total: 0,
              totalPages: 0,
            },
          );
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    },
    [warehouseId, reason, dateFrom, dateTo],
  );

  useEffect(() => {
    if (warehouseId) fetchEntries(1);
  }, [warehouseId, reason, dateFrom, dateTo, fetchEntries]);

  const filtered = search
    ? entries.filter(
        (e) =>
          e.product.name.toLowerCase().includes(search.toLowerCase()) ||
          (e.product.sku?.toLowerCase().includes(search.toLowerCase()) ??
            false) ||
          (e.note?.toLowerCase().includes(search.toLowerCase()) ?? false),
      )
    : entries;

  // Stats
  const inCount = entries.filter((e) => e.change > 0).length;
  const outCount = entries.filter((e) => e.change < 0).length;
  const totalIn = entries
    .filter((e) => e.change > 0)
    .reduce((s, e) => s + e.change, 0);
  const totalOut = entries
    .filter((e) => e.change < 0)
    .reduce((s, e) => s + Math.abs(e.change), 0);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Нийт хөдөлгөөн
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {pagination.total}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Орлого
            </p>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            +{totalIn}
          </p>
          <p className="text-xs text-slate-400">{inCount} бичилт</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
              Зарлага
            </p>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-600">-{totalOut}</p>
          <p className="text-xs text-slate-400">{outCount} бичилт</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-blue-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Цэвэр өөрчлөлт
            </p>
          </div>
          <p
            className={`mt-1 text-2xl font-bold ${
              totalIn - totalOut >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {totalIn - totalOut >= 0 ? "+" : ""}
            {totalIn - totalOut}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          {/* Warehouse */}
          <div className="relative">
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="h-10 appearance-none rounded-lg border border-slate-300 bg-slate-50 pl-3 pr-8 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Бараа, SKU, тэмдэглэл хайх..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
              showFilters
                ? "border-blue-300 bg-blue-50 text-blue-600"
                : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Filter className="h-4 w-4" />
            Шүүлтүүр
          </button>

          <button
            onClick={() => fetchEntries(1)}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3">
            {/* Reason */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Төрөл
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Бүгд</option>
                {ALL_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REASON_MAP[r].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Эхлэх огноо
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Дуусах огноо
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {(reason || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setReason("");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="mt-5 text-xs font-medium text-blue-600 hover:underline"
              >
                Цэвэрлэх
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
            <Package className="h-8 w-8" />
            <p className="text-sm">Хөдөлгөөн олдсонгүй</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left font-semibold">Огноо</th>
                  <th className="px-4 py-3 text-left font-semibold">Бараа</th>
                  <th className="px-4 py-3 text-left font-semibold">Төрөл</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Өөрчлөлт
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Тэмдэглэл
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Хэрэглэгч
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const r = REASON_MAP[entry.reason] || {
                    label: entry.reason,
                    color: "bg-slate-100 text-slate-700",
                    icon: "•",
                  };
                  const isPositive = entry.change > 0;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-300" />
                          <div>
                            <p className="text-xs font-medium text-slate-700">
                              {new Date(entry.createdAt).toLocaleDateString(
                                "mn-MN",
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(entry.createdAt).toLocaleTimeString(
                                "mn-MN",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {entry.product.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {entry.product.sku || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${r.color}`}
                        >
                          <span className="text-[10px]">{r.icon}</span>
                          {r.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-bold ${
                            isPositive ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {isPositive ? "+" : ""}
                          {entry.change}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-500">
                        {entry.note || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {entry.createdBy?.name ||
                          entry.createdBy?.email ||
                          "Систем"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400">
              Нийт {pagination.total} бичилт · Хуудас {pagination.page}/
              {pagination.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchEntries(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => fetchEntries(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
