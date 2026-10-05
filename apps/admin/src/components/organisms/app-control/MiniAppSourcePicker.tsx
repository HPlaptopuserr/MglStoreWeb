"use client";
import { useId, useMemo, useState } from "react";
import { Check, Search, X, PackageOpen } from "lucide-react";
import type { StoreMiniAppOption } from "@mgl/types";

interface Props {
  options: StoreMiniAppOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  label: string;
}
export function MiniAppSourcePicker({
  options,
  selected,
  onChange,
  label,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const inputId = useId();
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const names = useMemo(
    () => new Map(options.map((option) => [option.id, option.name])),
    [options],
  );
  const visible = useMemo(
    () =>
      options.filter(
        (option) =>
          (!selectedOnly || selectedIds.has(option.id)) &&
          option.name
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [options, selectedOnly, selectedIds, query],
  );
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-3 text-sm font-semibold text-slate-800">
        {label}
      </legend>
      <div className="relative">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 top-3 text-slate-400"
        />
        <label htmlFor={inputId} className="sr-only">
          {label} хайх
        </label>
        <input
          id={inputId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Нэрээр хайх…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-50"
        />
        {query && (
          <button
            type="button"
            aria-label="Хайлтыг цэвэрлэх"
            onClick={() => setQuery("")}
            className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            aria-pressed={!selectedOnly}
            onClick={() => setSelectedOnly(false)}
            className={`rounded-md px-2.5 py-1.5 transition ${!selectedOnly ? "bg-white font-semibold text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Бүгд {options.length}
          </button>
          <button
            type="button"
            aria-pressed={selectedOnly}
            onClick={() => setSelectedOnly(true)}
            className={`rounded-md px-2.5 py-1.5 transition ${selectedOnly ? "bg-white font-semibold text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Сонгосон {selected.length}
          </button>
        </div>
        <span className="text-slate-400">Олон сонголттой</span>
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 p-1.5 [scrollbar-gutter:stable]">
        {!visible.length && (
          <div className="flex flex-col items-center gap-2 px-3 py-7 text-center text-slate-400">
            <PackageOpen size={24} />
            <p className="text-sm">
              {query
                ? "Хайлтад тохирох илэрц алга"
                : selectedOnly
                  ? "Эх үүсвэр сонгоогүй байна"
                  : "Эх үүсвэр олдсонгүй"}
            </p>
          </div>
        )}
        {visible.map((option) => (
          <label
            key={option.id}
            className={`group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${selectedIds.has(option.id) ? "border-violet-100 bg-violet-50 text-violet-900" : "border-transparent text-slate-600 hover:bg-slate-50"}`}
          >
            <input
              type="checkbox"
              className="peer sr-only"
              checked={selectedIds.has(option.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.id]
                    : selected.filter((id) => id !== option.id),
                )
              }
            />
            <span
              aria-hidden
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border peer-focus-visible:ring-4 peer-focus-visible:ring-violet-200 ${selectedIds.has(option.id) ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white"}`}
            >
              {selectedIds.has(option.id) && (
                <Check size={11} strokeWidth={3} />
              )}
            </span>
            <span className="min-w-0 break-words leading-5">{option.name}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
          {selected.map((id) => (
            <span
              key={id}
              className={`inline-flex max-w-full items-center gap-1 rounded-lg py-1 pl-2.5 pr-1 text-xs ${names.has(id) ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-800"}`}
            >
              <span className="truncate" title={names.get(id) || id}>
                {names.get(id) || "Идэвхгүй эх үүсвэр"}
              </span>
              <button
                type="button"
                aria-label={`${names.get(id) || "Идэвхгүй эх үүсвэр"} хасах`}
                onClick={() =>
                  onChange(selected.filter((source) => source !== id))
                }
                className="shrink-0 rounded p-1 hover:bg-violet-100 focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </fieldset>
  );
}
