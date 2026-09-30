"use client";
import { useEffect, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";

export function MasterCatalogSearch({
  onSearch,
  loading,
  total,
}: {
  onSearch: (value: string) => void;
  loading: boolean;
  total: number;
}) {
  const [value, setValue] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => onSearch(value.trim()), 350);
    return () => clearTimeout(timer);
  }, [value, onSearch]);
  return (
    <section
      aria-label="Нэгдсэн барааны хайлт"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(value.trim());
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400"
          />
          <input
            type="search"
            aria-label="Нэгдсэн бараа хайх"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={200}
            placeholder="Барааны нэр, баркод, брэнд, ангиллаар хайх…"
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          {value && (
            <button
              type="button"
              aria-label="Хайлтыг цэвэрлэх"
              onClick={() => {
                setValue("");
                onSearch("");
              }}
              className="absolute right-2 top-2 rounded-lg p-2 text-slate-500 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Хайх
        </button>
      </form>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
        <p>
          Кирилл болон латин галиг · Өмнөх нэршлээр хайх · Тохирох үр дүн эхэнд
        </p>
        <p role="status" className="flex items-center gap-1.5 font-semibold">
          {loading ? (
            <>
              <Loader2
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin"
              />
              Хайж байна…
            </>
          ) : (
            `${total.toLocaleString("mn-MN")} бараа`
          )}
        </p>
      </div>
    </section>
  );
}
