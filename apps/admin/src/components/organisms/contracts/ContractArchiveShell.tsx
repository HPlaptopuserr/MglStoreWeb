"use client";

import {
  Archive,
  ChevronDown,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";

type StatusFilter = "ALL" | "SIGNED" | "PENDING" | "EXPIRING" | "EXPIRED";

type StatusCard = {
  key: StatusFilter;
  label: string;
  count: number;
  tone: "slate" | "emerald" | "amber" | "orange" | "rose";
  icon: React.ElementType;
};

const toneClasses: Record<
  StatusCard["tone"],
  { active: string; icon: string; badge: string; progress: string }
> = {
  slate: {
    active: "border-slate-900 bg-slate-950 text-white",
    icon: "bg-slate-100 text-slate-600",
    badge: "bg-slate-100 text-slate-700",
    progress: "bg-slate-900",
  },
  emerald: {
    active: "border-emerald-500 bg-emerald-600 text-white",
    icon: "bg-emerald-100 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    progress: "bg-emerald-500",
  },
  amber: {
    active: "border-amber-500 bg-amber-500 text-white",
    icon: "bg-amber-100 text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    progress: "bg-amber-500",
  },
  orange: {
    active: "border-orange-500 bg-orange-500 text-white",
    icon: "bg-orange-100 text-orange-700",
    badge: "bg-orange-100 text-orange-700",
    progress: "bg-orange-500",
  },
  rose: {
    active: "border-rose-500 bg-rose-600 text-white",
    icon: "bg-rose-100 text-rose-700",
    badge: "bg-rose-100 text-rose-700",
    progress: "bg-rose-500",
  },
};

export function ContractArchiveHeader({
  total,
  filtered,
  loading,
  onRegister,
  onRefresh,
}: {
  total: number;
  filtered: number;
  loading: boolean;
  onRegister: () => void;
  onRefresh: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Archive className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              Contract archive
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Гэрээний архив
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Байгуулсан гэрээ, скандсан файл, гарын үсэг, хугацаа болон холбоо
              барих мэдээллийг нэг архив дээрээс хайж, шүүж, татаж авна.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Нийт
            </p>
            <p className="mt-0.5 text-xl font-black text-slate-950">{total}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
            <p className="text-[11px] font-black uppercase tracking-wider text-blue-500">
              Харагдаж буй
            </p>
            <p className="mt-0.5 text-xl font-black text-blue-700">
              {filtered}
            </p>
          </div>
          <button
            type="button"
            onClick={onRegister}
            className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 sm:col-span-1"
          >
            <Upload className="h-4 w-4" />
            Скан гэрээ
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 sm:col-span-1"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Шинэчлэх
          </button>
        </div>
      </div>
    </section>
  );
}

export function ContractStatusCards({
  filters,
  active,
  total,
  onSelect,
}: {
  filters: StatusCard[];
  active: StatusFilter;
  total: number;
  onSelect: (key: StatusFilter) => void;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isActive = active === filter.key;
        const percent = total > 0 ? Math.round((filter.count / total) * 100) : 0;
        const tone = toneClasses[filter.tone];

        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => onSelect(filter.key)}
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${
              isActive
                ? `${tone.active} shadow-md`
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isActive ? "bg-white/15 text-white" : tone.icon
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                  isActive ? "bg-white/15 text-white" : tone.badge
                }`}
              >
                {percent}%
              </span>
            </div>
            <p
              className={`mt-4 text-[11px] font-black uppercase tracking-wider ${
                isActive ? "text-white/75" : "text-slate-500"
              }`}
            >
              {filter.label}
            </p>
            <p
              className={`mt-1 text-3xl font-black ${
                isActive ? "text-white" : "text-slate-950"
              }`}
            >
              {filter.count}
            </p>
            <div
              className={`mt-3 h-1.5 overflow-hidden rounded-full ${
                isActive ? "bg-white/20" : "bg-slate-100"
              }`}
            >
              <div
                className={`h-full rounded-full ${
                  isActive ? "bg-white" : tone.progress
                }`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
          </button>
        );
      })}
    </section>
  );
}

export function ContractArchiveFilters({
  search,
  planFilter,
  plansList,
  filteredCount,
  onSearchChange,
  onPlanFilterChange,
}: {
  search: string;
  planFilter: string;
  plansList: string[];
  filteredCount: number;
  onSearchChange: (value: string) => void;
  onPlanFilterChange: (value: string) => void;
}) {
  return (
    <section className="sticky top-3 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <div className="grid gap-3 lg:grid-cols-[1fr_260px_auto] lg:items-center">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Байгууллага, регистр, утас, и-мэйлээр хайх..."
            className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={planFilter}
            onChange={(event) => onPlanFilterChange(event.target.value)}
            className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 pr-9 text-sm font-black text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          >
            <option value="ALL">Бүх гэрээний багц</option>
            {plansList.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex h-11 items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">
          <span>Шүүгдсэн үр дүн</span>
          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs text-white">
            {filteredCount}
          </span>
        </div>
      </div>
    </section>
  );
}
