"use client";

import { Plus } from "lucide-react";

type HrEmptyHeadingsStateProps = {
  onAddHeading: () => void;
};

export function HrEmptyHeadingsState({
  onAddHeading,
}: HrEmptyHeadingsStateProps) {
  return (
    <button
      type="button"
      onClick={onAddHeading}
      className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center transition hover:border-emerald-200 hover:bg-emerald-50/40"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Plus className="h-7 w-7" />
      </span>
      <span className="mt-5 text-lg font-black text-slate-950">
        Эхний гол гарчгийг үүсгэх
      </span>
      <span className="mt-2 max-w-md text-sm text-slate-500">
        Жишээ нь “HR бичиг баримт”, “Сонгон шалгаруулалт”, “Ажилтны үйлчилгээ”
        гэх мэт.
      </span>
    </button>
  );
}
