"use client";

import { useState } from "react";
import { ManagedCatalogFilters } from "./ManagedCatalogFilters";
import { ManagedProductTable } from "./ManagedProductTable";
import { ManagedProductQuickEdit } from "./ManagedProductQuickEdit";
import {
  Boxes,
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { ManagedProductCard } from "./ManagedProductCard";
import {
  CATALOG_PAGE_SIZE,
  useManagedProductCatalog,
} from "./useManagedProductCatalog";
import type { ManagedProduct } from "./managed-product.types";

interface Props {
  organizationId: string;
  revision: number;
  statusMessage: string;
  onEdit: (product: ManagedProduct) => void;
}
const controlClass =
  "min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-4 focus-visible:ring-orange-100 disabled:opacity-40";

export function ManagedProductCatalog({
  organizationId,
  revision,
  statusMessage,
  onEdit,
}: Props) {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [quickEdit, setQuickEdit] = useState<ManagedProduct | null>(null);
  const [quickMessage, setQuickMessage] = useState("");
  const catalog = useManagedProductCatalog(organizationId, revision);
  return (
    <section
      aria-labelledby="managed-catalog-title"
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-orange-50 p-3 text-orange-600">
          <Boxes size={24} />
        </span>
        <div>
          <h2
            id="managed-catalog-title"
            className="text-xl font-black text-slate-950"
          >
            Бараа удирдах
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Бараагаа хайж олоод “Засах” товчоор зураг, нэр, үнэ, нөөцөө
            шинэчлээрэй.
          </p>
        </div>
      </div>
      <div className="my-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Бүх бараанаас хайх</span>
          <Search
            size={18}
            className="absolute left-3 top-3.5 text-slate-400"
          />
          <input
            type="search"
            value={catalog.search}
            onChange={(event) => catalog.changeSearch(event.target.value)}
            placeholder="Барааны нэр, кодоор хайх..."
            className={`${controlClass} w-full pl-10`}
          />
        </label>
        <label>
          <span className="sr-only">Барааны эрэмбэ</span>
          <select
            value={catalog.sort}
            onChange={(event) => catalog.changeSort(event.target.value)}
            className={`${controlClass} w-full sm:w-auto`}
          >
            <option value="newest">Сүүлд нэмсэн</option>
            <option value="price_asc">Үнэ: багаас их</option>
            <option value="price_desc">Үнэ: ихээс бага</option>
          </select>
        </label>
      </div>
      <ManagedCatalogFilters
        filters={catalog.filters}
        onChange={catalog.changeFilter}
        onReset={catalog.resetFilters}
        hasFilters={catalog.hasFilters}
      />
      <div
        className="mb-4 flex justify-end gap-1"
        role="group"
        aria-label="Барааны харагдац"
      >
        <button
          type="button"
          aria-pressed={view === "grid"}
          onClick={() => setView("grid")}
          className={`${controlClass} inline-flex items-center gap-2 ${view === "grid" ? "bg-orange-50 text-orange-700" : ""}`}
        >
          <LayoutGrid size={16} />
          Зурагт
        </button>
        <button
          type="button"
          aria-pressed={view === "table"}
          onClick={() => setView("table")}
          className={`${controlClass} inline-flex items-center gap-2 ${view === "table" ? "bg-orange-50 text-orange-700" : ""}`}
        >
          <List size={16} />
          Хүснэгт
        </button>
      </div>
      {(quickMessage || statusMessage) && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {quickMessage || statusMessage}
        </p>
      )}
      <div aria-busy={catalog.loading}>
        {catalog.loading ? (
          <div role="status">
            <span className="sr-only">Бараа ачаалж байна</span>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className="h-72 rounded-2xl bg-slate-100 motion-safe:animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : catalog.error ? (
          <div role="alert" className="rounded-2xl bg-rose-50 p-6 text-center">
            <p className="text-rose-700">{catalog.error}</p>
            <button
              type="button"
              onClick={catalog.reload}
              className={`${controlClass} mt-4`}
            >
              Дахин оролдох
            </button>
          </div>
        ) : catalog.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center">
            <Boxes size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 font-bold text-slate-800">
              {catalog.hasFilters
                ? "Хайлтанд тохирох бараа олдсонгүй"
                : "Энэ хуудсанд бараа алга"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {catalog.hasFilters
                ? "Өөр нэр эсвэл кодоор хайж үзээрэй."
                : "Дээрх бүтээгдэхүүн нэмэх хэсгээс бараагаа бүртгээрэй."}
            </p>
            {catalog.hasFilters && (
              <button
                type="button"
                onClick={catalog.resetFilters}
                className={`${controlClass} mt-4`}
              >
                Шүүлтүүр цэвэрлэх
              </button>
            )}
          </div>
        ) : view === "table" ? (
          <ManagedProductTable
            products={catalog.products}
            onEdit={onEdit}
            onQuickEdit={setQuickEdit}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 sm:gap-4">
            {catalog.products.map((product) => (
              <ManagedProductCard
                key={product.id}
                product={product}
                onEdit={onEdit}
                onQuickEdit={setQuickEdit}
              />
            ))}
          </div>
        )}
      </div>
      <nav
        aria-label="Барааны хуудас"
        className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"
      >
        <p aria-live="polite" className="text-sm text-slate-500">
          {catalog.loading
            ? "Ачаалж байна..."
            : catalog.error
              ? "Ачаалсангүй"
              : `Нийт ${catalog.total} бараа · ${catalog.page + 1} / ${Math.max(1, Math.ceil(catalog.total / CATALOG_PAGE_SIZE))} хуудас`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={catalog.loading || catalog.page === 0}
            onClick={() => catalog.setPage(catalog.page - 1)}
            className={`${controlClass} inline-flex items-center gap-1 hover:bg-slate-50`}
          >
            <ChevronLeft size={16} />
            Өмнөх
          </button>
          <button
            type="button"
            disabled={catalog.loading || !!catalog.error || !catalog.hasMore}
            onClick={() => catalog.setPage(catalog.page + 1)}
            className={`${controlClass} inline-flex items-center gap-1 hover:bg-slate-50`}
          >
            Дараах
            <ChevronRight size={16} />
          </button>
        </div>
      </nav>
      {quickEdit && (
        <ManagedProductQuickEdit
          key={quickEdit.id}
          product={quickEdit}
          onClose={() => setQuickEdit(null)}
          onSaved={() => {
            setQuickEdit(null);
            setQuickMessage("Үнэ, нөөцийн өөрчлөлт хадгалагдлаа.");
            catalog.reload();
          }}
        />
      )}
    </section>
  );
}
