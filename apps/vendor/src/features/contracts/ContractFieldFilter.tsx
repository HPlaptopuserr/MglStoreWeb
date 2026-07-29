import { CalendarRange, Filter, Search, X } from "lucide-react";
import type { ArchiveFieldDefinition } from "./types";

export function ContractFieldFilter({
  fields,
  selected,
  fieldKey,
  value,
  dateFrom,
  dateTo,
  onFieldChange,
  onValueChange,
  onDateFromChange,
  onDateToChange,
  onClear,
}: {
  fields: ArchiveFieldDefinition[];
  selected: ArchiveFieldDefinition | null;
  fieldKey: string;
  value: string;
  dateFrom: string;
  dateTo: string;
  onFieldChange: (key: string) => void;
  onValueChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="grid gap-2 border-t border-slate-100 pt-3 md:grid-cols-[240px_minmax(0,1fr)_auto]">
      <label className="relative">
        <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <span className="sr-only">Шүүх талбар сонгох</span>
        <select
          value={fieldKey}
          onChange={(event) => onFieldChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
        >
          <option value="">Талбараар шүүх</option>
          {fields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
        </select>
      </label>

      {!selected ? (
        <div className="flex h-10 items-center rounded-xl bg-slate-50 px-3 text-xs font-semibold text-slate-400">
          Гэрээнд утга оруулсан талбараас сонгоно уу
        </div>
      ) : selected.type === "date" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="relative">
            <span className="sr-only">Эхлэх огноо</span>
            <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-300 pl-9 pr-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
          </label>
          <label>
            <span className="sr-only">Дуусах огноо</span>
            <input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
          </label>
        </div>
      ) : (
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">{selected.label} утгаар шүүх</span>
          <input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={`${selected.label} утга оруулах...`}
            className="h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          />
        </label>
      )}

      <button
        type="button"
        onClick={onClear}
        disabled={!selected}
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <X className="h-3.5 w-3.5" /> Цэвэрлэх
      </button>
    </div>
  );
}
