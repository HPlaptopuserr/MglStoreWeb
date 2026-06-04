"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { ServiceCategory } from "@/lib/sections/types";
import { getHrMaterials } from "@/components/organisms/sections/hr-services/hr-services-utils";

type HrHeadingOrderListProps = {
  headings: ServiceCategory[];
  activeHeadingId?: string;
  onSelect: (headingId: string) => void;
  onMove: (headingId: string, direction: -1 | 1) => void;
};

export function HrHeadingOrderList({
  headings,
  activeHeadingId,
  onSelect,
  onMove,
}: HrHeadingOrderListProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-950">
            Гол гарчигуудын дараалал
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Энэ дарааллаар web dropdown-ийн зүүн талд харагдана.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
          {headings.length} гарчиг
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {headings.map((heading, index) => (
          <article
            key={`sort-${heading.id}`}
            className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${
              heading.id === activeHeadingId
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-500 ring-1 ring-slate-200">
              {String(index + 1).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => onSelect(heading.id)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm font-black text-slate-900">
                {heading.title || `Гарчиг #${index + 1}`}
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                {getHrMaterials(heading).length} материал
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onMove(heading.id, -1)}
                disabled={index === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Дээш"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMove(heading.id, 1)}
                disabled={index === headings.length - 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Доош"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
