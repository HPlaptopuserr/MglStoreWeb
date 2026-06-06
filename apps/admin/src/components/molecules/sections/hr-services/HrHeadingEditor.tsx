"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ServiceCategory } from "@/lib/sections/types";

type HrHeadingEditorProps = {
  heading: ServiceCategory;
  formCount: number;
  onUpdate: (patch: Partial<ServiceCategory>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onAddMaterial: () => void;
};

export function HrHeadingEditor({
  heading,
  formCount,
  onUpdate,
  onMove,
  onRemove,
  onAddMaterial,
}: HrHeadingEditorProps) {
  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-amber-700">
              2. Гарчиг засах
            </span>
            <input
              value={heading.title}
              onChange={(event) => onUpdate({ title: event.target.value })}
              className="mt-2 h-12 w-full rounded-xl border border-amber-300 bg-white px-4 text-base font-black text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              placeholder="Жишээ: HR бичиг баримт"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600">
              Богино тайлбар
            </span>
            <input
              value={heading.description}
              onChange={(event) =>
                onUpdate({ description: event.target.value })
              }
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              placeholder="Энэ гарчигт ямар материалууд багтахыг товч бичнэ"
            />
          </label>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onMove(-1)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100"
            aria-label="Дээш"
          >
            <ArrowUp className="h-4 w-4" />
            Дээш
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100"
            aria-label="Доош"
          >
            <ArrowDown className="h-4 w-4" />
            Доош
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100"
            aria-label="Устгах"
          >
            <Trash2 className="h-4 w-4" />
            Устгах
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950">
            3. Материал cards
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Нэг материал = web dropdown дээр харагдах нэг card. PDF болон
            маягтыг тус тусад нь ялгаж холбоно.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <span className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-100 px-3 text-xs font-black text-amber-800 ring-1 ring-amber-200">
            Маягттай: {formCount}
          </span>
          <button
            type="button"
            onClick={onAddMaterial}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Материал нэмэх
          </button>
        </div>
      </div>
    </>
  );
}
