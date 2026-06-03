"use client";

import { RotateCcw, Send } from "lucide-react";

type FormSubmitBarProps = {
  disabled: boolean;
  onClear: () => void;
  onSubmit: () => void;
  submitting: boolean;
};

export function FormSubmitBar({
  disabled,
  onClear,
  onSubmit,
  submitting,
}: FormSubmitBarProps) {
  return (
    <div className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <RotateCcw className="h-4 w-4" />
          Цэвэрлэх
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || submitting}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Илгээж байна..." : "Илгээх"}
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
