"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { useWarehouseScope } from "@/features/warehouse-scope/WarehouseScopeProvider";

interface InvestorReportFiltersProps {
  from: string;
  to: string;
  onDateChange: (key: "from" | "to", value: string) => void;
  onWarehouseChange: (id: string) => void;
  onReset: () => void;
}

const fieldClass =
  "mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export function InvestorReportFilters({
  from,
  to,
  onDateChange,
  onWarehouseChange,
  onReset,
}: InvestorReportFiltersProps) {
  const scope = useWarehouseScope();
  const period =
    from || to
      ? `${from || "Эхнээс"} → ${to || "Өнөөдрийг хүртэл"}`
      : "Бүх хугацаа";
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 sm:flex-row sm:items-start sm:p-4">
      {scope.warehouses.length > 1 && (
        <label className="min-w-0 flex-1 text-xs font-medium text-slate-500">
          Дэлгүүр
          <select
            className={fieldClass}
            value={scope.selectedWarehouseId}
            onChange={(event) => onWarehouseChange(event.target.value)}
          >
            {scope.warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <details className="group min-w-0 flex-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl px-2 text-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
          <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <CalendarDays className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium text-slate-500">
              Борлуулалтын хугацаа
            </span>
            <span className="block truncate font-semibold text-slate-800">
              {period}
            </span>
          </span>
          <ChevronDown className="size-4 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          {(
            [
              { key: "from", label: "Эхлэх огноо" },
              { key: "to", label: "Дуусах огноо" },
            ] as const
          ).map(({ key, label }) => (
            <label
              key={key}
              className="min-w-0 text-xs font-medium text-slate-500"
            >
              {label}
              <input
                className={fieldClass}
                type="date"
                value={key === "from" ? from : to}
                max={key === "from" ? to || undefined : undefined}
                min={key === "to" ? from || undefined : undefined}
                onChange={(event) => onDateChange(key, event.target.value)}
              />
            </label>
          ))}
          <button
            type="button"
            onClick={onReset}
            className="col-span-2 min-h-10 rounded-xl bg-blue-50 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Бүх хугацааг харах
          </button>
        </div>
      </details>
    </div>
  );
}
