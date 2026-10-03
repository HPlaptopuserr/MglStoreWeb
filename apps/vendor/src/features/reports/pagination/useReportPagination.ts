"use client";
import { useRef, useState } from "react";
import { paginateReportRows } from "./report-pagination";

export function useReportPagination<T>(
  rows: readonly T[],
  initialPageSize = 20,
) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState({
    source: rows,
    page: 1,
    pageSize: initialPageSize,
  });
  // Reset synchronously when filters or refreshed data replace the source.
  if (selection.source !== rows)
    setSelection({ ...selection, source: rows, page: 1 });
  const pagination = paginateReportRows(
    rows,
    selection.source === rows ? selection.page : 1,
    selection.pageSize,
  );
  function focusList() {
    requestAnimationFrame(() => {
      anchorRef.current?.focus({ preventScroll: true });
      anchorRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    });
  }
  return {
    ...pagination,
    anchorRef,
    onPageChange: (page: number) => {
      setSelection({ source: rows, page, pageSize: selection.pageSize });
      focusList();
    },
    onPageSizeChange: (pageSize: number) => {
      setSelection({ source: rows, page: 1, pageSize });
      focusList();
    },
  };
}
