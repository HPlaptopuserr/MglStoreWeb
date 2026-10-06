"use client";
import {
  Banknote,
  Loader2,
  RefreshCw,
  Printer,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import type {
  PosShift,
  CashDrawerSummary,
  CashDrawerEventType,
} from "../types/shift.types";
import { formatMoney, formatDateTime } from "../utils/pos-display-format";

interface Props {
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
  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Кассын шургуулга</h3>
          <p className="text-[11px] text-slate-500">
            Орлого, зарлага, шургуулга нээх, тооллого болон тайлан
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshCashDrawerSummary}
            disabled={!shift?.id || drawerLoading}
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
            disabled={!drawerSummary}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Тайлан
          </button>
        </div>
      </div>

      {drawerError && (
        <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
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
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {[
                [
                  "Эхлэх мөнгө",
                  drawerSummary?.openingCash ?? shift.openingCash,
                ],
                ["Бэлэн борлуулалт", drawerSummary?.cashSales ?? 0],
                ["Орлого", drawerSummary?.paidIn ?? 0],
                ["Зарлага", drawerSummary?.paidOut ?? 0],
                ["Тооцоолсон", drawerSummary?.expectedCash ?? 0],
                [
                  "Тоолсон",
                  countedCashTotal || drawerSummary?.countedCash || 0,
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
                    {formatMoney(Number(value))}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex gap-2">
                {(
                  [
                    ["PAID_IN", "Орлого", PlusCircle],
                    ["PAID_OUT", "Зарлага", MinusCircle],
                  ] as const
                ).map(([type, label, Icon]) => {
                  const selected = drawerEventType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDrawerEventType(type)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${
                        selected
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-2 lg:grid-cols-[160px_1fr_120px]">
                <input
                  type="number"
                  min="0"
                  value={drawerEventAmount}
                  onChange={(event) => setDrawerEventAmount(event.target.value)}
                  placeholder="Дүн ₮"
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                <input
                  value={drawerEventNote}
                  onChange={(event) => setDrawerEventNote(event.target.value)}
                  placeholder={
                    drawerEventType === "PAID_IN"
                      ? "Жишээ: нэмэлт задгай мөнгө"
                      : "Жишээ: банканд тушаав"
                  }
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateDrawerEvent()}
                  disabled={drawerEventSubmitting || !shift?.id}
                  className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {drawerEventSubmitting ? "..." : "Бүртгэх"}
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[280px] overflow-y-auto overscroll-contain rounded-lg bg-slate-50 p-2">
            {drawerSummary?.events.length ? (
              <div className="space-y-1.5">
                {drawerSummary.events.map((event) => (
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
    </div>
  );
}
