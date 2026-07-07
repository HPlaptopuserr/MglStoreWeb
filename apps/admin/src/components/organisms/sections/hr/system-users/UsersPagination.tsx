"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type UsersPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (updater: (page: number) => number) => void;
  onExactPageChange: (page: number) => void;
};

export function UsersPagination({
  currentPage,
  totalPages,
  onPageChange,
  onExactPageChange,
}: UsersPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        type="button"
        onClick={() => onPageChange((page) => Math.max(1, page - 1))}
        disabled={currentPage <= 1}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {Array.from({ length: totalPages }, (_, index) => index + 1)
        .filter(
          (page) =>
            page === 1 ||
            page === totalPages ||
            Math.abs(page - currentPage) <= 1,
        )
        .map((page, index, pages) => (
          <span key={page}>
            {index > 0 && pages[index - 1] !== page - 1 && (
              <span className="px-1 text-slate-300">...</span>
            )}
            <button
              type="button"
              onClick={() => onExactPageChange(page)}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors ${
                page === currentPage
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {page}
            </button>
          </span>
        ))}

      <button
        type="button"
        onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
        disabled={currentPage >= totalPages}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
