"use client";

import { WarehouseProductRecommendations } from "@/features/shipments/components/WarehouseProductRecommendations";
import type {
  StockRequestCartItem,
  StockRequestUser,
  StockRequestView,
  SupplyWarehouse,
  WarehouseInventoryItem,
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
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type * as React from "react";

interface WarehouseProductCatalogProps {
  selectedWarehouse: SupplyWarehouse | null;
  exitWarehouse: () => void;
  setViewMode: React.Dispatch<React.SetStateAction<StockRequestView>>;
  totalCartItems: number;
  productSearch: string;
  setProductSearch: React.Dispatch<React.SetStateAction<string>>;
  categories: string[];
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
  selectedWarehouse,
  exitWarehouse,
  setViewMode,
  totalCartItems,
  productSearch,
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
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={exitWarehouse}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-bold text-slate-900">
                {selectedWarehouse.name}
              </h1>
              <p className="text-xs text-slate-500">{selectedWarehouse.city}</p>
            </div>
          </div>
          <button
            onClick={() => setViewMode("cart")}
            className="relative rounded-xl bg-[#FFAD02] p-3 text-white shadow-lg shadow-[#FFAD02]/30"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalCartItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {totalCartItems}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Нэр, SKU, баркодоор хайх..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm focus:border-[#FFAD02] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                !selectedCategory
                  ? "bg-[#FFAD02] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Бүгд
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-[#FFAD02] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="p-4">
        {!productSearch &&
          !selectedCategory &&
          !productsLoading &&
          !productsError &&
          user?.organizationId && (
            <div className="mb-6">
              <WarehouseProductRecommendations
                organizationId={user.organizationId}
                warehouseId={selectedWarehouse.id}
                onAdd={addRecommendationToCart}
              />
            </div>
          )}
        {productsLoading ? (
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            aria-label="Бараа ачаалж байна"
            aria-busy="true"
          >
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-3"
              >
                <div className="aspect-square animate-pulse rounded-xl bg-slate-100" />
                <div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-slate-100" />
                <div className="mt-4 h-9 animate-pulse rounded-xl bg-slate-100" />
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
          </div>
        ) : warehouseProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <Package className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-600">
              Бараа олдсонгүй
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {!productSearch && !selectedCategory && (
              <div className="space-y-6">
                {/* Шинээр нэмэгдсэн */}
                {warehouseProducts.length > 0 && (
                  <div>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      Шинээр нэмэгдсэн
                    </h2>
                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                      {warehouseProducts
                        .slice(-6)
                        .reverse()
                        .map((item) => renderProductCard(item, true))}
                    </div>
                  </div>
                )}

                {/* Санал болгох бараа */}
                {warehouseProducts.filter((i) => i.quantity <= i.minQuantity)
                  .length > 0 && (
                  <div>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      Санал болгох бараа
                    </h2>
                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                      {warehouseProducts
                        .filter((i) => i.quantity <= i.minQuantity)
                        .slice(0, 6)
                        .map((item) => renderProductCard(item, true))}
                    </div>
                  </div>
                )}

                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 border-t pt-6 border-slate-100">
                  <Package className="h-4 w-4 text-slate-400" />
                  Бүх бараа ({productsTotal})
                </h2>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {warehouseProducts.map((item) => renderProductCard(item, false))}
            </div>
            <div
              ref={productsLoadMoreRef}
              className="flex min-h-24 items-center justify-center py-6"
              aria-live="polite"
            >
              {productsLoadingMore ? (
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-[#FFAD02]" />
                  Бараа ачаалж байна…
                </div>
              ) : productsHasMore ? (
                <span className="sr-only">
                  Дараагийн бараануудыг ачаалах цэг
                </span>
              ) : warehouseProducts.length > 0 ? (
                <p className="text-xs font-bold text-slate-400">
                  {productsTotal.toLocaleString()} барааг бүгдийг үзүүллээ
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white p-3 shadow-lg md:left-64">
          <button
            onClick={() => setViewMode("cart")}
            className="flex w-full items-center justify-between rounded-xl bg-[#FFAD02] px-4 py-2.5 text-white shadow-md shadow-[#FFAD02]/20"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {totalCartItems} бараа
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Сагс харах</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
