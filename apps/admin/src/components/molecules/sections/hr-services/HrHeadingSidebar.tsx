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
    <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 px-2 py-2">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
          Гол гарчгууд
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Web dropdown-ийн зүүн талд харагдана
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
                  ? "border-emerald-200 bg-emerald-50 shadow-sm"
                  : "border-transparent hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-900">
                  {heading.title || `Гарчиг #${index + 1}`}
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                  {getHrMaterials(heading).length} материал
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
