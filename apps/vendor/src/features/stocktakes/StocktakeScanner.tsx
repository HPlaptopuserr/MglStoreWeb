"use client";
import { useMemo, useRef, useState } from "react";
import {
  normalizePosMeasureUnit,
  type StocktakeCountEdit,
  type StocktakeLineDto,
} from "@mgl/types";
import {
  barcodeIndex,
  matchesStocktakeQuery,
  newProductSeed,
} from "./stocktake-model";
import { buttonClass, fieldClass } from "./StocktakeOverview";
export function StocktakeScanner({
  lines,
  editable,
  onSelect,
  onEdit,
  onFind,
  onMissing,
  query,
  busy,
  canCreate,
}: {
  lines: StocktakeLineDto[];
  editable: boolean;
  onSelect: (line: StocktakeLineDto) => void;
  onEdit: (edit: StocktakeCountEdit) => void;
  onFind: (query: string) => void;
  onMissing: (seed: { name: string; barcode: string }) => void;
  query: string;
  busy: boolean;
  canCreate: boolean;
}) {
  const [incrementMode, setIncrementMode] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  const scanner = useRef<HTMLInputElement>(null);
  const index = useMemo(() => barcodeIndex(lines), [lines]);
  const matchesQuery = lines.some((line) => matchesStocktakeQuery(line, query));
  const missing =
    Boolean(query.trim()) &&
    (/^[0-9]+$/.test(query.trim()) ? !index.has(query.trim()) : !matchesQuery);
  return (
    <form
      className="rounded-2xl border border-blue-200 bg-blue-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!editable || !query.trim()) return;
        const exact = index.get(query.trim()) ?? [];
        const matches = exact.length
          ? exact
          : lines.filter(
              (line) =>
                line.name.trim().toLocaleLowerCase("mn-MN") ===
                query.trim().toLocaleLowerCase("mn-MN"),
            );
        if (matches.length !== 1) {
          if (missing && canCreate) onMissing(newProductSeed(query));
          setScanNotice(
            matches.length
              ? "Олон бараа таарлаа. Жагсаалтаас зөв барааг сонгоно уу."
              : missing
                ? canCreate
                  ? "Энэ тооллогод бараа олдсонгүй. Шинэ барааны мэдээллийг бөглөнө үү."
                  : "Тоолох сан болон барааны бүртгэлээ шалгана уу."
                : "Нэрээр хайсан барааны бодит тоог жагсаалтаас оруулна уу.",
          );
          return;
        }
        const row = matches[0]!;
        if (incrementMode && normalizePosMeasureUnit(row.unit) !== "kg") {
          const counted = (row.counted ?? 0) + 1;
          if (counted > 2147483647) {
            setScanNotice("Тоо хэмжээ хязгаараас хэтэрсэн байна.");
            return;
          }
          onEdit({ id: row.id, counted, note: row.note });
          onFind("");
          setScanNotice(`${row.name}: ${counted} ш`);
          scanner.current?.focus();
        } else {
          onSelect(row);
          setScanNotice("");
        }
      }}
    >
      <label
        htmlFor="stocktake-scanner"
        className="mb-2 block text-sm font-semibold text-blue-950"
      >
        Бараа хайх / баркод уншуулах
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="stocktake-scanner"
          ref={scanner}
          value={query}
          onChange={(event) => {
            onFind(event.target.value);
            setScanNotice("");
          }}
          disabled={busy}
          autoComplete="off"
          placeholder="Нэр эсвэл баркод оруулах…"
          className={fieldClass}
        />
        {editable && (
          <button
            disabled={busy || !query.trim()}
            className={`${buttonClass} shrink-0`}
          >
            {missing && canCreate
              ? "Бүртгэх"
              : index.has(query.trim())
                ? "Тоолох"
                : "Хайх"}
          </button>
        )}
      </div>
      {editable && (
        <label className="mt-3 flex items-center gap-2 text-sm text-blue-950">
          <input
            type="checkbox"
            checked={incrementMode}
            onChange={(event) => setIncrementMode(event.target.checked)}
          />
          Ширхэг бүрээр +1 (кг бараанд жин оруулна)
        </label>
      )}
      <p className="mt-2 text-xs text-slate-600">
        Баркод уншуулаад Enter дарна уу. Бараа олдвол тоолох, олдохгүй бол
        бүртгэх алхам нээгдэнэ.
      </p>
      {missing && (
        <p role="status" className="mt-2 text-sm text-amber-800">
          Энэ тооллогод тохирох бараа алга.
          {canCreate
            ? " «Бүртгэх» дарж шинэ бараа нэмнэ үү."
            : " Тоолох сан болон барааны бүртгэлээ шалгана уу."}
        </p>
      )}
      <p
        role="status"
        aria-live="polite"
        className="mt-2 min-h-5 text-sm text-blue-800"
      >
        {scanNotice}
      </p>
    </form>
  );
}
