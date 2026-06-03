"use client";

import { Plus } from "lucide-react";

type HrEmptyMaterialsStateProps = {
  onAddMaterial: () => void;
};

export function HrEmptyMaterialsState({
  onAddMaterial,
}: HrEmptyMaterialsStateProps) {
  return (
    <button
      type="button"
      onClick={onAddMaterial}
      className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center transition hover:border-emerald-200 hover:bg-emerald-50/40"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
        <Plus className="h-6 w-6" />
      </span>
      <span className="mt-4 text-base font-black text-slate-950">
        Эхний материал нэмэх
      </span>
      <span className="mt-1 max-w-sm text-sm text-slate-500">
        PDF, дэлгэрэнгүй тайлбар, маягтыг нэг дор холбож болно.
      </span>
    </button>
  );
}
