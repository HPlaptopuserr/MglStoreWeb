import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { ALL_DEPARTMENTS } from "./team-types";

function DeptDropdown({
  departments,
  value,
  onChange,
}: {
  departments: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [ALL_DEPARTMENTS, ...departments];
  const label = value === ALL_DEPARTMENTS ? "Бүх хэлтэс" : value;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
      >
        <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.14)]" />
        <span className="max-w-[160px] truncate">{label}</span>
        <ChevronDown
          size={15}
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Хэлтсийн сонголт хаах"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl shadow-slate-950/10">
            {options.map((option) => {
              const active = value === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span className="truncate">
                    {option === ALL_DEPARTMENTS ? "Бүх хэлтэс" : option}
                  </span>
                  {active && <Check size={14} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TeamSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative flex h-11 min-w-0 flex-1 items-center">
      <Search size={17} className="pointer-events-none absolute left-3.5 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Нэр, албан тушаал, ур чадвараар хайх..."
        className="h-full w-full rounded-xl border border-slate-200 bg-white py-0 pl-10 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

export function TeamToolbar({
  departments,
  activeDept,
  query,
  resultCount,
  onDepartmentChange,
  onQueryChange,
}: {
  departments: string[];
  activeDept: string;
  query: string;
  resultCount: number;
  onDepartmentChange: (value: string) => void;
  onQueryChange: (value: string) => void;
}) {
  if (departments.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-slate-200/70 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DeptDropdown
            departments={departments}
            value={activeDept}
            onChange={onDepartmentChange}
          />
          <TeamSearch value={query} onChange={onQueryChange} />
        </div>
        <p className="shrink-0 text-sm font-semibold text-slate-500">
          <span className="font-black text-slate-950">{resultCount}</span> гишүүн олдлоо
        </p>
      </div>
    </section>
  );
}
