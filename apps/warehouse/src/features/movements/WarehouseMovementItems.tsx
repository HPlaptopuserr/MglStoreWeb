"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Package,
  Filter,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";
import {
  ALL_REASONS,
  REASON_MAP,
  type LedgerEntry,
  type Pagination,
} from "./movement-ledger.model";
import { MovementItemsTable } from "./MovementItemsTable";
import { MovementItemsSummary } from "./MovementItemsSummary";

export function WarehouseMovementItems({
  warehouseId,
  dateFrom,
  dateTo,
}: {
  warehouseId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reason, setReason] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");

  const fetchEntries = useCallback(
    async (page = 1, signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (warehouseId) params.set("warehouseId", warehouseId);
        if (reason) params.set("reason", reason);
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);
        if (debouncedSearch) params.set("search", debouncedSearch);
        params.set("page", String(page));
        params.set("limit", "50");

        const res = await wmsFetch(
          `${API}/inventory-ledger?${params.toString()}`,
          { signal },
        );
        if (!res.ok)
          throw new Error("Хөдөлгөөн ачаалж чадсангүй. Дахин оролдоно уу.");
        if (!signal?.aborted) {
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
      } catch (loadError) {
        if (!signal?.aborted)
          setError(
            loadError instanceof Error ? loadError.message : "Алдаа гарлаа",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [warehouseId, reason, dateFrom, dateTo, debouncedSearch],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    if (warehouseId) void fetchEntries(1, controller.signal);
    return () => controller.abort();
  }, [warehouseId, reason, dateFrom, dateTo, fetchEntries]);

  return (
    <div className="min-w-0 space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <MovementItemsSummary entries={entries} total={pagination.total} />

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Warehouse */}
          {/* Search */}
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Барааны хөдөлгөөн хайх"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Барааны нэр, SKU, баркод, SR/DSP дугаар хайх..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Advanced filters toggle */}
          <button
            aria-expanded={showFilters}
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
            aria-label="Хөдөлгөөн шинэчлэх"
            disabled={loading}
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
              <label
                htmlFor="movement-reason"
                className="mb-1 block text-xs font-semibold text-slate-500"
              >
                Төрөл
              </label>
              <select
                id="movement-reason"
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

            {reason && (
              <button
                onClick={() => {
                  setReason("");
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
      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
            <Package className="h-8 w-8" />
            <p className="text-sm">Хөдөлгөөн олдсонгүй</p>
          </div>
        ) : (
          <MovementItemsTable entries={entries} />
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
                aria-label="Өмнөх хуудас"
                disabled={loading || pagination.page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => fetchEntries(pagination.page + 1)}
                aria-label="Дараагийн хуудас"
                disabled={loading || pagination.page >= pagination.totalPages}
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
