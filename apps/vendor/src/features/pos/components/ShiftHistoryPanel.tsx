"use client";
import { Loader2, X } from "lucide-react";
import type { PosShiftHistoryItem } from "../types/shift.types";
import type { PosReceipt } from "../types/receipt.types";
import {
  SHIFT_HISTORY_RANGE_OPTIONS,
  type ShiftHistoryRangeId,
} from "../constants/shift-history-ranges";
import { formatMoney, formatDateTime } from "../utils/pos-display-format";

interface Props {
  shiftHistoryRange: ShiftHistoryRangeId;
  setShiftHistoryRange: (range: ShiftHistoryRangeId) => void;
  reloadShiftHistory: () => void;
  setShowShiftHistoryPanel: (open: boolean) => void;
  shiftHistoryError: string;
  shiftHistoryLoading: boolean;
  shiftHistory: PosShiftHistoryItem[];
  selectedShiftHistoryId: string;
  setSelectedShiftHistoryId: (id: string) => void;
  selectedShiftHistory: PosShiftHistoryItem | null;
  shiftHistoryReceiptsLoading: boolean;
  shiftHistoryReceiptsError: string;
  shiftHistoryReceipts: PosReceipt[];
}

export function ShiftHistoryPanel({
  shiftHistoryRange,
  setShiftHistoryRange,
  reloadShiftHistory,
  setShowShiftHistoryPanel,
  shiftHistoryError,
  shiftHistoryLoading,
  shiftHistory,
  selectedShiftHistoryId,
  setSelectedShiftHistoryId,
  selectedShiftHistory,
  shiftHistoryReceiptsLoading,
  shiftHistoryReceiptsError,
  shiftHistoryReceipts,
}: Props) {
  const selectedShiftHistoryRange =
    SHIFT_HISTORY_RANGE_OPTIONS.find(
      (option) => option.id === shiftHistoryRange,
    ) ?? SHIFT_HISTORY_RANGE_OPTIONS[0];

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="vendor-pos-shift-history-title"
            className="text-sm font-bold text-slate-900"
          >
            Өдрийн хаалтын түүх
          </h3>
          <p className="text-[11px] text-slate-500">
            {selectedShiftHistoryRange.description} дүн, зөрүү болон баримтууд
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {SHIFT_HISTORY_RANGE_OPTIONS.map((option) => {
              const selected = shiftHistoryRange === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setShiftHistoryRange(option.id)}
                  className={`h-7 rounded-md px-2.5 text-[11px] font-bold transition-colors ${
                    selected
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={reloadShiftHistory}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Шинэчлэх
          </button>
          <button
            type="button"
            onClick={() => setShowShiftHistoryPanel(false)}
            aria-label="Өдрийн хаалтын түүхийг хаах"
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {shiftHistoryError && (
        <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {shiftHistoryError}
        </div>
      )}

      <div className="mt-3 grid min-h-0 flex-1 grid-cols-[minmax(260px,0.85fr)_minmax(360px,1.15fr)] gap-3 overflow-hidden">
        <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-1">
          {shiftHistoryLoading && shiftHistory.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Хаалтын түүх ачаалж байна...
            </div>
          ) : shiftHistory.length === 0 ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Сонгосон хугацаанд хаалт хийгдээгүй байна.
            </div>
          ) : (
            shiftHistory.map((item) => {
              const selected = item.id === selectedShiftHistoryId;
              const difference = Number(item.cashDifference || 0);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedShiftHistoryId(item.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-teal-300 bg-teal-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Хаасан: {formatDateTime(item.closedAt)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Нээсэн: {formatDateTime(item.openedAt)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {item.cashierName} · {item.branchName}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        difference === 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {difference === 0 ? "Зөрүүгүй" : formatMoney(difference)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <p className="text-slate-400">Нийт</p>
                      <p className="font-bold text-slate-800">
                        {formatMoney(item.totalSales)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Бэлэн</p>
                      <p className="font-bold text-slate-800">
                        {formatMoney(item.cashSales)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Баримт</p>
                      <p className="font-bold text-slate-800">
                        {item.salesCount}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3">
          {selectedShiftHistory ? (
            <div className="flex h-full flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Нээсэн", formatDateTime(selectedShiftHistory.openedAt)],
                  ["Хаасан", formatDateTime(selectedShiftHistory.closedAt)],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-lg bg-white px-3 py-2"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-xs font-black text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Эхлэх мөнгө", selectedShiftHistory.openingCash],
                  ["Тооцоолсон бэлэн", selectedShiftHistory.expectedCash],
                  ["Хаасан мөнгө", selectedShiftHistory.closingCash || 0],
                  ["Зөрүү", selectedShiftHistory.cashDifference || 0],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-lg bg-white px-3 py-2"
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

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                {[
                  ["Бэлэн", selectedShiftHistory.cashSales],
                  ["Карт", selectedShiftHistory.cardSales],
                  ["QR төлбөр", selectedShiftHistory.qpaySales],
                  ["Зээл", selectedShiftHistory.creditSales],
                  ["Холимог баримт", selectedShiftHistory.mixedSales],
                ].map(([label, amount]) => (
                  <div
                    key={String(label)}
                    className="rounded-lg bg-white px-3 py-2"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {formatMoney(Number(amount))}
                    </p>
                  </div>
                ))}
              </div>

              {selectedShiftHistory.note && (
                <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                  {selectedShiftHistory.note}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg bg-white p-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">Баримтууд</p>
                  {shiftHistoryReceiptsLoading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  )}
                </div>
                {shiftHistoryReceiptsError ? (
                  <p className="rounded-md bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
                    {shiftHistoryReceiptsError}
                  </p>
                ) : shiftHistoryReceipts.length === 0 ? (
                  <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
                    Энэ хаалт дээр баримт алга байна.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {shiftHistoryReceipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-slate-100 px-2 py-1.5 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">
                            #{receipt.receiptNo}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatDateTime(receipt.createdAt)} ·{" "}
                            {receipt.paymentMethod}
                          </p>
                        </div>
                        <p className="font-black text-slate-900">
                          {formatMoney(receipt.grandTotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              Хаалт сонгоно уу.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
