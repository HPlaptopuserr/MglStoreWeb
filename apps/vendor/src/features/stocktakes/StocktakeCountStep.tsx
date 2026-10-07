"use client";
import { useState } from "react";
import {
  normalizePosMeasureUnit,
  type StocktakeCountEdit,
  type StocktakeLineDto,
} from "@mgl/types";
import { parseCount, storedQuantity } from "./stocktake-model";
import { buttonClass, fieldClass, secondaryClass } from "./StocktakeOverview";

export function StocktakeCountStep({
  line,
  busy,
  onEdit,
  onDone,
}: {
  line: StocktakeLineDto;
  busy: boolean;
  onEdit: (edit: StocktakeCountEdit) => void;
  onDone: () => void;
}) {
  const [quantity, setQuantity] = useState(
    line.counted === null
      ? ""
      : String(storedQuantity(line.counted, line.unit)),
  );
  const [note, setNote] = useState(line.note);
  const [error, setError] = useState("");
  const unit = normalizePosMeasureUnit(line.unit) === "kg" ? "кг" : "ш";
  return (
    <form
      className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        try {
          const counted = parseCount(quantity, line.unit);
          if (counted === null) throw new Error("Бодит тоог оруулна уу.");
          onEdit({ id: line.id, counted, note });
          onDone();
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Тоо хэмжээг шалгана уу.",
          );
        }
      }}
    >
      <p className="text-xs font-semibold text-blue-600">
        Бараа олдлоо · Тоолох
      </p>
      <h3 className="mt-1 text-lg font-semibold">{line.name}</h3>
      <p className="mt-1 text-sm text-slate-500">
        {line.barcode || "Баркодгүй"} · Системийн тоо:{" "}
        {storedQuantity(line.expected, line.unit)} {unit}
      </p>
      <fieldset disabled={busy} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Бодит тоо ({unit})
          <input
            autoFocus
            required
            type="number"
            min="0"
            step={unit === "кг" ? "0.001" : "1"}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Шалтгаан / тайлбар
          <input
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            className={fieldClass}
          />
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={busy} className={buttonClass}>
          Тоо оруулаад үргэлжлүүлэх
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDone}
          className={secondaryClass}
        >
          Буцах
        </button>
      </div>
    </form>
  );
}
