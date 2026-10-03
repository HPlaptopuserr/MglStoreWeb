"use client";

import type { ReactNode } from "react";
import { Loader2, PackageCheck } from "lucide-react";
import { ReceiptDocumentHeader } from "./ReceiptDocumentHeader";

interface GoodsReceiptDocumentProps {
  children: ReactNode;
  submitting: boolean;
  canSubmit: boolean;
  destination: string;
  destinationLabel?: string;
  lineCount: number;
  quantityLabel: string;
  totalCost: number;
  error?: string;
  guidance?: string;
  updatesSalePrice?: boolean;
  showSummary?: boolean;
  onSubmit: () => void;
}

export function GoodsReceiptDocument({
  children,
  submitting,
  canSubmit,
  destination,
  destinationLabel = "Салбар",
  lineCount,
  quantityLabel,
  totalCost,
  error,
  guidance,
  updatesSalePrice = true,
  showSummary = true,
  onSubmit,
}: GoodsReceiptDocumentProps) {
  return (
    <fieldset
      disabled={submitting}
      className="min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm disabled:opacity-70"
    >
      <ReceiptDocumentHeader />
      <div className="space-y-0">{children}</div>
      {showSummary && (
        <footer className="grid gap-6 bg-slate-50/50 p-4 sm:p-6 md:grid-cols-2">
          <div className="text-sm leading-6 text-slate-500">
            <p className="font-semibold text-slate-800">
              Баримтыг шалгаад баталгаажуулна уу
            </p>
            <p className="mt-2">
              Нийлүүлэгч, хүлээн авах{" "}
              {destinationLabel.toLocaleLowerCase("mn-MN")}, тоо хэмжээ болон
              үнийг нягтална уу. Баталгаажуулсны дараа баримтын дугаар үүсэж,
              үлдэгдэл нэмэгдэнэ.
            </p>
            {updatesSalePrice && (
              <p className="mt-4 text-xs">
                Зарах үнэ бөглөсөн мөрийн борлуулах үнэ мөн шинэчлэгдэнэ.
              </p>
            )}
          </div>
          <div className="w-full max-w-md md:ml-auto">
            <h2 className="text-base font-black text-slate-950">
              Баримтын дүн
            </h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{destinationLabel}</dt>
                <dd className="max-w-44 truncate text-right font-bold text-slate-900">
                  {destination || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Барааны багц</dt>
                <dd className="font-black text-slate-900">{lineCount}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <dt className="font-bold text-slate-700">Нийт хүлээн авах</dt>
                <dd className="text-xl font-black text-slate-950">
                  {quantityLabel}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-bold text-slate-700">Нийт авсан өртөг</dt>
                <dd className="font-black text-cyan-700">
                  {new Intl.NumberFormat("mn-MN").format(totalCost)}₮
                </dd>
              </div>
            </dl>
            {guidance && (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                {guidance}
              </p>
            )}
            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
              >
                {error}
              </div>
            )}
            <button
              type="button"
              disabled={submitting || !canSubmit}
              onClick={onSubmit}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-black text-white transition hover:bg-cyan-700 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PackageCheck className="h-4 w-4" />
              )}
              {submitting
                ? "Бүртгэж байна..."
                : "Баримтыг баталгаажуулж хүлээн авах"}
            </button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
              Хүлээн авсан тоо үлдэгдэлд нэмэгдэнэ.
            </p>
          </div>
        </footer>
      )}
    </fieldset>
  );
}
