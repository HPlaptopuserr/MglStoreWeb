"use client";
import { memo } from "react";
import { type StocktakeLineDto } from "@mgl/types";
import {
  stocktakeLineBarcode,
  stocktakeLineName,
  storedQuantity,
} from "./stocktake-model";
import { secondaryClass } from "./StocktakeOverview";
export const StocktakeRow = memo(function StocktakeRow({
  line,
  editable,
  onSelect,
}: {
  line: StocktakeLineDto;
  editable: boolean;
  onSelect?: (line: StocktakeLineDto) => void;
}) {
  const difference =
    line.counted === null
      ? null
      : storedQuantity(line.counted - line.expected, line.unit);
  const name = stocktakeLineName(line);
  const barcode = stocktakeLineBarcode(line);
  return (
    <tr className="border-t border-slate-100 align-top transition hover:bg-slate-50">
      <td className="p-3">
        <p className="font-semibold">
          {editable && onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(line)}
              className="text-left text-blue-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              {name}
            </button>
          ) : (
            name
          )}
        </p>
        {line.receiptRegisterId && (
          <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
            Тооллогоор нэмсэн
          </span>
        )}
        <p className="mt-1 text-xs text-slate-500">
          {barcode || "Баркодгүй"} · {line.unit || "ш"}
        </p>
      </td>
      <td className="p-3 text-right tabular-nums">
        {storedQuantity(line.expected, line.unit).toLocaleString("mn-MN")}
      </td>
      <td className="p-3 text-right tabular-nums">
        <span>
          {line.counted === null
            ? "Тоолоогүй"
            : storedQuantity(line.counted, line.unit).toLocaleString("mn-MN")}
        </span>
        {editable && onSelect && (
          <button
            type="button"
            className={`${secondaryClass} ml-3`}
            onClick={() => onSelect(line)}
            aria-label={`${name} тоог засах`}
          >
            {line.counted === null ? "Тоолох" : "Засах"}
          </button>
        )}
      </td>
      <td
        className={`p-3 text-right font-semibold tabular-nums ${difference ? "text-amber-700" : "text-slate-500"}`}
      >
        {difference === null
          ? "—"
          : `${difference > 0 ? "+" : ""}${difference.toLocaleString("mn-MN")}`}
      </td>
      <td className="max-w-xs whitespace-pre-wrap p-3 text-slate-600">
        {line.note || (difference ? "Шалтгаан бөглөөгүй" : "—")}
      </td>
    </tr>
  );
});
