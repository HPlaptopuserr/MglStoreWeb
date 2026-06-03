"use client";

import type { LucideIcon } from "lucide-react";

type HrServiceGroupButtonProps = {
  active: boolean;
  icon: LucideIcon;
  label: string;
  count: number;
  onSelect: () => void;
};

export function HrServiceGroupButton({
  active,
  icon: Icon,
  label,
  count,
  onSelect,
}: HrServiceGroupButtonProps) {
  return (
    <button
      type="button"
      onMouseEnter={onSelect}
      onFocus={onSelect}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
        active
          ? "bg-white text-slate-950 shadow-sm ring-1 ring-emerald-100"
          : "text-slate-600 hover:bg-white hover:text-slate-950"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          active ? "bg-emerald-50 text-emerald-600" : "bg-white text-slate-400"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{label}</span>
        <span className="block text-xs text-slate-400">{count} үйлчилгээ</span>
      </span>
    </button>
  );
}
