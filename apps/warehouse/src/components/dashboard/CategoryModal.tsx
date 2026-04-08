"use client";

import { X, Layers } from "lucide-react";
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
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50"
                  style={{ paddingLeft: `${12 + cat.level * 20}px` }}
                >
                  <div className="flex items-center gap-2.5">
                    {cat.icon ? (
                      <span className="text-base">{cat.icon}</span>
                    ) : (
                      <Layers className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="text-sm font-medium text-slate-700">
                      {cat.name}
                    </span>
                  </div>
                  <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                    {cat._count.products}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
