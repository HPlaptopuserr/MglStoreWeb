"use client";
import { useMemo, useRef, useState } from "react";
import {
  normalizePosMeasureUnit,
  type StocktakeLineDto,
  type StocktakeCountEdit,
} from "@mgl/types";
import { barcodeIndex } from "./stocktake-model";
import { buttonClass, fieldClass } from "./StocktakeOverview";
export function StocktakeScanner({
  lines,
  edits,
  editable,
  onEdit,
  onError,
  onFind,
  onMissing,
}: {
  lines: StocktakeLineDto[];
  edits: Record<string, StocktakeCountEdit>;
  editable: boolean;
  onEdit: (edit: StocktakeCountEdit) => void;
  onError: (error: string) => void;
  onFind: (query: string) => void;
  onMissing: (barcode: string) => void;
}) {
  const [scan, setScan] = useState("");
  const [scanNotice, setScanNotice] = useState("");
  const scanner = useRef<HTMLInputElement>(null);
  const index = useMemo(() => barcodeIndex(lines), [lines]);
  return (
    <form
      className="rounded-2xl border border-blue-200 bg-blue-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!editable) return;
        const matches = index.get(scan.trim()) ?? [];
        setScan("");
        if (matches.length !== 1) {
          if (!matches.length) onMissing(scan.trim());
          onError(
            matches.length
              ? "Энэ баркод олон бараанд бүртгэлтэй. Нэрээр нь хайж зөв барааг сонгоно уу."
              : "Баркод энэ тооллогын санд олдсонгүй. Сан болон барааны бүртгэлийг шалгана уу.",
          );
          return;
        }
        const row = matches[0]!;
        if (normalizePosMeasureUnit(row.unit) === "kg") {
          onFind(row.barcode || row.name);
          setScanNotice(`${row.name}: жинлэсэн кг хэмжээг гараар оруулна уу.`);
          return;
        }
        const counted =
          ((edits[row.id] ? edits[row.id].counted : row.counted) ?? 0) + 1;
        if (counted > 2147483647) {
          onError("Тоо хэмжээ хязгаараас хэтэрсэн байна");
          return;
        }
        onEdit({
          id: row.id,
          counted,
          note: edits[row.id]?.note ?? row.note,
        });
        setScanNotice(`${row.name}: ${counted} ${row.unit || "ш"}`);
        scanner.current?.focus();
      }}
    >
      <label
        htmlFor="stocktake-scanner"
        className="mb-2 block text-sm font-semibold text-blue-950"
      >
        Баркод уншуулах — уншилт бүр +1
      </label>
      <div className="flex gap-2">
        <input
          id="stocktake-scanner"
          ref={scanner}
          value={scan}
          onChange={(event) => setScan(event.target.value)}
          disabled={!editable}
          autoComplete="off"
          placeholder="Сканнерын Enter төгсгөлтэй горим"
          className={fieldClass}
        />
        <button disabled={!editable || !scan.trim()} className={buttonClass}>
          Нэмэх
        </button>
      </div>
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
