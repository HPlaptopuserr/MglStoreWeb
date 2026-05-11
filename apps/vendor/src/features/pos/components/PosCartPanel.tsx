import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import type { CartLine } from "../types/pos.types";

type Props = {
  lines: CartLine[];
  onRemove: (productId: string) => void;
  onSetQty: (productId: string, qty: number) => void;
};

export function PosCartPanel({ lines, onRemove, onSetQty }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShoppingCart size={15} className="text-violet-600" />
          Сагс
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          {lines.length}
        </span>
      </div>
      <div className="max-h-[300px] space-y-2 overflow-y-auto p-3">
        {lines.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-700">Сагс хоосон байна</p>
            <p className="mt-1 text-xs text-slate-500">Barcode уншуулж бараа нэмнэ үү</p>
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={line.productId}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 transition-colors hover:border-slate-200 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{line.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    Нэгж: {line.unitPrice.toLocaleString()} MNT • Нөөц: {line.stockQty}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(line.productId)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                  aria-label="Сагсаас хасах"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => onSetQty(line.productId, line.qty - 1)}
                    className="flex h-7 w-7 items-center justify-center text-slate-700 hover:bg-slate-50"
                    aria-label="Тоо бууруулах"
                  >
                    <Minus size={13} />
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
                    className="h-7 w-12 border-x border-slate-200 text-center text-sm font-semibold text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => onSetQty(line.productId, line.qty + 1)}
                    disabled={line.qty >= line.stockQty}
                    className="flex h-7 w-7 items-center justify-center text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Тоо нэмэх"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                <p className="shrink-0 text-sm font-semibold text-slate-800">
                  {(line.qty * line.unitPrice).toLocaleString()} MNT
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
