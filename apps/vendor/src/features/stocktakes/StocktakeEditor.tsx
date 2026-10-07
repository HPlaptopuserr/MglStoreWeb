"use client";
import { StocktakeDialog } from "./StocktakeDialog";
import { StocktakeAddProduct } from "./StocktakeAddProduct";
import { useMemo, useState } from "react";
import {
  type StocktakeCountEdit,
  type StocktakeLineDto,
  type StocktakeDetail,
  type StocktakeNewProduct,
} from "@mgl/types";
import { StocktakeCountStep } from "./StocktakeCountStep";
import { StocktakeScanner } from "./StocktakeScanner";
import { StocktakeSummary, type StocktakeAction } from "./StocktakeSummary";
import { fieldClass, secondaryClass } from "./StocktakeOverview";
import { matchesStocktakeQuery } from "./stocktake-model";
import { StocktakeRow } from "./StocktakeRow";

export function StocktakeEditor({
  session,
  registers,
  canManageProducts,
  onAddProduct,
  onResolveProduct,
  edits,
  busy,
  canApprove,
  onSaveCount,
  onAction,
  onClose,
  onReload,
}: {
  session: StocktakeDetail;
  registers: { id: string; name: string }[];
  canManageProducts: boolean;
  onResolveProduct: (
    query: string,
  ) => Promise<StocktakeLineDto | null | undefined>;
  onAddProduct: (product: StocktakeNewProduct) => Promise<boolean>;
  edits: Record<string, StocktakeCountEdit>;
  busy: boolean;
  canApprove: boolean;
  onSaveCount: (edit: StocktakeCountEdit) => Promise<void>;
  onAction: (action: StocktakeAction) => void;
  onClose: () => void;
  onReload: () => void;
}) {
  const [newProduct, setNewProduct] = useState<{
    name: string;
    barcode: string;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState("");
  const [focusRequest, setFocusRequest] = useState(0);
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
    return lines.filter(
      (line) =>
        matchesStocktakeQuery(line, query) &&
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
  const finishStep = () => {
    setSelectedId(null);
    setNewProduct(null);
    setQuery("");
    setFocusRequest((value) => value + 1);
  };
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
      <StocktakeScanner
        focusRequest={focusRequest}
        savedNotice={savedNotice}
        onResolve={onResolveProduct}
        lines={lines}
        onSave={onSaveCount}
        editable={session.status === "DRAFT"}
        onSelect={(line) => {
          setNewProduct(null);
          setSelectedId(line.id);
        }}
        query={query}
        busy={busy}
        canCreate={session.status === "DRAFT" && canManageProducts}
        onMissing={(seed) => {
          setSelectedId(null);
          setNewProduct(seed);
        }}
        onFind={(value) => {
          setSelectedId(null);
          setNewProduct(null);
          setQuery(value);
          setPage(0);
          setFilter("all");
        }}
      />
      {selectedId &&
        session.status === "DRAFT" &&
        lines
          .filter((line) => line.id === selectedId)
          .map((line) => (
            <StocktakeDialog
              key={line.id}
              title="Бараа тоолох"
              busy={busy}
              onClose={finishStep}
            >
              <StocktakeCountStep
                key={line.id}
                line={line}
                busy={busy}
                onSave={async (edit) => {
                  await onSaveCount(edit);
                  setSavedNotice(`${line.name}: хадгаллаа ✓`);
                }}
                onDone={finishStep}
              />
            </StocktakeDialog>
          ))}
      {session.status === "DRAFT" && canManageProducts && newProduct && (
        <StocktakeDialog
          title="Шинэ бараа бүртгэх"
          busy={busy}
          onClose={finishStep}
        >
          <StocktakeAddProduct
            registers={registers}
            seed={newProduct}
            busy={busy}
            dirty={Boolean(dirty)}
            onAdd={onAddProduct}
            onDone={finishStep}
          />
        </StocktakeDialog>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-3 p-4">
          <span className="flex-1 self-center text-sm text-slate-500">
            {filtered.length} бараа
          </span>
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
                    onSelect={(row) => {
                      setNewProduct(null);
                      setSelectedId(row.id);
                    }}
                    editable={editable}
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
