"use client";
export interface ReceiptRevision {
  id: string;
  actorName: string;
  kind: string;
  reason: string;
  createdAt: string;
  changes: {
    field: string;
    before: string | number | null;
    after: string | number | null;
  }[];
}
const labels: Record<string, string> = {
  supplierName: "Нийлүүлэгч",
  supplierRegisterNo: "Нийлүүлэгчийн регистр",
  documentNo: "Падааны дугаар",
  note: "Тайлбар",
  merge: "Нэгтгэсэн эх баримтууд",
};
function displayBefore(
  change: ReceiptRevision["changes"][number],
): string | number {
  if (change.field !== "merge" || typeof change.before !== "string")
    return change.before ?? "—";
  try {
    const rows: unknown = JSON.parse(change.before);
    if (Array.isArray(rows))
      return rows
        .map((row: unknown) =>
          row && typeof row === "object" && "no" in row ? String(row.no) : "",
        )
        .filter(Boolean)
        .join(", ");
  } catch {
    /* Older history may contain plain receipt numbers. */
  }
  return change.before;
}
export function ReceiptHistory({
  revisions,
  sourceReceipts,
}: {
  revisions: ReceiptRevision[];
  sourceReceipts: string[];
}) {
  return (
    <section
      className="m-4 rounded-xl border border-slate-200 bg-white p-5 sm:m-6"
      aria-label="Падааны өөрчлөлтийн түүх"
    >
      <h3 className="font-semibold text-slate-900">Өөрчлөлтийн түүх</h3>
      {sourceReceipts.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-blue-700">
            Нэгтгэсэн {sourceReceipts.length} эх баримт
          </summary>
          <p className="mt-2 break-words text-slate-500">
            {sourceReceipts.join(", ")}
          </p>
        </details>
      )}
      {!revisions.length ? (
        <p className="mt-3 text-sm text-slate-500">Засвар хийгдээгүй.</p>
      ) : (
        <ol className="mt-3 space-y-4">
          {revisions.map((row) => (
            <li key={row.id} className="border-l-2 border-blue-200 pl-4">
              <p className="text-sm font-semibold">
                {row.actorName} ·{" "}
                {row.kind === "MERGE" ? "Баримт нэгтгэсэн" : "Засварласан"}
              </p>
              <time className="text-xs text-slate-500" dateTime={row.createdAt}>
                {new Date(row.createdAt).toLocaleString("mn-MN", {
                  timeZone: "Asia/Ulaanbaatar",
                })}
              </time>
              <p className="my-2 text-sm">Шалтгаан: {row.reason}</p>
              <ul className="space-y-1 text-sm text-slate-600">
                {row.changes.map((change, index) => (
                  <li key={index}>
                    <strong>{labels[change.field] ?? change.field}:</strong>{" "}
                    {displayBefore(change)} → {change.after ?? "—"}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
