import { Minus, Plus, ReceiptText, Trash2 } from "lucide-react";
import type { CartLine } from "../types/pos.types";

type Props = {
  lines: CartLine[];
  onRemove: (productId: string) => void;
  onSetQty: (productId: string, qty: number) => void;
};

export function PosCartPanel({ lines, onRemove, onSetQty }: Props) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <h3 className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
          <ReceiptText size={17} className="text-amber-500" />
          Захиалгын сагс
        </h3>
        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-black text-white">
          {lines.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {lines.length === 0 ? (
          <div className="flex h-full min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
            <div>
              <ReceiptText className="mx-auto mb-3 h-9 w-9 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Сагс хоосон байна</p>
              <p className="mt-1 text-xs text-slate-500">Barcode уншуулж эсвэл бараа сонгоно уу</p>
            </div>
          </div>
        ) : (
          lines.map((line, index) => (
            <div
              key={line.productId}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-white"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-950">{line.name}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Нэгж: ₮{line.unitPrice.toLocaleString()} · Нөөц: {line.stockQty}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(line.productId)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"
                  aria-label="Сагсаас хасах"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => onSetQty(line.productId, line.qty - 1)}
                    className="flex h-9 w-9 items-center justify-center text-slate-700 hover:bg-slate-50"
                    aria-label="Тоо бууруулах"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={line.stockQty}
                    value={line.qty}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      if (Number.isFinite(parsed) && parsed >= 1) {
                        onSetQty(line.productId, Math.floor(parsed));
                      }
                    }}
                    className="h-9 w-14 border-x border-slate-200 text-center text-sm font-black text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => onSetQty(line.productId, line.qty + 1)}
                    disabled={line.qty >= line.stockQty}
                    className="flex h-9 w-9 items-center justify-center text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Тоо нэмэх"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <p className="shrink-0 text-base font-black tabular-nums text-slate-950">
                  ₮{(line.qty * line.unitPrice).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
