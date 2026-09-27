"use client";

import { Plus, X, ZoomIn } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { RestaurantPosProduct } from "@/lib/restaurant-pos-api";
import { ProductImage } from "./ProductImage";

type ProductImagePreviewDialogProps = {
  product: RestaurantPosProduct | null;
  formattedPrice: string;
  selectedQty: number;
  addDisabled: boolean;
  onAdd: () => void;
  onClose: () => void;
};

export function ProductImagePreviewDialog({
  product,
  formattedPrice,
  selectedQty,
  addDisabled,
  onAdd,
  onClose,
}: ProductImagePreviewDialogProps) {
  useEffect(() => {
    if (!product) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, product]);

  if (!product) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} бүтээгдэхүүний зураг`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative grid max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-[32px] bg-white shadow-2xl lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-12 w-12 place-items-center rounded-2xl bg-black/65 text-white shadow-lg transition hover:bg-black"
          aria-label="Зургийг хаах"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#e4eee8] via-[#f0e8d5] to-[#e8d1a5] p-4 sm:min-h-[520px] sm:p-8">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            className="max-h-[72dvh] w-full object-contain"
          />
          <span className="pointer-events-none absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-xs font-black text-white">
            <ZoomIn className="h-4 w-4" />
            Том зураг
          </span>
        </div>

        <div className="flex flex-col justify-center p-6 text-[#10221c] sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#13795b]">
            Хоолны дэлгэрэнгүй
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight">
            {product.name}
          </h2>
          <p className="mt-5 text-2xl font-black text-[#13795b]">
            {formattedPrice}
          </p>
          {selectedQty > 0 ? (
            <p className="mt-4 w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
              Сагсанд {selectedQty} ширхэг
            </p>
          ) : null}

          <button
            type="button"
            onClick={onAdd}
            disabled={addDisabled}
            className="mt-8 inline-flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#d9a62e] px-6 text-base font-black text-[#172219] transition hover:bg-[#e2b440] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            <Plus className="h-5 w-5" />
            {addDisabled ? "Дууссан" : "Сагсанд нэмэх"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
