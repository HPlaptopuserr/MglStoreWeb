"use client";

import { GripVertical } from "lucide-react";
import type { ServiceCategory } from "@/lib/sections/types";
import { getHrMaterials } from "@/components/organisms/sections/hr-services/hr-services-utils";

type HrHeadingSidebarProps = {
  headings: ServiceCategory[];
  activeHeadingId?: string;
  onSelect: (headingId: string) => void;
};

export function HrHeadingSidebar({
  headings,
  activeHeadingId,
  onSelect,
}: HrHeadingSidebarProps) {
  return (
    <aside className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
      <div className="mb-2 px-2 py-2">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
          1. Dropdown бүлгүүд
        </p>
        <p className="mt-1 text-sm font-bold leading-5 text-slate-600">
          Засах бүлгээ эндээс сонгоно. Сонгосон мөр илүү тод ногооноор
          ялгарна.
        </p>
      </div>

      <div className="space-y-2">
        {headings.map((heading, index) => {
          const active = heading.id === activeHeadingId;
          return (
            <button
              key={heading.id}
              type="button"
              onClick={() => onSelect(heading.id)}
              className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-emerald-500 bg-emerald-100 shadow-sm ring-2 ring-emerald-200"
                  : "border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-white"
              }`}
            >
              <GripVertical
                className={`h-4 w-4 shrink-0 ${
                  active ? "text-emerald-700" : "text-slate-400"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-900">
                  {heading.title || `Гарчиг #${index + 1}`}
                </span>
                <span className="mt-0.5 block text-xs font-bold text-slate-500">
                  {getHrMaterials(heading).length} материал
                </span>
              </span>
              {active && (
                <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase text-white">
                  Сонгосон
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
