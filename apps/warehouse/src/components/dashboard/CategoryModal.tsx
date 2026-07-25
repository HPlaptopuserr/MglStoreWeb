"use client";

import { Layers, X } from "lucide-react";
import {
  CATEGORY_LEVEL_LABELS,
  categoryPath,
} from "@/features/categories";
import type { CategoryWithCount } from "./types";

export function CategoryModal({
  categories,
  onClose,
}: {
  categories: CategoryWithCount[];
  onClose: () => void;
}) {
  const totalProducts = categories.reduce(
    (sum, c) => sum + c._count.products,
    0,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="mx-4 max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Бүртгэлтэй ангилалууд
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Нийт {categories.length} ангилал · {totalProducts} бараа
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Ангилал бүртгэгдээгүй байна
            </p>
          ) : (
            <div className="space-y-1.5">
              {categories.map((category) => {
                const path = categoryPath(category.id, categories);
                const level = Math.min(category.level, 2) as 0 | 1 | 2;

                return (
                  <div
                    key={category.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-slate-100 hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm"
                        aria-hidden="true"
                      >
                        {category.icon || (
                          <Layers className="h-4 w-4 text-slate-400" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700">
                          {category.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {CATEGORY_LEVEL_LABELS[level]} ·{" "}
                          {path.map((item) => item.name).join(" / ")}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex min-w-[2rem] shrink-0 items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                      {category._count.products}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
