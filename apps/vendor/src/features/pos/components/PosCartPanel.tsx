import { Minus, Plus, ReceiptText, Trash2 } from "lucide-react";
import type { CartLine, CartTotals } from "../types/pos.types";

type Props = {
  lines: CartLine[];
  totals?: CartTotals;
  onRemove: (productId: string) => void;
  onSetQty: (productId: string, qty: number) => void;
  onClear?: () => void;
  className?: string;
};

export function PosCartPanel({ lines, totals, onRemove, onSetQty, onClear, className = "" }: Props) {
  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
          <ReceiptText size={17} className="text-blue-600" />
          Сагс ({lines.length})
        </h3>
        {lines.length > 0 && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-rose-500 hover:bg-rose-50"
          >
            Сагс цэвэрлэх
            <Trash2 size={13} />
          </button>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 px-4 text-center">
          <div>
            <ReceiptText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Сагс хоосон байна</p>
            <p className="mt-0.5 text-xs text-slate-500">Barcode уншуулж эсвэл бараа сонгоно уу</p>
          </div>
        </div>
      ) : (
        <>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2">№</th>
                <th className="px-2 py-2">Барааны нэр</th>
                <th className="w-24 px-2 py-2 text-center">Тоо</th>
                <th className="w-20 px-2 py-2 text-right">Үнэ</th>
                <th className="w-20 px-2 py-2 text-right">Нийт</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => (
                <tr key={line.productId} className="bg-white">
                  <td className="px-3 py-3 font-semibold text-slate-500">{index + 1}</td>
                  <td className="min-w-0 px-2 py-3">
                    <p className="line-clamp-2 font-bold leading-snug text-slate-950">{line.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Нэгж: ₮{line.unitPrice.toLocaleString()} · Нөөц: {line.stockQty}
                    </p>
                  </td>
                  <td className="px-2 py-3">
                    <div className="mx-auto flex w-20 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => onSetQty(line.productId, line.qty - 1)}
                        className="flex h-7 w-7 items-center justify-center text-slate-700 hover:bg-white"
                        aria-label="Тоо бууруулах"
                      >
                        <Minus size={12} />
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
                        className="h-7 w-8 border-x border-slate-200 bg-white text-center text-xs font-black text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => onSetQty(line.productId, line.qty + 1)}
                        disabled={line.qty >= line.stockQty}
                        className="flex h-7 w-7 items-center justify-center text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Тоо нэмэх"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-700">
                    {line.unitPrice.toLocaleString()}
                  </td>
                  <td className="px-2 py-3 text-right font-black tabular-nums text-slate-950">
                    {(line.qty * line.unitPrice).toLocaleString()}
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => onRemove(line.productId)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                      aria-label="Сагснаас хасах"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 border-t border-slate-100 px-4 py-3 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-600">
              <span>Барааны дүн</span>
              <span className="font-bold tabular-nums text-slate-900">
                ₮{(totals?.subTotal ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Хөнгөлөлт</span>
              <span className="font-bold tabular-nums text-slate-900">
                -₮{(totals?.discountTotal ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Татвар</span>
              <span className="font-bold tabular-nums text-slate-900">
                ₮{(totals?.taxTotal ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-300 pt-3">
            <span className="text-sm font-black text-slate-700">Нийт дүн</span>
            <span className="text-2xl font-black tabular-nums text-blue-600">
              ₮{(totals?.grandTotal ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
        </>
      )}
    </section>
  );
}
