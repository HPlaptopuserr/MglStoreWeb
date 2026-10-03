"use client";

import { Minus, Package, Plus } from "lucide-react";
import type { WarehouseInventoryItem } from "../types/stock-request.types";
interface WarehouseProductCardProps {
  item: WarehouseInventoryItem;
  isHorizontal?: boolean;
  cartQty: number;
  onAdd: (item: WarehouseInventoryItem) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
}
export function WarehouseProductCard({
  item,
  isHorizontal = false,
  cartQty,
  onAdd,
  onQuantityChange,
}: WarehouseProductCardProps) {
  const isInCart = cartQty > 0;
  return (
    <div
      key={item.id}
      className={`rounded-2xl border bg-white p-3 transition-all flex flex-col ${
        isHorizontal ? "w-[160px] sm:w-[180px] shrink-0" : ""
      } ${
        isInCart
          ? "border-[#FFAD02] ring-2 ring-[#FFAD02]/20"
          : "border-slate-100"
      }`}
    >
      <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-slate-100 shrink-0">
        {item.product.images[0]?.url ? (
          <img
            src={item.product.images[0].url}
            alt={item.product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-10 w-10 text-slate-300" />
          </div>
        )}
        {(item.product.category || item.product.businessCategory) && (
          <span className="absolute left-2 top-2 max-w-[70%] truncate rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-600 backdrop-blur-sm">
            {item.product.category?.name || item.product.businessCategory?.name}
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
          {item.quantity} ш
        </span>
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold text-slate-800 h-10 mb-1">
        {item.product.name}
      </h3>
      {item.product.sku && (
        <p className="mt-0.5 text-xs text-slate-400 truncate">
          {item.product.sku}
        </p>
      )}
      <p className="mt-auto pt-1 text-sm font-bold text-[#FFAD02]">
        {Number(item.product.price).toLocaleString()}₮
      </p>

      {isInCart ? (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#FFAD02]/10 p-1">
          <button
            onClick={() => onQuantityChange(item.product.id, cartQty - 1)}
            className="rounded-lg bg-white p-1.5 text-[#FFAD02] shadow-sm hover:bg-[#FFAD02] hover:text-white"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-[#FFAD02]">{cartQty}</span>
          <button
            onClick={() => {
              if (cartQty < item.quantity) {
                onQuantityChange(item.product.id, cartQty + 1);
              }
            }}
            disabled={cartQty >= item.quantity}
            className="rounded-lg bg-white p-1.5 text-[#FFAD02] shadow-sm hover:bg-[#FFAD02] hover:text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onAdd(item)}
          className="mt-3 w-full rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-[#FFAD02] hover:text-white"
        >
          Сонгох
        </button>
      )}
    </div>
  );
}
