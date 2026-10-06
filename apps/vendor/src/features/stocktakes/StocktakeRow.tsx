"use client";
import { memo, useEffect, useState } from "react";
import {
  normalizePosMeasureUnit,
  type StocktakeCountEdit,
  type StocktakeLineDto,
} from "@mgl/types";
import { parseCount, storedQuantity } from "./stocktake-model";
import { fieldClass } from "./StocktakeOverview";
export const StocktakeRow = memo(function StocktakeRow({
  line,
  editable,
  onEdit,
  onError,
}: {
  line: StocktakeLineDto;
  editable: boolean;
  onEdit: (edit: StocktakeCountEdit) => void;
  onError: (error: string) => void;
}) {
  const formatted =
    line.counted === null
      ? ""
      : String(storedQuantity(line.counted, line.unit));
  const [value, setValue] = useState(formatted);
  useEffect(() => setValue(formatted), [formatted]);
  const difference =
    line.counted === null
      ? null
      : storedQuantity(line.counted - line.expected, line.unit);
  return (
    <tr className="border-t border-slate-100 align-top transition hover:bg-slate-50">
      <td className="p-3">
        <p className="font-semibold">{line.name}</p>
        {line.receiptRegisterId && <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">Тооллогоор нэмсэн</span>}
        <p className="mt-1 text-xs text-slate-500">
          {line.barcode || "Баркодгүй"} · {line.unit || "ш"}
        </p>
      </td>
      <td className="p-3 text-right tabular-nums">
        {storedQuantity(line.expected, line.unit).toLocaleString("mn-MN")}
      </td>
      <td className="p-3">
        <input
          aria-label={`${line.name} бодит тоо`}
          type="number"
          min="0"
          step={normalizePosMeasureUnit(line.unit) === "kg" ? "0.001" : "1"}
          disabled={!editable}
          value={value}
          placeholder="Тоолоогүй"
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            try {
              const counted = parseCount(next, line.unit);
              if (counted !== line.counted)
                onEdit({ id: line.id, counted, note: line.note });
            } catch {
              /* Keep partial input while typing; report invalid quantities on blur. */
            }
          }}
          onBlur={() => {
            try {
              const counted = parseCount(value, line.unit);
              if (counted !== line.counted)
                onEdit({ id: line.id, counted, note: line.note });
            } catch (error) {
              onError(
                error instanceof Error ? error.message : "Тоо буруу байна",
              );
              setValue(formatted);
            }
          }}
          className={`${fieldClass} min-w-28 text-right tabular-nums disabled:bg-slate-50`}
        />
      </td>
      <td
        className={`p-3 text-right font-semibold tabular-nums ${difference ? "text-amber-700" : "text-slate-500"}`}
      >
        {difference === null
          ? "—"
          : `${difference > 0 ? "+" : ""}${difference.toLocaleString("mn-MN")}`}
      </td>
      <td className="p-3">
        <input
          aria-label={`${line.name} зөрүүний шалтгаан`}
          value={line.note}
          disabled={!editable}
          maxLength={500}
          placeholder={difference ? "Шалтгаан заавал бичнэ" : "Тайлбар"}
          onChange={(event) =>
            onEdit({
              id: line.id,
              counted: line.counted,
              note: event.target.value,
            })
          }
          className={`${fieldClass} min-w-48 disabled:bg-slate-50`}
        />
      </td>
    </tr>
  );
});
