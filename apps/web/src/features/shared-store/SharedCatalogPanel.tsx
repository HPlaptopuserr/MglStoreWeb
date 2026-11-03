"use client";
import { ChevronLeft, ChevronRight, PackageSearch, Search } from "lucide-react";
import type { useSharedCatalog } from "./useSharedCatalog";
import { SharedProductCard } from "./SharedProductCard";
import type { BasketLine, SharedProduct } from "./types";
const GRID =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";
export function SharedCatalogPanel({
  catalog,
  lines,
  onAdd,
  onDetail,
}: {
  catalog: ReturnType<typeof useSharedCatalog>;
  lines: BasketLine[];
  onAdd: (product: SharedProduct) => void;
  onDetail: (product: SharedProduct) => void;
}) {
  return (
    <section
      id="shared-catalog"
      aria-label="Барааны каталог"
      className="mt-5 scroll-mt-44 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
        <h2 className="inline-flex min-h-11 items-center gap-3 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white">
          Бүх бараа{" "}
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {catalog.data?.total ?? "…"}
          </span>
        </h2>
        <p aria-live="polite" className="text-xs text-slate-400">
          {catalog.loading ? "Бараа ачаалж байна…" : "Агуулахын бодит нөөцөөс"}
        </p>
      </div>
      <div className="flex flex-col justify-between gap-4 px-4 py-5 sm:flex-row sm:items-center sm:px-6">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Бараа эрэмбэлэх"
        >
          {[
            { value: "name", label: "Ерөнхий" },
            { value: "newest", label: "Шинэ" },
            { value: "price_asc", label: "Үнэ ↑" },
            { value: "price_desc", label: "Үнэ ↓" },
          ].map((sort) => (
            <button
              key={sort.value}
              onClick={() => catalog.setSort(sort.value)}
              aria-pressed={catalog.sort === sort.value}
              className={`min-h-11 rounded-xl px-4 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-orange-600 ${catalog.sort === sort.value ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
            >
              {sort.label}
            </button>
          ))}
        </div>
        <label className="relative sm:w-80">
          <Search
            size={16}
            className="absolute left-3 top-3.5 text-slate-400"
          />
          <span className="sr-only">Бараа хайх</span>
          <input
            type="search"
            value={catalog.search}
            onChange={(event) => catalog.setSearch(event.target.value)}
            placeholder="Дэлгүүрээс бараа хайх…"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </label>
      </div>
      <div className="px-3 pb-5 sm:px-5">
        {catalog.error ? (
          <div role="alert" className="rounded-2xl bg-red-50 p-8 text-center">
            <p className="text-sm text-red-700">{catalog.error}</p>
            <button
              onClick={catalog.refresh}
              className="mt-4 min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white"
            >
              Дахин оролдох
            </button>
          </div>
        ) : catalog.loading ? (
          <div role="status" aria-label="Бараа ачаалж байна" className={GRID}>
            {Array.from({ length: 12 }, (_, index) => (
              <div
                key={index}
                className="h-80 animate-pulse rounded-2xl bg-slate-50 motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : !catalog.data?.products.length ? (
          <div className="rounded-2xl bg-slate-50 px-6 py-20 text-center">
            <PackageSearch className="mx-auto mb-4 size-12 text-slate-300" />
            <h3 className="font-bold">
              {catalog.search
                ? "Хайлтад тохирох бараа олдсонгүй"
                : "Бараа удахгүй нэмэгдэнэ"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {catalog.search
                ? "Нэр эсвэл кодоо өөрөөр бичиж хайгаарай."
                : "Дэлгүүрийн бэлэн бараанууд энд харагдана."}
            </p>
            {catalog.search && (
              <button
                onClick={() => catalog.setSearch("")}
                className="mt-5 min-h-11 rounded-xl bg-slate-900 px-5 text-sm text-white"
              >
                Бүх бараа харах
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={GRID}>
              {catalog.data.products.map((product) => (
                <SharedProductCard
                  key={product.id}
                  product={product}
                  quantity={
                    lines.find((line) => line.product.id === product.id)
                      ?.quantity || 0
                  }
                  onAdd={() => onAdd(product)}
                  onDetail={() => onDetail(product)}
                />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center gap-5">
              <button
                disabled={!catalog.page}
                onClick={() => catalog.setPage((value) => value - 1)}
                aria-label="Өмнөх хуудас"
                className="flex size-11 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs text-slate-500">
                {catalog.page + 1} /{" "}
                {Math.max(1, Math.ceil(catalog.data.total / 24))}
              </span>
              <button
                disabled={!catalog.data.hasMore}
                onClick={() => catalog.setPage((value) => value + 1)}
                aria-label="Дараагийн хуудас"
                className="flex size-11 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
