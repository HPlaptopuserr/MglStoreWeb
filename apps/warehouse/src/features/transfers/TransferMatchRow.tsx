"use client";
import { ProductHistoryTrigger } from "@mgl/ui";
import { Check, Pencil } from "lucide-react";
import { TransferProductMatch } from "./TransferProductMatch";
import {
  editReceiptLine,
  isReceiptLineValid,
  markupPrice,
  receiptMoney,
} from "./transfer-receipt-model";
import type { AcceptanceLine, TransferLine } from "./transfer-types";
const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-right text-sm tabular-nums outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";
export function TransferMatchRow({
  row,
  value,
  warehouseId,
  index,
  onChange,
}: {
  row: TransferLine;
  value: AcceptanceLine;
  warehouseId: string;
  index: number;
  onChange: (value: AcceptanceLine) => void;
}) {
  const mismatch =
    value.quantity === "" || Number(value.quantity) !== row.quantity;
  const valid = isReceiptLineValid(row, value);
  const appliedMarkup = [0, 10, 20, 30, 40, 50].find(
    (percent) =>
      value.salePrice !== "" &&
      markupPrice(row.unitCost, percent) === value.salePrice,
  );
  const targetName = row.matches?.find(
    (product) => product.id === value.targetProductId,
  )?.name;
  return (
    <tr
      className={`align-top transition-colors ${value.confirmed ? "bg-emerald-50/40" : "bg-white hover:bg-slate-50/60"}`}
    >
      <td className="px-4 py-4 text-sm text-slate-400">{index + 1}</td>
      <td className="min-w-64 px-4 py-4">
        <p className="font-semibold text-slate-900">{row.name}</p><ProductHistoryTrigger productId={value.targetProductId} name={targetName ?? row.name} />
        <p className="mt-1 text-xs text-slate-500">
          {row.sku ?? "—"} · {row.barcode ?? "—"}
        </p>
        <details className="mt-2 text-xs text-slate-600">
          <summary className="cursor-pointer rounded py-1 text-blue-600 hover:text-blue-800">
            {value.targetProductId === "NEW"
              ? "Шинэ бараагаар бүртгэнэ"
              : targetName
                ? `Холбосон: ${targetName}`
                : value.targetProductId
                  ? "Бүртгэлтэй бараа сонгосон"
                  : "Бараа сонгох шаардлагатай"}{" "}
            · Өөрчлөх
          </summary>
          <fieldset disabled={value.confirmed} className="mt-2">
            <TransferProductMatch
              row={row}
              value={value}
              warehouseId={warehouseId}
              onChange={onChange}
            />
          </fieldset>
        </details>
      </td>
      <td className="px-3 py-4 text-right">
        <span className="inline-flex h-10 items-center rounded-lg bg-slate-100 px-4 text-sm font-semibold tabular-nums text-slate-600">
          {row.quantity}
        </span>
      </td>
      <td className="min-w-32 px-3 py-4">
        <input
          aria-label={`${row.name}: хүлээн авсан тоо`}
          disabled={value.confirmed}
          type="number"
          min={0}
          step={1}
          value={value.quantity}
          onChange={(event) =>
            onChange(editReceiptLine(value, { quantity: event.target.value }))
          }
          aria-invalid={mismatch}
          className={`${inputClass} ${mismatch ? "border-amber-400 bg-amber-50" : ""}`}
        />
        {mismatch && (
          <p className="mt-1 text-xs text-amber-700">
            Зөрүү: {Number(value.quantity) - row.quantity} ш
          </p>
        )}
      </td>
      <td className="min-w-28 px-3 py-4 text-right text-sm tabular-nums text-slate-600">
        <span className="inline-flex h-10 items-center">
          {receiptMoney(row.unitCost)} ₮
        </span>
      </td>
      <td className="min-w-28 px-3 py-4">
        <select
          aria-label={`${row.name}: үнийн нэмэгдэл`}
          disabled={value.confirmed || row.unitCost === null}
          value={appliedMarkup ?? ""}
          onChange={(event) => {
            if (event.target.value !== "")
              onChange(
                editReceiptLine(value, {
                  salePrice: markupPrice(
                    row.unitCost,
                    Number(event.target.value),
                  ),
                }),
              );
          }}
          className={`${inputClass} text-left`}
        >
          <option value="">+ %</option>
          {[0, 10, 20, 30, 40, 50].map((percent) => (
            <option key={percent} value={percent}>
              +{percent}%
            </option>
          ))}
        </select>
      </td>
      <td className="min-w-36 px-3 py-4">
        <input
          aria-label={`${row.name}: зарах үнэ`}
          disabled={value.confirmed}
          type="number"
          min={0}
          max={1e12}
          step="0.01"
          value={value.salePrice}
          onChange={(event) =>
            onChange(editReceiptLine(value, { salePrice: event.target.value }))
          }
          className={inputClass}
        />
      </td>
      <td className="min-w-32 px-3 py-4 text-right text-sm font-semibold tabular-nums">
        <span className="inline-flex h-10 items-center">
          {receiptMoney(Number(value.quantity) * Number(value.salePrice))} ₮
        </span>
      </td>
      <td className="min-w-32 px-4 py-4">
        <button
          type="button"
          disabled={!value.confirmed && !valid}
          onClick={() => onChange({ ...value, confirmed: !value.confirmed })}
          className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition disabled:opacity-40 ${value.confirmed ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
        >
          {value.confirmed ? (
            <Pencil className="h-3.5 w-3.5" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {value.confirmed ? "Баталсан · Засах" : "Мөр батлах"}
        </button>
      </td>
    </tr>
  );
}
