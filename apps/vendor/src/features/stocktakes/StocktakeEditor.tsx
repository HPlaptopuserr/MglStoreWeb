"use client";
import { StocktakeExportButton } from "./StocktakeExportButton";
import { StocktakeReviewPanel } from "./StocktakeReviewPanel";
import {
  matchesReviewFilter,
  stocktakeCompletionIssue,
  type StocktakeReviewFilter,
} from "./stocktake-review";
import { StocktakeDialog } from "./StocktakeDialog";
import { StocktakeAddProduct } from "./StocktakeAddProduct";
import { useEffect, useMemo, useState } from "react";
import {
  type StocktakeCountEdit,
  type StocktakeLineDto,
  type StocktakeDetail,
  type StocktakeNewProduct,
} from "@mgl/types";
import { StocktakeScanner } from "./StocktakeScanner";
import { StocktakeSummary, type StocktakeAction } from "./StocktakeSummary";
import { secondaryClass } from "./StocktakeOverview";
import {
  matchesStocktakeQuery,
  prioritizeStocktakeLines,
} from "./stocktake-model";
import { StocktakeLineTable } from "./StocktakeLineTable";

export function StocktakeEditor({
  session,
  loadForExport,
  changedLineIds,
  addedProductCount,
  onPrepareReview,
  onFinishReview,
  registers,
  canManageProducts,
  onAddProduct,
  onResolveProduct,
  edits,
  busy,
  canApprove,
  onSaveCount,
  onEdit,
  onAction,
  onClose,
  onReload,
}: {
  session: StocktakeDetail;
  loadForExport: (id: string) => Promise<StocktakeDetail>;
  changedLineIds?: string[];
  addedProductCount: number;
  onPrepareReview: () => void;
  onFinishReview: () => void;
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
  onEdit: (edit: StocktakeCountEdit) => void;
  onAction: (action: StocktakeAction) => void;
  onClose: () => void;
  onReload: () => void;
}) {
  const [newProduct, setNewProduct] = useState<{
    name: string;
    barcode: string;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [focusRequest, setFocusRequest] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const changedIds = useMemo(() => new Set(changedLineIds), [changedLineIds]);
  useEffect(() => {
    if (!changedLineIds?.length) return;
    setQuery("");
    setFilter("all");
    setPage(0);
  }, [changedLineIds]);
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
    return prioritizeStocktakeLines(lines, changedIds).filter(
      (line) =>
        matchesStocktakeQuery(line, query) &&
        matchesReviewFilter(line, filter, changedIds),
    );
  }, [lines, query, filter, changedIds]);
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
  const selectReviewFilter = (value: StocktakeReviewFilter) => {
    setQuery("");
    setPage(0);
    setFilter(value);
  };
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
      <StocktakeExportButton
        session={session}
        load={loadForExport}
        disabled={busy}
      />
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
        savedNotice=""
        onResolve={onResolveProduct}
        lines={lines}
        onSave={onSaveCount}
        editable={session.status === "DRAFT"}
        onSelect={(line) => {
          setNewProduct(null);
          setQuery("");
          setFilter("all");
          const index = prioritizeStocktakeLines(lines, changedIds).findIndex(
            (row) => row.id === line.id,
          );
          setPage(Math.max(0, Math.floor(index / 50)));
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
      <StocktakeReviewPanel
        differences={differences}
        changed={changedIds.size}
        added={addedProductCount}
        uncounted={lines.length - counted}
        filter={filter}
        status={session.status}
        busy={busy}
        canApprove={canApprove}
        completionIssue={stocktakeCompletionIssue({ ...session, lines })}
        onFilter={selectReviewFilter}
        onPrepare={() => {
          selectReviewFilter("uncounted");
          onPrepareReview();
        }}
        onReopen={() => onAction("reopen")}
        onFinish={onFinishReview}
      />
      <StocktakeLineTable
        filtered={filtered}
        filter={filter}
        changedIds={changedIds}
        currentPage={currentPage}
        editable={editable}
        selectedId={selectedId}
        onEdit={onEdit}
        onFilter={(value) => {
          setFilter(value);
          setPage(0);
        }}
        onPage={setPage}
      />
    </section>
  );
}
