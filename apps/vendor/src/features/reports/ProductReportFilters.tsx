"use client";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import {
  emptyProductReportFilters,
  isValidReportRange,
  type ProductReportFilters as Filters,
} from "./product-report-filters";

interface Props {
  filters: Filters;
  categories: string[];
  count: number;
  onChange: (filters: Filters) => void;
}
const fieldClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";
export function ProductReportFilters({
  filters,
  categories,
  count,
  onChange,
}: Props) {
  const invalid = !isValidReportRange(filters.from, filters.to);
  const active =
    JSON.stringify(filters) !== JSON.stringify(emptyProductReportFilters);
  return (
    <section
      data-tour="report-filters"
      aria-label="Бүтээгдэхүүний шүүлтүүр"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Бүтээгдэхүүн шүүх
          </h2>
          <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
            {count} бараа
          </span>
        </div>
        {active && (
          <button
            type="button"
            onClick={() => onChange({ ...emptyProductReportFilters })}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-indigo-600"
          >
            <RotateCcw size={14} />
            Бүх шүүлтүүрийг цэвэрлэх
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600 sm:col-span-2">
          Нэр, SKU эсвэл баркод
          <span className="relative">
            <Search
              size={16}
              className="absolute left-3 top-3.5 text-slate-400"
            />
            <input
              value={filters.search}
              onChange={(event) =>
                onChange({ ...filters, search: event.target.value })
              }
              placeholder="Бараа хайх…"
              className={`${fieldClass} pl-9`}
            />
          </span>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
          Төлөв
          <select
            value={filters.status}
            onChange={(event) =>
              onChange({
                ...filters,
                status: event.target.value as Filters["status"],
              })
            }
            className={fieldClass}
          >
            <option value="all">Бүх төлөв</option>
            <option value="active">Идэвхтэй</option>
            <option value="inactive">Идэвхгүй</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
          Ангилал
          <select
            value={filters.category}
            onChange={(event) =>
              onChange({ ...filters, category: event.target.value })
            }
            className={fieldClass}
          >
            <option value="all">Бүх ангилал</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details
        className="mt-4 rounded-xl bg-slate-50 p-3"
        open={filters.from || filters.to ? true : undefined}
      >
        <summary className="cursor-pointer text-sm font-semibold text-slate-600">
          Бүртгэсэн / хүлээн авсан огноогоор шүүх ·{" "}
          {filters.from || filters.to ? "Сонгосон хугацаа" : "Бүх хугацаа"}
        </summary>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Сонгосон хугацаанд бүртгэсэн эсвэл хүлээн авсан барааг харуулна.
          Үлдэгдэл, үнэ нь одоогийн утгаар тооцогдоно.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
            Эхлэх огноо
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              aria-invalid={invalid}
              onChange={(event) =>
                onChange({ ...filters, from: event.target.value })
              }
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
            Дуусах огноо
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              aria-invalid={invalid}
              onChange={(event) =>
                onChange({ ...filters, to: event.target.value })
              }
              className={fieldClass}
            />
          </label>
        </div>
        {invalid && (
          <p role="alert" className="mt-2 text-sm text-rose-700">
            Эхлэх огноо дуусах огнооноос хойш байна.
          </p>
        )}
      </details>
    </section>
  );
}
