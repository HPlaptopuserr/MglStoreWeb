"use client";
import { StocktakeAddProduct } from "./StocktakeAddProduct";
import { useMemo, useState } from "react";
import { type StocktakeCountEdit, type StocktakeDetail, type StocktakeNewProduct } from "@mgl/types";
import { StocktakeScanner } from "./StocktakeScanner";
import { StocktakeSummary, type StocktakeAction } from "./StocktakeSummary";
import { fieldClass, secondaryClass } from "./StocktakeOverview";
import { StocktakeRow } from "./StocktakeRow";

export function StocktakeEditor({
  session, registers, canManageProducts, onAddProduct,
  edits,
  busy,
  canApprove,
  onEdit,
  onAction,
  onClose,
  onReload,
  onError,
}: {
  session: StocktakeDetail;
  registers: { id: string; name: string }[];
  canManageProducts: boolean;
  onAddProduct: (product: StocktakeNewProduct) => Promise<boolean>;
  edits: Record<string, StocktakeCountEdit>;
  busy: boolean;
  canApprove: boolean;
  onEdit: (edit: StocktakeCountEdit) => void;
  onAction: (action: StocktakeAction) => void;
  onClose: () => void;
  onReload: () => void;
  onError: (error: string) => void;
}) {
  const [missingBarcode, setMissingBarcode] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const lines = useMemo(
    () =>
      session.lines.map((line) =>
        edits[line.id] ? { ...line, ...edits[line.id] } : line,
      ),
    [session.lines, edits],
  );
  const counted = lines.filter((line) => line.counted !== null).length;
  const differences = lines.filter(
    (line) => line.counted !== null && line.counted !== line.expected,
  ).length;
  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("mn-MN");
    return lines.filter(
      (line) =>
        (!value ||
          [line.name, line.barcode, ...line.barcodeAliases].some((text) =>
            text?.toLocaleLowerCase("mn-MN").includes(value),
          )) &&
        (filter === "all" ||
          (filter === "uncounted"
            ? line.counted === null
            : line.counted !== null && line.counted !== line.expected)),
    );
  }, [lines, query, filter]);
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 50) - 1),
  );
  const editable = session.status === "DRAFT" && !busy;
  const dirty = Object.keys(edits).length;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className={secondaryClass} disabled={busy} onClick={onClose}>
          ← Тооллогууд
        </button>
        <button className={secondaryClass} disabled={busy} onClick={onReload}>
          Серверээс дахин ачаалах
        </button>
      </div>
      <StocktakeSummary
        session={session}
        total={lines.length}
        counted={counted}
        differences={differences}
        dirty={dirty}
        busy={busy}
        canApprove={canApprove}
        onAction={onAction}
      />
      {session.status === "DRAFT" && (
        <StocktakeScanner
          lines={session.lines}
          edits={edits}
          editable={editable}
          onEdit={onEdit}
          onError={onError}
          onMissing={setMissingBarcode}
          onFind={(value) => {
            setQuery(value);
            setPage(0);
            setFilter("all");
          }}
        />
      )}
      {session.status === "DRAFT" && canManageProducts && (
        <StocktakeAddProduct registers={registers} barcode={missingBarcode} busy={busy} dirty={Boolean(dirty)} onAdd={onAddProduct} onDone={() => setMissingBarcode("")} />
      )}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-3 p-4">
          <label className="min-w-48 flex-1">
            <span className="sr-only">Бараа хайх</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Нэр эсвэл баркодоор хайх"
              className={fieldClass}
            />
          </label>
          <select
            aria-label="Мөр шүүх"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(0);
            }}
            className={`${fieldClass} sm:max-w-52`}
          >
            <option value="all">Бүх бараа</option>
            <option value="uncounted">Тоолоогүй</option>
            <option value="difference">Зөрүүтэй</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                {[
                  "Бараа",
                  "Системийн тоо",
                  "Бодит тоо",
                  "Зөрүү",
                  "Шалтгаан / тайлбар",
                ].map((label) => (
                  <th key={label} scope="col" className="p-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice(currentPage * 50, currentPage * 50 + 50)
                .map((line) => (
                  <StocktakeRow
                    key={line.id}
                    line={line}
                    editable={editable}
                    onEdit={onEdit}
                    onError={onError}
                  />
                ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <p className="p-8 text-center text-slate-500">
            Тохирох бараа алга байна.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm text-slate-500">
          <span>
            {filtered.length} бараа · Хуудас {currentPage + 1} /{" "}
            {Math.max(1, Math.ceil(filtered.length / 50))}
          </span>
          <div className="flex gap-2">
            <button
              className={secondaryClass}
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Өмнөх
            </button>
            <button
              className={secondaryClass}
              disabled={(currentPage + 1) * 50 >= filtered.length}
              onClick={() => setPage(currentPage + 1)}
            >
              Дараах
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
