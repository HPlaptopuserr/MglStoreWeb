import { Minus, Plus, ReceiptText, Trash2 } from "lucide-react";
import type { CartLine, CartTotals } from "../types/pos.types";

type Props = {
  lines: CartLine[];
  totals?: CartTotals;
  onRemove: (productId: string) => void;
  onSetQty: (productId: string, qty: number) => void;
  onSetPrice?: (productId: string, priceType: CartLine["priceType"], unitPrice: number) => void;
  onClear?: () => void;
  className?: string;
};

type CartLineRowProps = {
  line: CartLine;
  index: number;
  onRemove: (productId: string) => void;
  onSetQty: (productId: string, qty: number) => void;
  onSetPrice?: Props["onSetPrice"];
};

function money(value: number) {
  return `₮${value.toLocaleString()}`;
}

function PosCartLineRow({ line, index, onRemove, onSetQty, onSetPrice }: CartLineRowProps) {
  const lineTotal = line.qty * line.unitPrice;

  return (
    <article className="rounded-lg border border-[#273647] bg-[#122131] px-3 py-2 transition hover:border-[#75d1ff]/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#051424] text-[11px] font-black text-[#92d9ff]">
              {index + 1}
            </span>
            <p className="truncate text-sm font-black leading-tight text-[#d4e4fa]">{line.name}</p>
          </div>
          <p className="mt-1 truncate pl-8 text-[11px] font-semibold text-[#86929a]">
            Нэгж {money(line.unitPrice)} · Нөөц {line.stockQty}
          </p>
          {onSetPrice ? (
            <select
              value={line.priceType}
              onChange={(event) => {
                const priceType = event.target.value as CartLine["priceType"];
                const unitPrice =
                  priceType === "WHOLESALE"
                    ? line.wholesalePrice
                    : priceType === "ORDER"
                      ? line.orderPrice
                      : line.baseUnitPrice;
                if (unitPrice != null) onSetPrice(line.productId, priceType, unitPrice);
              }}
              className="ml-8 mt-1 h-7 rounded-md border border-[#3d484f] bg-[#051424] px-2 text-[10px] font-bold text-[#d4e4fa] outline-none focus:border-[#00c2ff]"
            >
              <option value="UNIT">Ширхэгийн үнэ</option>
              {line.wholesalePrice != null ? <option value="WHOLESALE">Бөөний үнэ</option> : null}
              {line.orderPrice != null ? <option value="ORDER">Захиалгын үнэ</option> : null}
            </select>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onRemove(line.productId)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#86929a] transition hover:bg-[#93000a]/25 hover:text-[#ffb4ab]"
          aria-label="Сагснаас хасах"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex h-8 items-center justify-center overflow-hidden rounded-lg border border-[#3d484f] bg-[#051424]">
          <button
            type="button"
            onClick={() => onSetQty(line.productId, line.qty - 1)}
            className="flex h-full w-8 items-center justify-center text-[#bcc8d1] transition hover:bg-[#1c2b3c]"
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
            className="h-full w-10 border-x border-[#3d484f] bg-[#0d1c2d] text-center text-sm font-black text-[#d4e4fa] outline-none"
          />
          <button
            type="button"
            onClick={() => onSetQty(line.productId, line.qty + 1)}
            disabled={line.qty >= line.stockQty}
            className="flex h-full w-8 items-center justify-center text-[#bcc8d1] transition hover:bg-[#1c2b3c] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Тоо нэмэх"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#86929a]">Мөрийн дүн</p>
          <p className="text-lg font-black leading-tight tabular-nums text-[#92d9ff]">{money(lineTotal)}</p>
        </div>
      </div>
    </article>
  );
}

function PosCartSummary({ lines, totals }: { lines: CartLine[]; totals?: CartTotals }) {
  const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <div className="shrink-0 border-t border-[#273647] bg-[#0d1c2d] px-3 py-3">
      <div className="mb-2 flex items-center justify-between rounded-lg bg-[#051424] px-3 py-2 text-xs font-black text-[#bcc8d1]">
        <span>Захиалгын мөр</span>
        <span className="tabular-nums">
          {lines.length} мөр · {totalQty} ширхэг
        </span>
      </div>

      <div className="space-y-1.5 text-xs font-bold text-[#bcc8d1]">
        <div className="flex justify-between gap-3">
          <span>Барааны дүн</span>
          <span className="tabular-nums text-[#d4e4fa]">{money(totals?.subTotal ?? 0)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Хөнгөлөлт</span>
          <span className="tabular-nums text-[#d4e4fa]">-{money(totals?.discountTotal ?? 0)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Татвар</span>
          <span className="tabular-nums text-[#d4e4fa]">{money(totals?.taxTotal ?? 0)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between border-t border-[#3d484f] pt-3">
        <span className="text-sm font-black text-[#d4e4fa]">Төлөх дүн</span>
        <span className="text-3xl font-black leading-none tabular-nums text-[#92d9ff]">
          {money(totals?.grandTotal ?? 0)}
        </span>
      </div>
    </div>
  );
}

export function PosCartPanel({ lines, totals, onRemove, onSetQty, onSetPrice, onClear, className = "" }: Props) {
  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#273647] bg-[#0d1c2d] shadow-sm ${className}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-[#273647] px-4 py-3">
        <h3 className="inline-flex items-center gap-2 text-lg font-black text-[#d4e4fa]">
          <ReceiptText size={22} className="text-[#92d9ff]" />
          Сагс ({lines.length})
        </h3>
        {lines.length > 0 && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-[#ffb4ab] hover:bg-[#93000a]/25"
          >
            Цэвэрлэх
            <Trash2 size={13} />
          </button>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#051424] px-4 text-center">
          <div>
            <ReceiptText className="mx-auto mb-3 h-12 w-12 rounded-full border border-dashed border-[#3d484f] p-3 text-[#86929a]" />
            <p className="text-base font-black text-[#d4e4fa]">Сагс хоосон</p>
            <p className="mt-1 text-sm font-semibold text-[#86929a]">Захиалга үүсгэхийн тулд менюгээс сонгоно уу</p>
          </div>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto bg-[#051424] p-2.5">
            <div className="space-y-2">
              {lines.map((line, index) => (
                <PosCartLineRow
                  key={line.productId}
                  line={line}
                  index={index}
                  onRemove={onRemove}
                  onSetQty={onSetQty}
                  onSetPrice={onSetPrice}
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
