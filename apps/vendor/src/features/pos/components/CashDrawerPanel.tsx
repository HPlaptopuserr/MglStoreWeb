"use client";
import { Banknote, Loader2, RefreshCw, Printer, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { CashMovementForm } from "./CashMovementForm";
import type {
  PosShift,
  CashDrawerSummary,
  CashDrawerEventType,
} from "../types/shift.types";
import { formatMoney, formatDateTime } from "../utils/pos-display-format";

interface Props {
  onClose: () => void;
  shift: PosShift | null;
  drawerLoading: boolean;
  drawerEventSubmitting: boolean;
  drawerSummary: CashDrawerSummary | null;
  drawerError: string;
  countedCashTotal: number;
  drawerEventType: CashDrawerEventType;
  drawerEventAmount: string;
  drawerEventNote: string;
  refreshCashDrawerSummary: () => void;
  handleCreateDrawerEvent: (type?: CashDrawerEventType) => void;
  printCashDrawerReport: () => void;
  setDrawerEventType: (type: CashDrawerEventType) => void;
  setDrawerEventAmount: (amount: string) => void;
  setDrawerEventNote: (note: string) => void;
}

export function CashDrawerPanel({
  onClose,
  shift,
  drawerLoading,
  drawerEventSubmitting,
  drawerSummary,
  drawerError,
  countedCashTotal,
  drawerEventType,
  drawerEventAmount,
  drawerEventNote,
  refreshCashDrawerSummary,
  handleCreateDrawerEvent,
  printCashDrawerReport,
  setDrawerEventType,
  setDrawerEventAmount,
  setDrawerEventNote,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const currentSummary =
    drawerSummary?.shift.id === shift?.id ? drawerSummary : null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby="cash-drawer-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!drawerEventSubmitting) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="cash-drawer-title"
            className="text-lg font-bold text-slate-900"
          >
            Кассын бэлэн мөнгө
          </h3>
          <p className="text-[11px] text-slate-500">
            {shift
              ? `${shift.branchName} · ${shift.registerName || "Касс"} · ${shift.cashierName}`
              : "Орлого, зарлага болон үлдэгдлийн тайлан"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshCashDrawerSummary}
            disabled={!shift?.id || drawerLoading || drawerEventSubmitting}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {drawerLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Шинэчлэх
          </button>
          <button
            type="button"
            onClick={() => void handleCreateDrawerEvent("OPEN_DRAWER")}
            disabled={!shift?.id || drawerEventSubmitting}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            <Banknote className="h-3.5 w-3.5" />
            Шургуулга нээх
          </button>
          <button
            type="button"
            onClick={() => printCashDrawerReport()}
            disabled={!currentSummary || drawerLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Тайлан
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={drawerEventSubmitting}
            aria-label="Хаах"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {drawerError && (
        <div
          role="alert"
          className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
        >
          {drawerError}
        </div>
      )}

      {!shift ? (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Эхлээд ээлж нээнэ үү.
        </div>
      ) : (
        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-3">
            {drawerLoading && (
              <p role="status" className="text-xs text-slate-500">
                Үлдэгдэл шинэчилж байна…
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {[
                [
                  "Эхлэх мөнгө",
                  currentSummary?.openingCash ?? shift.openingCash,
                ],
                ["Бэлэн борлуулалт", currentSummary?.cashSales ?? null],
                ["Орлого", currentSummary?.paidIn ?? null],
                ["Зарлага", currentSummary?.paidOut ?? null],
                ["Бэлэн үлдэгдэл", currentSummary?.expectedCash ?? null],
                [
                  "Тоолсон",
                  countedCashTotal > 0
                    ? countedCashTotal
                    : (currentSummary?.countedCash ?? null),
                ],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-lg bg-slate-50 px-3 py-2"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {value === null ? "—" : formatMoney(Number(value))}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Бэлэн үлдэгдэл = эхлэх мөнгө + бэлэн борлуулалт + нэмсэн бэлэн −
              зарлага.
            </p>
            <CashMovementForm
              type={drawerEventType}
              amount={drawerEventAmount}
              note={drawerEventNote}
              expectedCash={currentSummary?.expectedCash ?? null}
              disabled={drawerLoading || shift.status !== "OPEN"}
              submitting={drawerEventSubmitting}
              onTypeChange={setDrawerEventType}
              onAmountChange={setDrawerEventAmount}
              onNoteChange={setDrawerEventNote}
              onSubmit={() => handleCreateDrawerEvent()}
            />
          </div>

          <div className="max-h-[280px] overflow-y-auto overscroll-contain rounded-lg bg-slate-50 p-2">
            <h4 className="mb-2 px-2 text-xs font-bold text-slate-700">
              Ээлжийн бэлэн мөнгөний хөдөлгөөн
            </h4>
            {currentSummary?.events.length ? (
              <div className="space-y-1.5">
                {currentSummary.events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-2 rounded-md bg-white px-2 py-1.5 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        {event.type === "PAID_IN"
                          ? "Орлого"
                          : event.type === "PAID_OUT"
                            ? "Зарлага"
                            : "Шургуулга нээсэн"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatDateTime(event.createdAt)}
                        {event.note ? ` · ${event.note}` : ""}
                      </p>
                    </div>
                    <p className="font-black text-slate-900">
                      {formatMoney(event.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-2 py-1.5 text-xs text-slate-500">
                Шургуулгын хөдөлгөөн бүртгэгдээгүй байна.
              </p>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
