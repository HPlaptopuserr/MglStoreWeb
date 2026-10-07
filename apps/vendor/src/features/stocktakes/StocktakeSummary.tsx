"use client";
import Link from "next/link";
import type { StocktakeDetail } from "@mgl/types";
import { stocktakeStatusLabels } from "./stocktake-model";
import { buttonClass, secondaryClass } from "./StocktakeOverview";
export type StocktakeAction =
  | "save"
  | "submit"
  | "reopen"
  | "refresh"
  | "approve"
  | "cancel";
export function StocktakeSummary({
  session,
  total,
  counted,
  differences,
  dirty,
  busy,
  canApprove,
  onAction,
}: {
  session: StocktakeDetail;
  total: number;
  counted: number;
  differences: number;
  dirty: number;
  busy: boolean;
  canApprove: boolean;
  onAction: (action: StocktakeAction) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{session.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {session.warehouse?.name || "Агуулахад холбоогүй дэлгүүрийн бараа"}{" "}
            · {session.kind === "FULL" ? "Бүтэн" : "Хэсэгчилсэн"} ·{" "}
            {stocktakeStatusLabels[session.status]}
          </p>
        </div>
        <div className="text-sm">
          <p>
            Тоолсон{" "}
            <strong>
              {counted} / {total}
            </strong>
          </p>
          <p className="mt-1 text-amber-700">
            Зөрүүтэй <strong>{differences}</strong>
          </p>
        </div>
      </div>
      <progress
        aria-label="Тооллогын явц"
        value={counted}
        max={Math.max(total, 1)}
        className="mt-4 h-2 w-full accent-blue-600"
      />
      <p className="mt-3 text-sm text-slate-500">
        Тоолоогүй мөр тэг гэсэн үг биш. Зөрүү бүрт шалтгаан бичээд хяналтад
        илгээнэ. Тоолох хугацаанд борлуулалт, орлогыг түр зогсоохыг зөвлөж
        байна.
      </p>
      {session.lines.some((line) => line.receiptRegisterId) && (
        <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          Тооллогоор нэмсэн{" "}
          {session.lines.filter((line) => line.receiptRegisterId).length}{" "}
          төрлийн бараа.
          <Link
            href="/goods-receipts"
            className="ml-2 font-semibold underline hover:text-emerald-950"
          >
            Хүлээн авалтын баримт харах →
          </Link>
          <span className="mt-1 block">
            Тооллого цуцлах нь бүртгэсэн орлогын баримтыг буцаахгүй.
          </span>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {session.status === "DRAFT" && (
          <>
            <button
              className={buttonClass}
              disabled={busy || !dirty}
              onClick={() => onAction("save")}
            >
              {busy
                ? "Боловсруулж байна…"
                : `Хадгалах${dirty ? ` (${dirty})` : ""}`}
            </button>
            <button
              className={secondaryClass}
              disabled={busy || Boolean(dirty) || !counted}
              onClick={() => onAction("submit")}
            >
              Хяналтад илгээх
            </button>
            <button
              className={secondaryClass}
              disabled={busy || Boolean(dirty)}
              onClick={() => onAction("refresh")}
            >
              Өөрчлөгдсөн барааг дахин тоолох
            </button>
          </>
        )}
        {session.status === "REVIEW" && canApprove && (
          <>
            <button
              className={buttonClass}
              disabled={busy}
              onClick={() => onAction("approve")}
            >
              Зөрүүг баталж үлдэгдэл шинэчлэх
            </button>
            <button
              className={secondaryClass}
              disabled={busy}
              onClick={() => onAction("reopen")}
            >
              Засварт буцаах
            </button>
          </>
        )}
        {["DRAFT", "REVIEW"].includes(session.status) && canApprove && (
          <button
            className={secondaryClass}
            disabled={busy || Boolean(dirty)}
            onClick={() => onAction("cancel")}
          >
            Цуцлах
          </button>
        )}
      </div>
      {dirty > 0 && (
        <p role="status" className="mt-3 text-sm text-amber-700">
          {dirty} мөр серверт хадгалаагүй байна.
        </p>
      )}
      {session.approvedAt && (
        <p className="mt-3 text-sm text-emerald-700">
          Баталсан: {new Date(session.approvedAt).toLocaleString("mn-MN")} ·
          Үлдэгдлийн хөдөлгөөнд бүртгэгдсэн.
        </p>
      )}
    </div>
  );
}
