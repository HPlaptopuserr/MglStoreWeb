"use client";

import { WarehouseProductRecommendations } from "@/features/shipments/components/WarehouseProductRecommendations";
import type {
  OutstandingPaymentSummary,
  StockRequestCartItem,
  StockRequestUser,
  StockRequestView,
  SupplyWarehouse,
  WarehouseInventoryItem,
  WarehouseCatalogCategory,
  WarehouseCatalogSort,
} from "@/features/shipments/types/stock-request.types";
import type { RecommendedWarehouseItem } from "@/features/shipments/types/warehouse-recommendation.types";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Package,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import type * as React from "react";
import { Fragment as ReactFragment } from "react";

interface WarehouseProductCatalogProps {
  navigation: React.ReactNode;
  outstandingPayments: OutstandingPaymentSummary | null;
  retryProducts: () => void;
  loadMoreProducts: () => void;
  selectedWarehouse: SupplyWarehouse | null;
  exitWarehouse: () => void;
  setViewMode: React.Dispatch<React.SetStateAction<StockRequestView>>;
  totalCartItems: number;
  productSearch: string;
  productSort: WarehouseCatalogSort;
  setProductSort: React.Dispatch<React.SetStateAction<WarehouseCatalogSort>>;
  setProductSearch: React.Dispatch<React.SetStateAction<string>>;
  categories: WarehouseCatalogCategory[];
  setSelectedCategory: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCategory: string | null;
  productsLoading: boolean;
  productsError: string | null;
  user: StockRequestUser | null;
  addRecommendationToCart: (
    item: RecommendedWarehouseItem,
    quantity: number,
  ) => void;
  warehouseProducts: WarehouseInventoryItem[];
  renderProductCard: (
    item: WarehouseInventoryItem,
    isHorizontal?: boolean,
  ) => React.JSX.Element;
  productsTotal: number;
  productsLoadMoreRef: React.RefObject<HTMLDivElement | null>;
  productsLoadingMore: boolean;
  productsHasMore: boolean;
  cart: StockRequestCartItem[];
}

