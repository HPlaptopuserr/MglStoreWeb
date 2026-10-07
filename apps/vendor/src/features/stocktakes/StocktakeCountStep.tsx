"use client";
import { useEffect, useRef, useState } from "react";
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
  onSave,
  onDone,
}: {
  line: StocktakeLineDto;
  busy: boolean;
  onSave: (edit: StocktakeCountEdit) => Promise<void>;
  onDone: () => void;
}) {
  const pending = useRef(false);
  const quantityInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState(
    line.counted === null
      ? ""
      : String(storedQuantity(line.counted, line.unit)),
  );
  const [note, setNote] = useState(line.note);
  const [error, setError] = useState("");
  useEffect(() => {
    if (error && !saving) quantityInput.current?.focus({ preventScroll: true });
  }, [error, saving]);
  const unit = normalizePosMeasureUnit(line.unit) === "kg" ? "кг" : "ш";
  let difference: number | null = null;
  try {
    const count = parseCount(quantity, line.unit);
    if (count !== null)
      difference = storedQuantity(count - line.expected, line.unit);
  } catch {
    /* Invalid quantities are reported on submission. */
  }
  return (
    <form
      className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || pending.current) return;
        setError("");
        try {
          const counted = parseCount(quantity, line.unit);
          if (counted === null) throw new Error("Бодит тоог оруулна уу.");
          pending.current = true;
          setSaving(true);
          await onSave({ id: line.id, counted, note });
          onDone();
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Тоо хэмжээг шалгана уу.",
          );
        } finally {
          pending.current = false;
          setSaving(false);
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
      <p className="mt-2 text-xs text-slate-500">
        Тоо нь нийт бодит тоог солино. Хадгалах нь үлдэгдлийг шууд өөрчлөхгүй.
      </p>
      <fieldset
        disabled={busy || saving}
        className="mt-4 grid gap-4 sm:grid-cols-2"
      >
        <label className="text-sm font-medium">
          Бодит тоо ({unit})
          <input
            ref={quantityInput}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
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
          Шалтгаан / тайлбар (зөрүүтэй бол хяналтаас өмнө бөглөнө)
          <input
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            className={fieldClass}
          />
        </label>
      </fieldset>
      {difference !== null && (
        <p
          role="status"
          className={`mt-3 text-sm font-semibold ${difference ? "text-amber-700" : "text-emerald-700"}`}
        >
          Зөрүү: {difference > 0 ? "+" : ""}
          {difference} {unit}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={busy || saving} className={buttonClass}>
          {saving ? "Хадгалж байна…" : "Хадгалаад дараагийн бараа · Enter"}
        </button>
        <button
          type="button"
          disabled={busy || saving}
          onClick={onDone}
          className={secondaryClass}
        >
          Буцах
        </button>
      </div>
    </form>
  );
}
