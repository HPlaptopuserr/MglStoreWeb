"use client";
import { useId } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface Props {
  total: number;
  start: number;
  end: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  label: string;
  pageSizes?: readonly number[];
}
const buttonClass =
  "inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40";
export function ReportPagination({
  total,
  start,
  end,
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  label,
  pageSizes = [20, 50, 100],
}: Props) {
  const selectId = useId();
  if (!total) return null;
  const first = Math.max(1, Math.min(page - 2, pageCount - 4));
  const numbers = Array.from(
    { length: Math.min(5, pageCount) },
    (_, index) => first + index,
  );
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span role="status">
          Нийт {total.toLocaleString("mn-MN")} мөр · {start + 1}–{end}
        </span>
        <label htmlFor={selectId} className="flex items-center gap-2">
          Хуудсанд
          <select
            id={selectId}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-slate-700 focus-visible:outline-blue-600"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size} мөр
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={`${buttonClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          disabled={page === 1}
          onClick={() => onPageChange(1)}
          aria-label="Эхний хуудас"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          className={`${buttonClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Өмнөх хуудас"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Өмнөх</span>
        </button>
        {numbers.map((number) => (
          <button
            type="button"
            key={number}
            aria-label={`${number}-р хуудас`}
            aria-current={number === page ? "page" : undefined}
            onClick={() => onPageChange(number)}
            className={`${buttonClass} ${number === page ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          className={`${buttonClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Дараах хуудас"
        >
          <span className="hidden sm:inline">Дараах</span>
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className={`${buttonClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          disabled={page === pageCount}
          onClick={() => onPageChange(pageCount)}
          aria-label="Сүүлийн хуудас"
        >
          <ChevronsRight size={16} />
        </button>
        <span className="ml-1 text-xs text-slate-500">
          {page} / {pageCount}
        </span>
      </div>
    </nav>
  );
}
