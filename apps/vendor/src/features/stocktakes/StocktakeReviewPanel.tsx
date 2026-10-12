"use client";
import type { StocktakeStatus } from "@mgl/types";
import { buttonClass, secondaryClass } from "./StocktakeOverview";
import type { StocktakeReviewFilter } from "./stocktake-review";

export function StocktakeReviewPanel({
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
  return (
    <section
      aria-label="Тооллогын шалгалт"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h3 className="font-bold text-slate-900">Тооллогын шалгалт</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={filter === "difference"}
          onClick={() => onFilter("difference")}
          className={`rounded-xl border p-4 text-left transition hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-blue-600 ${filter === "difference" ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}
        >
          <span className="block font-semibold">
            Зөрүүтэй бараа · {differences}
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            Системийн болон бодит тоо, зөрүүний шалтгааныг шалгах
          </span>
        </button>
        <button
          type="button"
          aria-pressed={filter === "changed"}
          onClick={() => onFilter("changed")}
          className={`rounded-xl border p-4 text-left transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-blue-600 ${filter === "changed" ? "border-rose-500 bg-rose-50" : "border-slate-200"}`}
        >
          <span className="block font-semibold">
            Мэдээлэл өөрчлөгдсөн · {changed}
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            Тооллого эхэлснээс хойш өөрчлөгдсөн мөрүүдийг шалгах
          </span>
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryClass}
          onClick={() => onFilter("all")}
        >
          Бүх бараа
        </button>
        <button
          type="button"
          className={secondaryClass}
          onClick={() => onFilter("uncounted")}
        >
          Тоолоогүй · {uncounted}
        </button>
        {active && canApprove && status === "REVIEW" && !changed && !added && (
          <button
            type="button"
            disabled={busy}
            className={secondaryClass}
            onClick={onReopen}
          >
            Тоо, шалтгаан засах
          </button>
        )}
        {active &&
          (status === "DRAFT" || canApprove) &&
          (changed > 0 || added > 0) && (
            <button
              type="button"
              disabled={busy}
              className={secondaryClass}
              onClick={onPrepare}
            >
              Шинэ мэдээллээр дахин тоолох
            </button>
          )}
      </div>
      {active && (changed > 0 || added > 0) && (
        <p role="status" className="text-sm text-amber-800">
          {changed} мөр өөрчлөгдсөн, {added} шинэ бараа нэмэгдсэн байна. Шинэ
          мэдээллээр дахин тоолох үед өөрчлөгдсөн мөрийн хуучин тоо
          цэвэрлэгдэнэ. Бусад мөр хадгалагдана. Дараа нь «Тоолоогүй» хэсэгт
          бодит тоог оруулна уу.
        </p>
      )}
      {active && canApprove && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={
              busy || changed > 0 || added > 0 || Boolean(completionIssue)
            }
            className={buttonClass}
            onClick={onFinish}
          >
            {busy ? "Боловсруулж байна…" : "Шалгасан тоог хадгалаад дуусгах"}
          </button>
          <p role="status" className="text-sm text-slate-600">
            {completionIssue ||
              "Бодит тоо, шалтгаанаа шалгасны дараа баталгаажуулна уу."}
          </p>
        </div>
      )}
    </section>
  );
}
