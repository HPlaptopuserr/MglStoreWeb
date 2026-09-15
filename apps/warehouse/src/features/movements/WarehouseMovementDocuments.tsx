"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  PackageOpen,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { MovementDocumentsTable } from "./MovementDocumentsTable";
import { useMovementDocuments } from "./useMovementDocuments";
import type { MovementDocument } from "./movement-document.model";

const MovementDocumentPreview = dynamic(
  () =>
    import("./MovementDocumentPreview").then(
      (module) => module.MovementDocumentPreview,
    ),
  {
    loading: () => (
      <p
        role="status"
        className="fixed bottom-6 right-6 z-50 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm shadow-lg"
      >
        Падаан нээж байна…
      </p>
    ),
  },
);

export function WarehouseMovementDocuments({
  warehouseId,
  dateFrom,
  dateTo,
  dateFilter,
  onClearDates,
}: {
  warehouseId: string;
  dateFrom: string;
  dateTo: string;
  dateFilter: ReactNode;
  onClearDates: () => void;
}) {
  const {
    documents,
    pagination,
    search,
    setSearch,
    loading,
    error,
    refresh,
    goToPage,
  } = useMovementDocuments(warehouseId, dateFrom, dateTo);
  const [selectedDocument, setSelectedDocument] =
    useState<MovementDocument | null>(null);
  const filtered = Boolean(search || dateFrom || dateTo);
  const clearFilters = () => {
    setSearch("");
    onClearDates();
  };
  return (
    <section
      aria-label="Падааны хөдөлгөөн"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40"
    >
      <div className="space-y-4 p-4 lg:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              aria-label="Падаан хайх"
              aria-describedby="movement-search-help"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Падааны дугаар, харилцагч, бараа хайх…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {search && (
              <button
                type="button"
                aria-label="Хайлт цэвэрлэх"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <span id="movement-search-help" className="sr-only">
              GRN, DSP, SR дугаар, нийлүүлэгч, дэлгүүр, барааны нэр, SKU эсвэл
              баркодоор хайна.
            </span>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw
              aria-hidden="true"
              className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`}
            />
            Шинэчлэх
          </button>
        </div>
        {dateFilter}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <FileText aria-hidden="true" className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">
            Падааны жагсаалт
          </h3>
          <span
            aria-live="polite"
            className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600"
          >
            {loading ? "…" : error ? "—" : pagination.total.toLocaleString()}
          </span>
        </div>
        {filtered ? (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded px-1 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Шүүлтүүр цэвэрлэх
          </button>
        ) : (
          <span className="text-xs text-slate-400">
            Сүүлийн хөдөлгөөн эхэнд
          </span>
        )}
      </div>
      <div aria-busy={loading}>
        {loading ? (
          <div role="status" className="border-t border-slate-100 p-5">
            <span className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
              Хөдөлгөөн ачаалж байна…
            </span>
            <div
              aria-hidden="true"
              className="mt-5 space-y-4 motion-safe:animate-pulse"
            >
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="flex h-12 items-center justify-between gap-6 border-b border-slate-100 pb-4"
                >
                  <div className="h-3 w-2/5 rounded bg-slate-100" />
                  <div className="h-3 w-1/5 rounded bg-slate-100" />
                  <div className="h-3 w-1/6 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-14 text-center"
          >
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Дахин оролдох
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div
            role="status"
            className="flex flex-col items-center border-t border-slate-100 px-5 py-16 text-center"
          >
            <span className="mb-4 rounded-2xl bg-slate-50 p-4">
              <PackageOpen className="h-7 w-7 text-slate-400" />
            </span>
            <h4 className="text-sm font-semibold text-slate-800">
              {filtered
                ? "Хайлтад тохирох падаан олдсонгүй"
                : "Хөдөлгөөн бүртгэгдээгүй байна"}
            </h4>
            <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
              {filtered
                ? "Хайх үг эсвэл хугацаагаа өөрчилж дахин хайна уу."
                : "Энэ агуулахын орлого, зарлагын падаанууд энд харагдана."}
            </p>
            {filtered && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Бүх хөдөлгөөн харах
              </button>
            )}
          </div>
        ) : (
          <MovementDocumentsTable
            documents={documents}
            onSelect={setSelectedDocument}
          />
        )}
      </div>
      {!loading && !error && documents.length > 0 && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            / {pagination.total.toLocaleString()} падаан
          </p>
          <nav
            aria-label="Падааны хуудаслалт"
            className="flex items-center gap-3"
          >
            <span className="text-xs tabular-nums text-slate-500">
              {pagination.page} / {Math.max(1, pagination.totalPages)}
            </span>
            {[
              {
                label: "Өмнөх хуудас",
                icon: ChevronLeft,
                page: pagination.page - 1,
                disabled: pagination.page <= 1,
              },
              {
                label: "Дараагийн хуудас",
                icon: ChevronRight,
                page: pagination.page + 1,
                disabled: pagination.page >= pagination.totalPages,
              },
            ].map(({ label, icon: Icon, page, disabled }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                disabled={disabled}
                onClick={() => goToPage(page)}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </nav>
        </footer>
      )}
      {selectedDocument && (
        <MovementDocumentPreview
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </section>
  );
}
