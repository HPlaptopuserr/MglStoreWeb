"use client";

import { ArrowRight, ShoppingBag, X } from "lucide-react";

interface MinimumOrderModalProps {
  open: boolean;
  currentAmount: number;
  minimumAmount: number;
  onClose: () => void;
  onContinueShopping: () => void;
}

export function MinimumOrderModal({
  open,
  currentAmount,
  minimumAmount,
  onClose,
  onContinueShopping,
}: MinimumOrderModalProps) {
  if (!open) return null;

  const remainingAmount = Math.max(0, minimumAmount - currentAmount);
  const progress = Math.min(100, (currentAmount / minimumAmount) * 100);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="minimum-order-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
        <div className="bg-gradient-to-br from-orange-500 to-amber-400 px-6 pb-7 pt-6 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Цонх хаах"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30"
          >
            <X size={18} />
          </button>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
            <ShoppingBag size={27} />
          </div>
          <h2 id="minimum-order-title" className="mt-5 text-2xl font-black">
            Захиалгын доод дүн 50,000₮
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-white/85">
            Хүргэлттэй захиалга өгөхийн тулд сагсандаа дахин бараа нэмнэ үү.
          </p>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div>
            <div className="mb-2 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Одоогийн сагс
                </p>
                <p className="mt-1 text-xl font-black tabular-nums text-slate-950">
                  {currentAmount.toLocaleString()}₮
                </p>
              </div>
              <p className="text-right text-sm font-bold text-orange-600">
                {remainingAmount.toLocaleString()}₮ дутуу
              </p>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-slate-100"
              aria-label={`Захиалгын босго ${Math.round(progress)} хувь`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-400">
              <span>0₮</span>
              <span>{minimumAmount.toLocaleString()}₮</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onContinueShopping}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-orange-600 active:scale-[0.99]"
          >
            Бараа нэмж сонгох
            <ArrowRight size={17} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-xl text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            Сагсаа дахин шалгах
          </button>
        </div>
      </div>
    </div>
  );
}