export function WarehouseProductCatalog({
  navigation,
  outstandingPayments,
  retryProducts,
  loadMoreProducts,
  selectedWarehouse,
  exitWarehouse,
  setViewMode,
  totalCartItems,
  productSearch,
  productSort,
  setProductSort,
  setProductSearch,
  categories,
  setSelectedCategory,
  selectedCategory,
  productsLoading,
  productsError,
  user,
  addRecommendationToCart,
  warehouseProducts,
  renderProductCard,
  productsTotal,
  productsLoadMoreRef,
  productsLoadingMore,
  productsHasMore,
  cart,
}: WarehouseProductCatalogProps) {
  if (!selectedWarehouse) return null;
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const categoryPath: WarehouseCatalogCategory[] = [];
  const visited = new Set<string>();
  let currentCategory = selectedCategory
    ? categoryById.get(selectedCategory)
    : undefined;
  while (currentCategory && !visited.has(currentCategory.id)) {
    visited.add(currentCategory.id);
    categoryPath.unshift(currentCategory);
    currentCategory = currentCategory.parentId
      ? categoryById.get(currentCategory.parentId)
      : undefined;
  }
  const rootCategories = categories.filter((category) => !category.parentId);
  const childCategories = selectedCategory
    ? categories.filter((category) => category.parentId === selectedCategory)
    : [];
  const cartAmount = cart.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0,
  );
  return (
    <div className="min-h-screen space-y-2.5 bg-slate-50 pb-20">
      {navigation}
      {(outstandingPayments?.count ?? 0) > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-4 text-amber-950"
        >
          <p>
            Төлбөрийн үлдэгдэл:{" "}
            <strong>
              {outstandingPayments?.totalUnpaid.toLocaleString()}₮
            </strong>
            . Бараа үзэх боломжтой. Дараагийн захиалгын өмнө төлбөрөө төлнө үү.
          </p>
          <button
            type="button"
            onClick={() => setViewMode("payments")}
            className="rounded-lg bg-white px-4 py-2 font-semibold ring-1 ring-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            Төлбөр харах
          </button>
        </div>
      )}
      <section
        aria-label="Агуулахын каталогийн удирдлага"
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2 lg:grid-cols-[auto_minmax(10rem,1fr)_auto_auto]">
          <div className="order-1 flex min-w-0 items-center gap-2 lg:max-w-56">
            <button
              type="button"
              aria-label="Агуулахын жагсаалт руу буцах"
              onClick={exitWarehouse}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
            <h1
              className="truncate text-sm font-bold text-slate-950"
              title={[selectedWarehouse.name, selectedWarehouse.city]
                .filter(Boolean)
                .join(" · ")}
            >
              {selectedWarehouse.name}
            </h1>
          </div>
          <div className="relative order-3 col-span-2 lg:order-2 lg:col-span-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Агуулахын бараа хайх"
              title="Баркод сканнердах эсвэл нэр, SKU оруулж хайна"
              placeholder="Нэр, SKU, баркод…"
              value={productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setSelectedCategory(null);
              }}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
            {productSearch && (
              <button
                type="button"
                aria-label="Хайлт цэвэрлэх"
                onClick={() => setProductSearch("")}
                className="absolute right-0.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <label className="order-4 col-span-2 flex items-center gap-2 text-xs text-slate-500 lg:order-3 lg:col-span-1">
            <span className="lg:sr-only">Эрэмбэлэх</span>
            <select
              value={productSort}
              onChange={(event) =>
                setProductSort(
                  event.target.value === "name" ? "name" : "topSelling",
                )
              }
              className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <option value="topSelling">Их борлуулалттай эхэнд</option>
              <option value="name">Нэрээр</option>
            </select>
          </label>
          <button
            type="button"
            aria-label={`Сагс харах, ${totalCartItems} ширхэг бараа`}
            onClick={() => setViewMode("cart")}
            className="order-2 inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 lg:order-4"
          >
            <ShoppingCart className="size-4" aria-hidden="true" /> Сагс{" "}
            <span className="tabular-nums text-amber-300">
              {totalCartItems}
            </span>
          </button>
          {productSearch && (
            <p className="sr-only">
              Сонгосон агуулахын бүх ангиллаас хайж байна.
            </p>
          )}
        </div>
        {/* Categories */}
        {categories.length > 0 && (
          <nav
            aria-label="Барааны ангилал"
            className="space-y-1.5 border-t border-slate-100 px-2 py-1.5"
          >
            <p className="sr-only">
              Ангиллаа сонгоод хэрэгтэй бараагаа үзээрэй.
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                aria-pressed={!selectedCategory}
                onClick={() => setSelectedCategory(null)}
                className={`h-8 shrink-0 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  !selectedCategory
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50"
                }`}
              >
                Бүгд
              </button>
              {rootCategories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  aria-pressed={categoryPath[0]?.id === cat.id}
                  onClick={() => {
                    setProductSearch("");
                    setSelectedCategory(cat.id);
                  }}
                  className={`h-8 shrink-0 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    categoryPath[0]?.id === cat.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50"
                  }`}
                >
                  {cat.name}{" "}
                  <span className="opacity-70">({cat.productCount})</span>
                </button>
              ))}
            </div>
            {categoryPath.length > 0 && (
              <div
                aria-label="Сонгосон ангиллын зам"
                className="flex flex-wrap items-center gap-2 text-sm"
              >
                {categoryPath.map((category, index) => (
                  <ReactFragment key={category.id}>
                    {index > 0 && (
                      <ChevronRight
                        aria-hidden="true"
                        className="h-3 w-3 text-slate-400"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      aria-current={
                        category.id === selectedCategory ? "page" : undefined
                      }
                      className="rounded px-1 py-1 font-medium text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      {category.name}
                    </button>
                  </ReactFragment>
                ))}
              </div>
            )}
            {childCategories.length > 0 && (
              <div aria-label="Дэд ангилал" className="flex flex-wrap gap-2">
                {childCategories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-amber-400 hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    {category.name}{" "}
                    <span className="text-slate-400">
                      ({category.productCount})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </nav>
        )}
      </section>

      {/* Products Grid */}
      <div className="space-y-2.5">
        <p className="sr-only">
          {productSort === "topSelling"
            ? "Сүүлийн 90 хоногийн сүлжээний дууссан борлуулалтаар эрэмбэлэв."
            : "Барааны нэрийн дарааллаар эрэмбэлэв."}
        </p>
        {productsLoading ? (
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]"
            aria-label="Бараа ачаалж байна"
            aria-busy="true"
          >
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-slate-100 bg-white p-2"
              >
                <div className="h-24 animate-pulse motion-reduce:animate-none rounded-xl bg-slate-100" />
                <div className="mt-3 h-3 w-4/5 animate-pulse motion-reduce:animate-none rounded bg-slate-100" />
                <div className="mt-2 h-3 w-2/5 animate-pulse motion-reduce:animate-none rounded bg-slate-100" />
                <div className="mt-4 h-9 animate-pulse motion-reduce:animate-none rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : productsError ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-red-200 bg-red-50 py-16 text-center">
            <div className="mb-4 rounded-full bg-red-100 p-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-base font-semibold text-red-700">
              {productsError}
            </p>
            <button
              type="button"
              onClick={retryProducts}
              className="mt-4 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Дахин оролдох
            </button>
          </div>
        ) : warehouseProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <Package className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-600">
              Бараа олдсонгүй
            </p>
            <p className="mt-2 px-4 text-center text-sm text-slate-500">
              Хайлтаа өөрчлөх эсвэл өөр ангилал сонгоно уу.
            </p>
            {(productSearch || selectedCategory) && (
              <button
                type="button"
                onClick={() => {
                  setProductSearch("");
                  setSelectedCategory(null);
                }}
                className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Шүүлтүүр цэвэрлэх
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-950">
                {productSearch
                  ? "Хайлтын үр дүн"
                  : (selectedCategory &&
                      categoryById.get(selectedCategory)?.name) ||
                    "Бүх бараа"}
              </h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {!productSearch &&
                  !selectedCategory &&
                  !productsLoading &&
                  !productsError &&
                  user?.organizationId && (
                    <details className="relative">
                      <summary className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                        Танд санал болгох бараа
                      </summary>
                      <div className="absolute right-0 top-full z-20 mt-1 max-h-[60vh] w-[min(36rem,calc(100vw-3rem))] overflow-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                        <WarehouseProductRecommendations
                          organizationId={user.organizationId}
                          warehouseId={selectedWarehouse.id}
                          onAdd={addRecommendationToCart}
                        />
                      </div>
                    </details>
                  )}

                {(productSearch || selectedCategory) && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearch("");
                      setSelectedCategory(null);
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 underline underline-offset-4 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    Бүх барааг үзэх
                  </button>
                )}
                <span
                  role="status"
                  className="text-xs tabular-nums text-slate-500"
                >
                  {productsTotal.toLocaleString()} бараа
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
              {warehouseProducts.map((item) => renderProductCard(item, false))}
            </div>
            <div
              ref={productsLoadMoreRef}
              className="flex min-h-24 items-center justify-center py-6"
              aria-live="polite"
            >
              {productsLoadingMore ? (
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none text-[#FFAD02]" />
                  Бараа ачаалж байна…
                </div>
              ) : productsHasMore ? (
                <button
                  type="button"
                  onClick={loadMoreProducts}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Дараагийн барааг үзэх
                </button>
              ) : warehouseProducts.length > 0 ? (
                <p className="text-xs font-bold text-slate-400">
                  {productsTotal.toLocaleString()} барааг бүгдийг үзүүллээ
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-3 right-3 z-30 sm:bottom-4 sm:right-5">
          <button
            type="button"
            aria-label={`Сагс харах, ${totalCartItems} ширхэг бараа`}
            onClick={() => setViewMode("cart")}
            title="Сагс энэ төхөөрөмж дээр хадгалагдана."
            className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-amber-300 bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-slate-900/10 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            <ShoppingCart className="size-4" aria-hidden="true" />
            <span className="text-xs font-medium">
              {totalCartItems.toLocaleString()} ш
            </span>
            <span className="border-l border-amber-600/20 pl-3 tabular-nums">
              {cartAmount.toLocaleString()} ₮
            </span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
