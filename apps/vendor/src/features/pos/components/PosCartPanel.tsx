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

type CartLineRowProps = {
  line: CartLine;
  index: number;
  onRemove: (productId: string) => void;
  onSetQty: (productId: string, qty: number) => void;
};

function money(value: number) {
  return `₮${value.toLocaleString()}`;
}

function PosCartLineRow({ line, index, onRemove, onSetQty }: CartLineRowProps) {
  const lineTotal = line.qty * line.unitPrice;

  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)_116px_150px_34px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/20">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
        {index + 1}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[15px] font-black leading-tight text-slate-950">
          {line.name}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
          Нэгж: {money(line.unitPrice)} · Нөөц: {line.stockQty}
        </p>
      </div>

      <div className="flex h-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => onSetQty(line.productId, line.qty - 1)}
          className="flex h-full w-8 items-center justify-center text-slate-700 transition hover:bg-white"
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
          className="h-full w-10 border-x border-slate-200 bg-white text-center text-base font-black text-slate-950 outline-none"
        />
        <button
          type="button"
          onClick={() => onSetQty(line.productId, line.qty + 1)}
          disabled={line.qty >= line.stockQty}
          className="flex h-full w-8 items-center justify-center text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Тоо нэмэх"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="rounded-xl bg-slate-950 px-3 py-2 text-right">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
          Мөрийн дүн
        </p>
        <p className="text-lg font-black leading-tight tabular-nums text-white">
          {money(lineTotal)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(line.productId)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
        aria-label="Сагснаас хасах"
      >
        <Trash2 size={15} />
      </button>
    </article>
  );
}

function PosCartSummary({ lines, totals }: { lines: CartLine[]; totals?: CartTotals }) {
  const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-900">
        <span>Сагсан дахь бараа</span>
        <span className="tabular-nums">
          {lines.length} мөр · {totalQty} ширхэг
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="font-bold text-slate-500">Барааны дүн</p>
          <p className="text-[11px] font-black tabular-nums text-slate-950">
            {money(totals?.subTotal ?? 0)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="font-bold text-slate-500">Хөнгөлөлт</p>
          <p className="text-[11px] font-black tabular-nums text-slate-950">
            -{money(totals?.discountTotal ?? 0)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-1.5">
          <p className="font-bold text-slate-500">Татвар</p>
          <p className="text-[11px] font-black tabular-nums text-slate-950">
            {money(totals?.taxTotal ?? 0)}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex items-end justify-between border-t border-dashed border-slate-300 pt-1.5">
        <span className="text-sm font-black text-slate-700">Нийт дүн</span>
        <span className="text-2xl font-black leading-none tabular-nums text-blue-600">
          {money(totals?.grandTotal ?? 0)}
        </span>
      </div>
    </div>
  );
}

export function PosCartPanel({ lines, totals, onRemove, onSetQty, onClear, className = "" }: Props) {
  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="inline-flex items-center gap-2 text-lg font-black text-slate-950">
          <ReceiptText size={22} className="text-blue-600" />
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
          <div className="min-h-0 flex-1 overflow-auto bg-slate-50/70 p-2.5">
            <div className="space-y-2">
              {lines.map((line, index) => (
                <PosCartLineRow
                  key={line.productId}
                  line={line}
                  index={index}
                  onRemove={onRemove}
                  onSetQty={onSetQty}
                />
              ))}
            </div>
          </div>
          <PosCartSummary lines={lines} totals={totals} />
        </>
      )}
    </section>
  );
}
