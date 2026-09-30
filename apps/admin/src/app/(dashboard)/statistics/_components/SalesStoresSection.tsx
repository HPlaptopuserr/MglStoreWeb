"use client";
import { useState } from "react";
import { RefreshCw, Store } from "lucide-react";
import { useSalesStores } from "./useSalesStores";
import { SalesStoresExportButton } from "./SalesStoresExportButton";
import { SalesStoresTable } from "./SalesStoresTable";
import { windowLabel } from "./statistics-format";

export function SalesStoresSection({
  days,
  initialStatus = "all",
}: {
  days: number | "all";
  initialStatus?: "all" | "active" | "inactive";
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(initialStatus);
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useSalesStores(
    days,
    query,
    status,
    page,
  );
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const control =
    "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-600";
  return (
    <section
      aria-labelledby="mgl-stores-heading"
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="mgl-stores-heading"
            className="flex items-center gap-2 text-xl font-black text-slate-950"
          >
            <Store aria-hidden="true" className="h-5 w-5 text-lime-700" />
            MGL Store-ууд
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            MGL Business-д бүртгэсэн дэлгүүрүүд · {windowLabel(days)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Хугацааны шүүлтүүр нь дэлгүүрийн бүртгэлийн огноогоор үйлчилнэ.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <SalesStoresExportButton days={days} query={query} status={status} />
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className={`${control} inline-flex items-center gap-2 transition hover:bg-slate-50 disabled:opacity-50`}
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`}
            />
            Шинэчлэх
          </button>
        </div>
      </div>
      <div className="my-5 grid gap-3 sm:grid-cols-[1fr_180px]">
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
          Дэлгүүр хайх
          <input
            type="search"
            maxLength={100}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Дэлгүүр, ХТ, утас, хаяг..."
            className={control}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
          Бүртгэлийн төлөв
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className={control}
          >
            <option value="all">Бүх төлөв</option>
            <option value="active">Идэвхтэй</option>
            <option value="inactive">Идэвхгүй</option>
          </select>
        </label>
      </div>
      <div aria-live="polite" aria-busy={loading}>
        {loading ? (
          <p
            role="status"
            className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500"
          >
            Дэлгүүрүүдийг ачааллаж байна…
          </p>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={reload}
              className="ml-3 font-bold underline"
            >
              Дахин оролдох
            </button>
          </div>
        ) : (
          data && (
            <>
              <p className="mb-3 text-sm font-semibold text-slate-600">
                Шүүлтүүрт тохирох {data.total.toLocaleString("mn-MN")} дэлгүүр
              </p>
              {data.items.length ? (
                <SalesStoresTable
                  stores={data.items}
                  offset={(data.page - 1) * data.pageSize}
                />
              ) : (
                <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Сонгосон хугацаа, хайлт, төлөвт тохирох дэлгүүр олдсонгүй.
                </p>
              )}
              <nav
                aria-label="Дэлгүүрийн хуудас"
                className="mt-4 flex flex-wrap items-center justify-between gap-3"
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className={`${control} hover:bg-slate-50 disabled:opacity-40`}
                >
                  Өмнөх
                </button>
                <span className="text-sm text-slate-500">
                  {page} / {pages}
                </span>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setPage((value) => value + 1)}
                  className={`${control} hover:bg-slate-50 disabled:opacity-40`}
                >
                  Дараах
                </button>
              </nav>
            </>
          )
        )}
      </div>
    </section>
  );
}
