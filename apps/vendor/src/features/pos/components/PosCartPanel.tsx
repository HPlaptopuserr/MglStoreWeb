import type { CartLine } from "../types/pos.types";

type Props = {
  lines: CartLine[];
  onRemove: (productId: string) => void;
  onSetQty: (productId: string, qty: number) => void;
};

export function PosCartPanel({ lines, onRemove, onSetQty }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Сагс</h3>
      <div className="mt-3 max-h-[340px] overflow-y-auto space-y-2 pr-1">
        {lines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">Сагс хоосон байна</p>
            <p className="mt-1 text-xs text-slate-500">Barcode уншуулж бараа нэмнэ үү</p>
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={line.productId}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{line.name}</p>
                  <p className="text-xs text-slate-500">
                    Нэгж: {line.unitPrice.toLocaleString()} MNT • Нөөц: {line.stockQty}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(line.productId)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Хасах
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => onSetQty(line.productId, line.qty - 1)}
                    className="h-8 w-8 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    aria-label="Тоо бууруулах"
                  >
                    -
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
                    className="h-8 w-14 border-x border-slate-200 text-center text-sm font-semibold text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => onSetQty(line.productId, line.qty + 1)}
                    disabled={line.qty >= line.stockQty}
                    className="h-8 w-8 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    aria-label="Тоо нэмэх"
                  >
                    +
                  </button>
                </div>

                <p className="text-sm font-semibold text-slate-800">
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
