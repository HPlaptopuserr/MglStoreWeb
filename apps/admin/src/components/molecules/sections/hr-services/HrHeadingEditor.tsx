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
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Гол гарчиг
            </span>
            <input
              value={heading.title}
              onChange={(event) => onUpdate({ title: event.target.value })}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-black text-slate-950 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              placeholder="Жишээ: HR бичиг баримт"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Богино тайлбар
            </span>
            <input
              value={heading.description}
              onChange={(event) =>
                onUpdate({ description: event.target.value })
              }
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              placeholder="Энэ гарчигт ямар материалууд багтахыг товч бичнэ"
            />
          </label>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onMove(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label="Дээш"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label="Доош"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
            aria-label="Устгах"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-950">
            Холбогдох файл / материалууд
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Нэр, тайлбар, үнэ, PDF холбоос болон маягтыг нэг card дээр давхар
            удирдана.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <span className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-500">
            {formCount} маягттай
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
