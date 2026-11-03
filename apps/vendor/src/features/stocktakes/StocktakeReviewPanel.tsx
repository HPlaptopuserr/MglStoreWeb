"use client";
import type { StocktakeStatus } from "@mgl/types";

import type { StocktakeReviewFilter } from "./stocktake-review";

export function StocktakeReviewPanel({
  counted,
  differences,
  changed,
  added,
  uncounted,
  filter,
  status,
  busy,
  canApprove,
  completionIssue,
  onFilter,
  onPrepare,
  onReopen,
  onFinish,
}: {
  counted: number;
  differences: number;
  changed: number;
  added: number;
  uncounted: number;
  filter: string;
  status: StocktakeStatus;
  busy: boolean;
  canApprove: boolean;
  completionIssue: string | null;
  onFilter: (filter: StocktakeReviewFilter) => void;
  onPrepare: () => void;
  onReopen: () => void;
  onFinish: () => void;
}) {
  const active = status === "DRAFT" || status === "REVIEW";
  const compactButton =
    "inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <section
      aria-label="Тооллогын шалгалт"
      className="space-y-2 rounded-xl border border-slate-200 bg-white p-3"
    >
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Бараа шүүх"
      >
        <h3 className="mr-1 text-sm font-semibold text-slate-900">Шалгах</h3>
        {(
          [
            { key: "all", title: "Бүгд", count: counted + uncounted },
            { key: "counted", title: "Тоолсон бараа", count: counted },
            { key: "uncounted", title: "Тоо оруулах", count: uncounted },
            { key: "difference", title: "Тоо зөрсөн", count: differences },
            { key: "changed", title: "Үлдэгдэл өөрчлөгдсөн", count: changed },
          ] as const
        ).map(({ key, title, count }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => onFilter(key)}
            className={`${compactButton} gap-2 ${filter === key ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600" : "text-slate-600"}`}
          >
            {title}
            <span className="rounded bg-slate-100 px-1.5 py-0.5 tabular-nums">
              {count}
            </span>
          </button>
        ))}
        {active && canApprove && status === "REVIEW" && (
          <button
            type="button"
            disabled={busy}
            className={compactButton}
            onClick={onReopen}
          >
            Тоо, шалтгаан засах
          </button>
        )}
      </div>
      {active && (changed > 0 || added > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p className="font-semibold">
            {changed} барааны мэдээлэл өөрчлөгдсөн
            {added > 0 ? ` · ${added} шинэ бараа` : ""}
          </p>
          {(status === "DRAFT" || canApprove) && (
            <details className="mt-1">
              <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-blue-600">
                Тоо цэвэрлэж дахин тоолох…
              </summary>
              <p className="my-2 max-w-3xl leading-5">
                Анхаар: энэ үйлдэл өөрчлөгдсөн барааны өмнөх тоо, тайлбарыг
                арилгана. Бусад барааны тоо хэвээр үлдэнэ. Зөвхөн дахин
                тоолохоор шийдсэн үед ашиглана уу.
              </p>
              <button
                type="button"
                disabled={busy}
                className={compactButton}
                onClick={onPrepare}
              >
                Тоо цэвэрлэх үйлдлийг үргэлжлүүлэх
              </button>
            </details>
          )}
        </div>
      )}
      {active && canApprove && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={
              busy || changed > 0 || added > 0 || Boolean(completionIssue)
            }
            className={`${compactButton} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`}
            onClick={onFinish}
          >
            {busy ? "Боловсруулж байна…" : "Тооллогыг баталж дуусгах"}
          </button>
          <p role="status" className="text-xs text-slate-500">
            {(changed > 0 || added > 0
              ? "Эхлээд өөрчлөгдсөн барааны мэдээллийг шалгана уу."
              : completionIssue) ||
              "Бодит тоо, шалтгаанаа шалгасны дараа баталгаажуулна уу."}
          </p>
        </div>
      )}
    </section>
  );
}
