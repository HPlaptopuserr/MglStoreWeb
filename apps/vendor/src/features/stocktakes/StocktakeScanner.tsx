"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  normalizePosMeasureUnit,
  type StocktakeCountEdit,
  type StocktakeLineDto,
} from "@mgl/types";
import {
  barcodeIndex,
  matchesStocktakeQuery,
  newProductSeed,
  stocktakeLineName,
} from "./stocktake-model";
import { buttonClass, fieldClass } from "./StocktakeOverview";
export function StocktakeScanner({
  lines,
  editable,
  onSelect,
  onSave,
  focusRequest,
  savedNotice,
  onFind,
  onMissing,
  onResolve,
  query,
  busy,
  canCreate,
}: {
  lines: StocktakeLineDto[];
  editable: boolean;
  onSelect: (line: StocktakeLineDto) => void;
  onSave: (edit: StocktakeCountEdit) => Promise<void>;
  focusRequest: number;
  savedNotice: string;
  onFind: (query: string) => void;
  onMissing: (seed: { name: string; barcode: string }) => void;
  onResolve: (query: string) => Promise<StocktakeLineDto | null | undefined>;
  query: string;
  busy: boolean;
  canCreate: boolean;
}) {
  const resolving = useRef(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [incrementMode, setIncrementMode] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  const scanner = useRef<HTMLInputElement>(null);
  const restoredFocus = useRef(0);
  const restoreAfterScan = useRef(false);
  useEffect(() => {
    if (
      !busy &&
      !lookingUp &&
      (focusRequest !== restoredFocus.current || restoreAfterScan.current)
    ) {
      restoredFocus.current = focusRequest;
      restoreAfterScan.current = false;
      scanner.current?.focus({ preventScroll: true });
    }
  }, [focusRequest, busy, lookingUp]);
  const index = useMemo(() => barcodeIndex(lines), [lines]);
  const matchesQuery = lines.some((line) => matchesStocktakeQuery(line, query));
  const missing =
    Boolean(query.trim()) &&
    (/^[0-9]+$/.test(query.trim()) ? !index.has(query.trim()) : !matchesQuery);
  return (
    <form
      className="rounded-2xl border border-blue-200 bg-blue-50 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!editable || busy || !query.trim() || resolving.current) return;
        resolving.current = true;
        setLookingUp(true);
        setScanNotice("");
        try {
          const exact = index.get(query.trim()) ?? [];
          const matches = exact.length
            ? exact
            : lines.filter((line) => matchesStocktakeQuery(line, query));
          let row = matches.length === 1 ? matches[0] : undefined;
          if (!row && missing) {
            const resolved = await onResolve(query.trim());
            if (resolved === undefined)
              throw new Error(
                "Бүртгэлийг шалгаж чадсангүй. Дээрх алдааны мэдээллийг шалгана уу.",
              );
            if (resolved === null) {
              if (canCreate) onMissing(newProductSeed(query));
              else setScanNotice("Бараа бүртгэх эрхтэй ажилтанд хандана уу.");
              return;
            }
            row = resolved;
          }
          if (!row) {
            setScanNotice("Жагсаалтаас зөв барааг сонгож тоолно уу.");
            return;
          }
          if (incrementMode && normalizePosMeasureUnit(row.unit) !== "kg") {
            const counted = (row.counted ?? 0) + 1;
            if (counted > 2147483647)
              throw new Error("Тоо хэмжээ хязгаараас хэтэрсэн байна.");
            // Open the count step if saving fails: keep the absolute intended count,
            // rather than incrementing it again on retry.
            try {
              await onSave({ id: row.id, counted, note: row.note });
            } catch (error) {
              onSelect({ ...row, counted });
              throw error;
            }
            restoreAfterScan.current = true;
            onFind("");
            setScanNotice(
              `${stocktakeLineName(row)}: ${counted} ш хадгаллаа ✓`,
            );
          } else onSelect(row);
        } catch (error) {
          setScanNotice(
            error instanceof Error
              ? error.message
              : "Хадгалж чадсангүй. Дахин оролдоно уу.",
          );
        } finally {
          resolving.current = false;
          setLookingUp(false);
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
          disabled={busy || lookingUp}
          autoComplete="off"
          placeholder="Нэр эсвэл баркод оруулах…"
          className={fieldClass}
        />
        {editable && (
          <button
            disabled={busy || lookingUp || !query.trim()}
            className={`${buttonClass} shrink-0`}
          >
            {lookingUp
              ? "Шалгаж байна…"
              : missing
                ? "Бүртгэлээс шалгах"
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
            disabled={busy || lookingUp}
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
          Тооллогын жагсаалтад хараахан олдсонгүй. Enter дарж байгууллагын
          барааны бүртгэлээс шалгана уу.
        </p>
      )}
      <p
        role="status"
        aria-live="polite"
        className="mt-2 min-h-5 text-sm text-blue-800"
      >
        {scanNotice || (!query && savedNotice)}
      </p>
    </form>
  );
}
