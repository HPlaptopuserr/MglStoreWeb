import { memo, useState } from "react";
import { useEventCallback } from "../hooks/useEventCallback";
import { CartScrollArea } from "./CartScrollArea";
import styles from "./PosCartPanel.module.css";
import { Minus, Plus, ReceiptText, Trash2 } from "lucide-react";
import type { CartLine, CartTotals } from "../types/pos.types";
import { formatPosQuantity } from "@mgl/types";
import { parseCartQuantity } from "../utils/parse-cart-quantity";

type Props = {
  lines: CartLine[];
  totals?: CartTotals;
  onRemove: (productId: string) => void;
  onSetQty: (productId: string, qty: number) => void;
  onSetPrice?: (
    productId: string,
    priceType: CartLine["priceType"],
    unitPrice: number,
  ) => void;
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

const PosCartLineRow = memo(function PosCartLineRow({
  line,
  index,
  onRemove,
  onSetQty,
  onSetPrice,
}: CartLineRowProps) {
  const lineTotal = line.qty * line.unitPrice;
  const quantityStep = line.measureUnit === "kg" ? 0.1 : 1;
  // Keep partial input ("", "0.") separate from the valid quantity used for payment.
  const [quantityDraft, setQuantityDraft] = useState<string | null>(null);
  const taxLabel = `${line.taxType || "VAT_ABLE"}${line.taxRate ? ` / ${line.taxRate}%` : ""}`;

  return (
    <article
      className={`${styles.line} items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/20`}
    >
      <div
        className={`${styles.index} flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-xs font-black text-blue-700`}
      >
        {index + 1}
      </div>

      <div className={styles.details}>
        <p className="line-clamp-2 break-words text-xs font-bold leading-tight text-slate-950" title={line.name}>
          {line.name}
        </p>
        <p className="mt-0.5 break-words text-[10px] font-bold text-slate-500">
          Нэгж: {money(line.unitPrice)} /{" "}
          {line.measureUnit === "kg" ? "кг" : "ш"} · Нөөц:{" "}
          {formatPosQuantity(line.stockQty, line.measureUnit)}
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
              if (unitPrice != null)
                onSetPrice(line.productId, priceType, unitPrice);
            }}
            className="mt-1 h-7 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="UNIT">
              {line.measureUnit === "kg" ? "1 кг-ийн үнэ" : "Ширхэгийн үнэ"}
            </option>
            {line.wholesalePrice != null ? (
              <option value="WHOLESALE">Бөөний үнэ</option>
            ) : null}
            {line.orderPrice != null ? (
              <option value="ORDER">Захиалгын үнэ</option>
            ) : null}
          </select>
        ) : null}
        <p className="mt-0.5 inline-flex rounded bg-emerald-50 px-1 text-[9px] font-bold leading-4 text-emerald-700">
          {taxLabel}
        </p>
      </div>

      <div
        className={`${styles.quantity} flex h-8 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50`}
      >
        <button
          type="button"
          onClick={() => onSetQty(line.productId, line.qty - quantityStep)}
          className="flex h-full w-7 items-center justify-center text-slate-700 transition hover:bg-white"
          aria-label="Тоо бууруулах"
        >
          <Minus size={14} />
        </button>
        <input
          type="text"
          inputMode={line.measureUnit === "kg" ? "decimal" : "numeric"}
          value={quantityDraft ?? String(line.qty)}
          aria-label={`${line.name} тоо хэмжээ`}
          title={line.measureUnit === "kg" ? "Кг-аар оруулна. Жишээ: 250 г = 0.25 кг" : "Ширхэгээр оруулна"}
          onChange={(event) => {
            setQuantityDraft(event.target.value);
            const parsed = parseCartQuantity(event.target.value, line.measureUnit);
            if (parsed !== null) {
              onSetQty(line.productId, parsed);
            }
          }}
          onBlur={() => setQuantityDraft(null)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="h-full min-w-0 flex-1 border-x border-slate-200 bg-white text-center text-xs font-black text-slate-950 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => onSetQty(line.productId, line.qty + quantityStep)}
          disabled={line.qty >= line.stockQty}
          className="flex h-full w-7 items-center justify-center text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Тоо нэмэх"
        >
          <Plus size={14} />
        </button>
      </div>

      <div
        className={`${styles.amount} rounded-md bg-slate-950 px-2 py-1.5 text-right`}
        aria-label={`Мөрийн дүн ${money(lineTotal)}`}
      >
        <p className="text-sm font-black leading-tight tabular-nums text-white">
          {money(lineTotal)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(line.productId)}
        className={`${styles.remove} inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500`}
        aria-label="Сагснаас хасах"
      >
        <Trash2 size={14} />
      </button>
    </article>
  );
});

function PosCartSummary({ totals }: { totals?: CartTotals }) {
  return (
    <div className="shrink-0 border-t border-slate-100 bg-white px-2 py-1.5">
      <div className="grid grid-cols-3 gap-1.5 break-words text-[10px] [overflow-wrap:anywhere]">
        <div className="rounded-md bg-slate-50 px-1.5 py-1">
          <p className="font-bold text-slate-500">Барааны дүн</p>
          <p className="text-[11px] font-black tabular-nums text-slate-950">
            {money(totals?.subTotal ?? 0)}
          </p>
        </div>
        <div className="rounded-md bg-slate-50 px-1.5 py-1">
          <p className="font-bold text-slate-500">Хөнгөлөлт</p>
          <p className="text-[11px] font-black tabular-nums text-slate-950">
            -{money(totals?.discountTotal ?? 0)}
          </p>
        </div>
        <div className="rounded-md bg-slate-50 px-1.5 py-1">
          <p className="font-bold text-slate-500">Татвар</p>
          <p className="text-[11px] font-black tabular-nums text-slate-950">
            {money(totals?.taxTotal ?? 0)}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-end justify-between gap-2 border-t border-dashed border-slate-300 pt-1.5">
        <span className="text-sm font-black text-slate-700">Нийт дүн</span>
        <span className="text-xl font-black leading-none tabular-nums text-blue-600">
          {money(totals?.grandTotal ?? 0)}
        </span>
      </div>
    </div>
  );
}

export function PosCartPanel({
  lines,
  totals,
  onRemove,
  onSetQty,
  onSetPrice,
  onClear,
  className = "",
}: Props) {
  const removeLine = useEventCallback(onRemove);
  const setQuantity = useEventCallback(onSetQty);
  const setPrice = useEventCallback(
    (...args: Parameters<NonNullable<Props["onSetPrice"]>>) =>
      onSetPrice?.(...args),
  );
  return (
    <section
      className={`${styles.panel} flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-2.5 py-2">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-black text-slate-950">
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
            <p className="text-sm font-bold text-slate-700">
              Сагс хоосон байна
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Barcode уншуулж эсвэл бараа сонгоно уу
            </p>
          </div>
        </div>
      ) : (
        <>
          <CartScrollArea>
            {lines.map((line, index) => (
              <PosCartLineRow
                key={line.productId}
                line={line}
                index={index}
                onRemove={removeLine}
                onSetQty={setQuantity}
                onSetPrice={onSetPrice ? setPrice : undefined}
              />
            ))}
          </CartScrollArea>
          <PosCartSummary totals={totals} />
        </>
      )}
    </section>
  );
}
