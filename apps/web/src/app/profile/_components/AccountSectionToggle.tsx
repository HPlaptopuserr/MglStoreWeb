"use client";

import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";

type AccountSectionToggleProps = {
  badge: string;
  controls: string;
  eyebrow?: string;
  icon: LucideIcon;
  open: boolean;
  subtitle?: string;
  title: string;
  onToggle: () => void;
};

export function AccountSectionToggle({
  badge,
  controls,
  eyebrow,
  icon: Icon,
  open,
  subtitle,
  title,
  onToggle,
}: AccountSectionToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className="group flex w-full items-center gap-3 rounded-2xl text-left transition hover:-translate-y-0.5 hover:bg-orange-50/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 sm:gap-4"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 transition group-hover:bg-orange-500 group-hover:text-white sm:h-12 sm:w-12">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        {eyebrow ? (
          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 sm:text-xs">
            {eyebrow}
          </span>
        ) : null}
        <span className="mt-0.5 block text-base font-black text-slate-950 sm:text-xl">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-1 hidden text-sm font-semibold text-slate-500 sm:block">
            {subtitle}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1.5 text-[11px] font-black text-orange-600 sm:px-3 sm:text-xs">
        {badge}
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-orange-100 group-hover:text-orange-600">
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </span>
    </button>
  );
}
