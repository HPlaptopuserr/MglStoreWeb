"use client";

import { AlertTriangle, Minus, PackageMinus, Plus, Trash2 } from "lucide-react";
import { ProductThumbnail } from "@/features/inventory/ProductThumbnail";
import {
  WarehouseProductSearch,
  type WarehouseInventorySearchItem,
} from "./WarehouseProductSearch";

export interface DispatchLineItem {
  productId: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  unitPrice: number;
  available: number;
  quantity: number;
}

function formatMoney(value: number) {
  return `${value.toLocaleString("mn-MN")}₮`;
}

interface DispatchItemsSectionProps {
  warehouseId: string;
  items: DispatchLineItem[];
  excludedProductIds: ReadonlySet<string>;
  onAdd: (item: WarehouseInventorySearchItem) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function DispatchItemsSection({
  warehouseId,
  items,
  excludedProductIds,
  onAdd,
  onQuantityChange,
  onRemove,
}: DispatchItemsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm shadow-blue-600/30">
            2
          </span>
          <div>
            <h2 className="font-bold text-slate-950">Гаргах бараа сонгох</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Нэр, SKU, баркод эсвэл ангиллаар хайгаад жагсаалтад нэмнэ.
            </p>
          </div>
        </div>
        <WarehouseProductSearch
          warehouseId={warehouseId}
          excludedProductIds={excludedProductIds}
          onSelect={onAdd}
        />
        <p className="mt-2 text-[11px] text-slate-400">
          ↑ ↓ товчоор сонгож, Enter дарж хурдан нэмэх боломжтой
        </p>
      </div>

      <div className="p-4 sm:p-5">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <PackageMinus className="h-6 w-6 text-slate-300" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-600">
              Одоогоор бараа сонгоогүй байна
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Дээрх хайлтаас гаргах бараагаа нэмнэ үү
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Сонгосон бараа
              </p>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                {items.length} төрөл
              </span>
            </div>
            {items.map((item) => {
              const overStock = item.quantity > item.available;
              const missingPrice = item.unitPrice <= 0;
              const lineTotal = item.unitPrice * item.quantity;
              return (
                <article
                  key={item.productId}
                  className={`rounded-xl border p-3.5 transition ${overStock ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}
                >
                  <div className="flex items-center gap-3">
                    <ProductThumbnail
                      imageUrl={item.imageUrl}
                      productName={item.name}
                      className="h-12 w-12 rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-400">
                          {item.sku || "SKU байхгүй"}
                        </span>
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                          Нөөц {item.available}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5 text-xs">
                        {missingPrice ? (
                          <span className="font-semibold text-amber-600">
                            Үнэ тохируулаагүй
                          </span>
                        ) : (
                          <>
                            <span className="text-slate-400">Нэгж</span>
                            <span className="font-semibold text-slate-700">
                              {formatMoney(item.unitPrice)}
                            </span>
                            <span className="text-slate-300">×</span>
                            <span className="font-semibold text-slate-700">
                              {item.quantity}
                            </span>
                            <span className="text-slate-300">=</span>
                            <span className="font-bold text-blue-700">
                              {formatMoney(lineTotal)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        aria-label={`${item.name} тоог хасах`}
                        onClick={() =>
                          onQuantityChange(item.productId, item.quantity - 1)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-blue-600 hover:shadow-sm"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        aria-label={`${item.name} гаргах тоо`}
                        type="number"
                        min={1}
                        max={item.available}
                        value={item.quantity}
                        onChange={(event) =>
                          onQuantityChange(
                            item.productId,
                            Number.parseInt(event.target.value, 10) || 1,
                          )
                        }
                        className={`h-8 w-14 border-0 bg-transparent text-center text-sm font-bold outline-none ${overStock ? "text-red-600" : "text-slate-900"}`}
                      />
                      <button
                        type="button"
                        aria-label={`${item.name} тоог нэмэх`}
                        onClick={() =>
                          onQuantityChange(item.productId, item.quantity + 1)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-blue-600 hover:shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`${item.name} устгах`}
                      onClick={() => onRemove(item.productId)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {overStock && (
                    <p
                      role="alert"
                      className="mt-2 flex items-center gap-1.5 border-t border-red-100 pt-2 text-xs font-medium text-red-600"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Боломжит үлдэгдэл {item.available} ширхэг байна
                    </p>
                  )}
                  {!overStock && missingPrice && (
                    <p
                      role="alert"
                      className="mt-2 flex items-center gap-1.5 border-t border-amber-100 pt-2 text-xs font-medium text-amber-600"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Барааны үнийг нөөцийн бүртгэлээс тохируулна уу
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
