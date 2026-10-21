"use client";

import { Loader2, Minus, Plus, Trash2 } from "lucide-react";

interface CartLine {
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
    <article className="rounded-lg border border-slate-200 bg-white p-2 transition-colors hover:border-white/20">
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="line-clamp-2 text-xs font-bold leading-4 text-slate-800">
                {line.name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-slate-500">
                {originalPrice !== undefined && originalPrice > line.price ? <span className="line-through">{formatPrice(originalPrice)}</span> : null}
                <span>{formatPrice(line.price)}</span>
                {line.sentQty > 0 ? (
                  <span className="rounded-full bg-amber-300/10 px-2 py-0.5 text-[10px] font-black text-amber-700">
                    Гал тогоонд {line.sentQty}ш
                  </span>
                ) : null}
              </div>
            </div>
            <p className="shrink-0 text-right text-xs font-bold tabular-nums text-slate-900">
              {formatPrice(line.price * line.qty)}
            </p>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex h-7 w-[88px] shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md bg-slate-100">
              <button
                type="button"
                onClick={() => onQuantityChange(-1)}
                disabled={
                  ticketSaving ||
                  cancellationPending ||
                  readOnly ||
                  line.qty <= line.sentQty
                }
                className="flex h-full w-8 items-center justify-center text-slate-500 transition hover:bg-white/5 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`${line.name} хасах`}
                title="Хасах"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-xs font-bold tabular-nums text-slate-900">
                {line.qty}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(1)}
                disabled={ticketSaving || cancellationPending || readOnly}
                className="flex h-full w-8 items-center justify-center text-slate-500 transition hover:bg-white/5 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-100 px-2 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-500 focus:border-sky-400/70"
            />
            <button
              type="button"
              onClick={() => onRemove()}
              disabled={ticketSaving || cancellationPending || readOnly}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-45 ${
                line.sentQty > 0
                  ? "border-amber-300/50 text-amber-700 hover:bg-amber-300 hover:text-slate-950"
                  : "border-sky-400/70 text-sky-400 hover:bg-sky-400 hover:text-slate-900"
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
