"use client";
import { memo } from "react";
import { type StocktakeCountEdit, type StocktakeLineDto } from "@mgl/types";
import {
  stocktakeLineName,
  stocktakeLineBarcode,
  storedQuantity,
} from "./stocktake-model";
import { StocktakeQuantityInput } from "./StocktakeQuantityInput";
export const StocktakeRow = memo(function StocktakeRow({
  line,
  editable,
  requiresRecount = false,
  onEdit,
  focused = false,
}: {
  line: StocktakeLineDto;
  editable: boolean;
  requiresRecount?: boolean;
  onEdit: (edit: StocktakeCountEdit) => void;
  focused?: boolean;
}) {
  const difference =
    line.counted === null
      ? null
      : storedQuantity(line.counted - line.expected, line.unit);
  return (
    <tr
      className={`border-t border-slate-100 align-top transition ${requiresRecount ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-slate-50"}`}
    >
      <td className="p-3">
        <p className="font-semibold">{stocktakeLineName(line)}</p>
        {requiresRecount && (
          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
            Дахин тоолох шаардлагатай
          </span>
        )}
        {line.receiptRegisterId && (
          <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
            Тооллогоор нэмсэн
          </span>
        )}
        <p className="mt-1 text-xs text-slate-500">
          {stocktakeLineBarcode(line) || "Баркодгүй"} · {line.unit || "ш"}
        </p>
      </td>
      <td className="p-3 text-right tabular-nums">
        {storedQuantity(line.expected, line.unit).toLocaleString("mn-MN")}
      </td>
      <td className="p-3 text-right tabular-nums">
        {editable ? (
          <StocktakeQuantityInput
            line={line}
            focused={focused}
            onChange={(counted) =>
              onEdit({ id: line.id, counted, note: line.note })
            }
          />
        ) : (
          <span>
            {line.counted === null
              ? "Тоолоогүй"
              : storedQuantity(line.counted, line.unit).toLocaleString("mn-MN")}
          </span>
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
        {editable ? (
          <input
            aria-label={`${stocktakeLineName(line)} шалтгаан`}
            value={line.note}
            maxLength={500}
            onChange={(event) =>
              onEdit({
                id: line.id,
                counted: line.counted,
                note: event.target.value,
              })
            }
            placeholder="Шалтгаан / тайлбар"
            className="w-full min-w-36 rounded-md border border-transparent bg-transparent px-2 py-1 hover:border-slate-300 focus:border-blue-500 focus:outline-none"
          />
        ) : (
          line.note || (difference ? "Шалтгаан бөглөөгүй" : "—")
        )}
      </td>
    </tr>
  );
});
