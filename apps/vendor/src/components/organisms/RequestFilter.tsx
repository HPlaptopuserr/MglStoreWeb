"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  Filter,
} from "lucide-react";

type StockRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

type Warehouse = {
  id: string;
  name: string;
};

type FilterableRequest = {
  id: string;
  requestNumber: string;
  status: StockRequestStatus;
  requestedAt: string;
  warehouse: { id: string; name: string };
};

const STATUS_OPTIONS: { value: StockRequestStatus; label: string; color: string }[] = [
  { value: "PENDING", label: "Хүлээгдэж буй", color: "amber" },
  { value: "APPROVED", label: "Зөвшөөрөгдсөн", color: "green" },
  { value: "PROCESSING", label: "Боловсруулж буй", color: "blue" },
  { value: "COMPLETED", label: "Дууссан", color: "slate" },
  { value: "REJECTED", label: "Татгалзсан", color: "red" },
  { value: "CANCELLED", label: "Цуцлагдсан", color: "slate" },
];

const STATUS_BADGE: Record<StockRequestStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  PROCESSING: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-400 border-slate-200",
};

const DATE_PRESETS = [
  { label: "Бүгд", days: 0 },
  { label: "Өнөөдөр", days: 1 },
  { label: "7 хоног", days: 7 },
  { label: "30 хоног", days: 30 },
  { label: "90 хоног", days: 90 },
];

export interface RequestFilterState {
  search: string;
  statuses: StockRequestStatus[];
  warehouseId: string;
  days: number;
}

interface RequestFilterProps {
  requests: FilterableRequest[];
  warehouses: Warehouse[];
  onChange: (filtered: FilterableRequest[], state: RequestFilterState) => void;
}

export function RequestFilter({ requests, warehouses, onChange }: RequestFilterProps) {
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<StockRequestStatus[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [days, setDays] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const activeFilterCount =
    (selectedStatuses.length > 0 ? 1 : 0) +
    (warehouseId ? 1 : 0) +
    (days > 0 ? 1 : 0);

  const apply = useCallback(
    (
      q: string,
      statuses: StockRequestStatus[],
      wId: string,
      d: number,
    ) => {
      const cutoff = d > 0 ? Date.now() - d * 86_400_000 : 0;
      const filtered = requests.filter((r) => {
        const matchSearch =
          !q ||
          r.requestNumber.toLowerCase().includes(q.toLowerCase()) ||
          r.warehouse.name.toLowerCase().includes(q.toLowerCase());
        const matchStatus = statuses.length === 0 || statuses.includes(r.status);
        const matchWarehouse = !wId || r.warehouse.id === wId;
        const matchDate = !cutoff || new Date(r.requestedAt).getTime() >= cutoff;
        return matchSearch && matchStatus && matchWarehouse && matchDate;
      });
      onChangeRef.current(filtered, {
        search: q,
        statuses,
        warehouseId: wId,
        days: d,
      });
    },
    [requests],
  );

  useEffect(() => {
    apply(search, selectedStatuses, warehouseId, days);
  }, [apply, search, selectedStatuses, warehouseId, days]);

  const toggleStatus = (s: StockRequestStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const reset = () => {
    setSearch("");
    setSelectedStatuses([]);
    setWarehouseId("");
    setDays(0);
  };

  const hasAny = search || selectedStatuses.length > 0 || warehouseId || days > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Search row */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Хүсэлтийн дугаар, агуулахаар хайх..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm outline-none transition-all focus:border-[#FFAD02] focus:bg-white focus:ring-2 focus:ring-[#FFAD02]/10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`relative inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-all ${
            showFilters || activeFilterCount > 0
              ? "border-[#FFAD02] bg-[#FFAD02]/5 text-[#FFAD02]"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Шүүлтүүр</span>
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FFAD02] text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasAny && (
          <button
            onClick={reset}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-500 hover:border-slate-300 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Цэвэрлэх</span>
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50/50">
          {/* Status filter */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Filter className="h-3 w-3" />
              Төлөв
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const active = selectedStatuses.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleStatus(opt.value)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                      active
                        ? `${STATUS_BADGE[opt.value]} ring-1 ring-current`
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {active && <span className="mr-1">✓</span>}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warehouse filter */}
          {warehouses.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Агуулах
              </p>
              <div className="relative">
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 outline-none focus:border-[#FFAD02] focus:ring-2 focus:ring-[#FFAD02]/10"
                >
                  <option value="">Бүх агуулах</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}

          {/* Date preset filter */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Хугацаа
            </p>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setDays(preset.days)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                    days === preset.days
                      ? "border-[#FFAD02] bg-[#FFAD02]/10 text-[#FFAD02]"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
