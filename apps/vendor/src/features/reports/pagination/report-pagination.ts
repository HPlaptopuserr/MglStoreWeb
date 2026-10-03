export function paginateReportRows<T>(
  rows: readonly T[],
  requestedPage: number,
  requestedSize: number,
) {
  const pageSize = Number.isFinite(requestedSize)
    ? Math.max(1, Math.trunc(requestedSize))
    : 20;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Number.isFinite(requestedPage)
    ? Math.min(pageCount, Math.max(1, Math.trunc(requestedPage)))
    : 1;
  const start = (page - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    page,
    pageSize,
    pageCount,
    start,
    end: Math.min(start + pageSize, rows.length),
    total: rows.length,
  };
}
