"use client";

import { CheckCircle, ChevronRight, Clock } from "lucide-react";

interface StockOrderSuccessDialogProps {
  showOrderSuccessModal: boolean;
  totalCartItems: number;
  finishSuccessfulOrder: () => void;
}

export function StockOrderSuccessDialog({
  showOrderSuccessModal,
  totalCartItems,
  finishSuccessfulOrder,
}: StockOrderSuccessDialogProps) {
  return (
    showOrderSuccessModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-success-title"
      >
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-6 pb-5 pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-50/60">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Хүсэлт хүлээн авлаа
                </p>
                <h2
                  id="order-success-title"
                  className="mt-1 text-lg font-bold text-slate-900"
                >
                  Захиалга амжилттай илгээгдлээ
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Таны бараа таталтын захиалга хяналтын шатанд шилжлээ.
                  Нийлүүлэгч баталгаажуулсны дараа захиалга идэвхжинэ.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50 px-2 py-3">
            <div className="px-4">
              <p className="text-xs text-slate-500">Нийт тоо хэмжээ</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {totalCartItems.toLocaleString()} ширхэг
              </p>
            </div>
            <div className="px-4">
              <p className="text-xs text-slate-500">Төлөв</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                <Clock className="h-3.5 w-3.5" />
                Хүлээгдэж байна
              </p>
            </div>
          </div>

          <div className="px-6 py-4">
            <button
              type="button"
              autoFocus
              onClick={finishSuccessfulOrder}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Захиалгын жагсаалт харах
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  );
}
