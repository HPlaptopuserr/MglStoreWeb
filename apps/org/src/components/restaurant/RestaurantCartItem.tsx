"use client";

import {
  RESTAURANT_LINE_DISCOUNT_PERCENTS,
  type RestaurantLineDiscountPercent,
} from "@mgl/types";

import { Loader2, Minus, Plus, Trash2 } from "lucide-react";

interface CartLine {
  applyDiscount: boolean;
  discountPercent: number;
  id: string;
  name: string;
  price: number;
  qty: number;
  sentQty: number;
  note: string;
}

interface RestaurantCartItemProps {
  line: CartLine;
  originalPrice?: number;
  onDiscountChange: (percent: RestaurantLineDiscountPercent) => void;
  ticketSaving: boolean;
  cancellationPending: boolean;
  cancellingLine: boolean;
  readOnly: boolean;
  formatPrice: (value: number) => string;
  onQuantityChange: (delta: number) => void;
  onNoteChange: (note: string) => void;
  onSaveNote: () => void;
  onRemove: () => void;
}

export function RestaurantCartItem({
  line,
  originalPrice,
  onDiscountChange,
  ticketSaving,
  cancellationPending,
  cancellingLine,
  readOnly,
  formatPrice,
  onQuantityChange,
  onNoteChange,
  onSaveNote,
  onRemove,
}: RestaurantCartItemProps) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.035] p-2 transition-colors hover:border-white/20">
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="line-clamp-2 text-xs font-bold leading-4 text-slate-100">
                {line.name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-slate-400">
                {originalPrice !== undefined && originalPrice > line.price ? (
                  <span className="line-through">
                    {formatPrice(originalPrice)}
                  </span>
                ) : null}
                <span>{formatPrice(line.price)}</span>
                {line.sentQty > 0 ? (
                  <span className="rounded-full bg-amber-300/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                    Гал тогоонд {line.sentQty}ш
                  </span>
                ) : null}
              </div>
            </div>
            <p className="shrink-0 text-right text-xs font-bold tabular-nums text-white">
              {formatPrice(line.price * line.qty)}
            </p>
          </div>

          <div
            role="group"
            aria-label={`${line.name} хөнгөлөлтийн хувь`}
            className="mt-2 flex items-center gap-1"
          >
            {RESTAURANT_LINE_DISCOUNT_PERCENTS.map((percent) => (
              <button
                key={percent}
                type="button"
                aria-pressed={line.discountPercent === percent}
                disabled={ticketSaving || cancellationPending || readOnly}
                onClick={() => onDiscountChange(percent)}
                className={`min-h-7 min-w-9 flex-1 rounded-md border px-1.5 text-[11px] font-semibold tabular-nums transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-40 ${line.discountPercent === percent ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-200" : "border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-100"}`}
              >
                {percent === 0 ? "Үгүй" : `${percent}%`}
              </button>
            ))}
          </div>

          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex h-7 w-[88px] shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md bg-[#2d3142]">
              <button
                type="button"
                onClick={() => onQuantityChange(-1)}
                disabled={
                  ticketSaving ||
                  cancellationPending ||
                  readOnly ||
                  line.qty <= line.sentQty
                }
                className="flex h-full w-8 items-center justify-center text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`${line.name} хасах`}
                title="Хасах"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-xs font-bold tabular-nums text-white">
                {line.qty}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(1)}
                disabled={ticketSaving || cancellationPending || readOnly}
                className="flex h-full w-8 items-center justify-center text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`${line.name} нэмэх`}
                title="Нэмэх"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <input
              value={line.note}
              onChange={(event) => onNoteChange(event.target.value)}
              onBlur={() => onSaveNote()}
              disabled={readOnly || cancellationPending}
              aria-label={`${line.name} тэмдэглэл`}
              placeholder="Тэмдэглэл..."
              className="h-7 min-w-0 flex-1 rounded-md border border-white/5 bg-[#2d3142] px-2 text-xs font-semibold text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/70"
            />
            <button
              type="button"
              onClick={() => onRemove()}
              disabled={ticketSaving || cancellationPending || readOnly}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-45 ${
                line.sentQty > 0
                  ? "border-amber-300/50 text-amber-200 hover:bg-amber-300 hover:text-slate-950"
                  : "border-sky-400/70 text-sky-400 hover:bg-sky-400 hover:text-white"
              }`}
              aria-label={`${line.name} устгах`}
              title={
                line.sentQty > 0 ? "Гал тогоонд явсан хоол цуцлах" : "Устгах"
              }
            >
              {cancellingLine ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
