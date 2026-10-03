"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import type * as React from "react";

interface StockOrderConfirmationDialogProps {
  showConfirmModal: boolean;
  totalCartItems: number;
  setShowConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

export function StockOrderConfirmationDialog({
  showConfirmModal,
  totalCartItems,
  setShowConfirmModal,
  handleSubmit,
  isSubmitting,
}: StockOrderConfirmationDialogProps) {
  return (
    showConfirmModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-amber-100 p-3">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <h3 className="text-center text-lg font-bold text-slate-900">
            Итгэлтэй байна уу?
          </h3>
          <p className="mt-2 text-center text-sm text-slate-500">
            Та {totalCartItems} ширхэг барааны захиалга илгээхдээ итгэлтэй байна
            уу?
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Болих
            </button>
            <button
              onClick={() => {
                setShowConfirmModal(false);
                handleSubmit();
              }}
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-[#FFAD02] py-2.5 text-sm font-bold text-white hover:bg-[#E09D00] disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mx-auto animate-spin" />
              ) : (
                "Тийм, илгээх"
              )}
            </button>
          </div>
        </div>
      </div>
    )
  );
}
