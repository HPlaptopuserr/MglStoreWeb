"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, Folder, FolderOpen } from "lucide-react";
import type { CategoryLevel, WarehouseCategory } from "./category.types";

type CategoryParentNavigatorProps = {
  categories: WarehouseCategory[];
  level: CategoryLevel;
  parentId: string;
  onChange: (parentId: string) => void;
};

function CategoryOption({
  category,
  selected,
  opened,
  onClick,
}: {
  category: WarehouseCategory;
  selected: boolean;
  opened?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        selected
          ? "border-blue-500 bg-blue-600 text-white shadow-sm"
          : opened
            ? "border-blue-200 bg-blue-50 text-blue-800"
            : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      {opened ? (
        <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
      ) : (
        <Folder
          className={`h-4 w-4 shrink-0 ${selected ? "text-blue-100" : "text-amber-500"}`}
        />
      )}
      <span className="min-w-0 flex-1 truncate">{category.name}</span>
      {selected ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      )}
    </button>
  );
}

export function CategoryParentNavigator({
  categories,
  level,
  parentId,
  onChange,
}: CategoryParentNavigatorProps) {
  const roots = categories.filter((category) => category.level === 0);
  const selectedParent = categories.find((category) => category.id === parentId);
  const [selectedRootId, setSelectedRootId] = useState(
    level === 1 ? parentId : selectedParent?.parentId || "",
  );
  const children = categories.filter(
    (category) => category.level === 1 && category.parentId === selectedRootId,
  );

  useEffect(() => {
    if (level === 1) {
      setSelectedRootId(parentId);
      return;
    }
    if (selectedParent?.parentId) {
      setSelectedRootId(selectedParent.parentId);
    }
  }, [level, parentId, selectedParent?.parentId]);

  if (level === 0) {
    return (
      <div className="rounded-xl border border-dashed border-blue-200 bg-white/70 px-4 py-3">
        <p className="text-xs font-semibold text-blue-800">
          Шинэ үндсэн ангилал хамгийн дээд түвшинд нэмэгдэнэ.
        </p>
      </div>
    );
  }

  const selectRoot = (categoryId: string) => {
    setSelectedRootId(categoryId);
    onChange(level === 1 ? categoryId : "");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`grid ${level === 2 ? "md:grid-cols-2" : "grid-cols-1"}`}>
        <section className="border-slate-200 p-3 md:border-r">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              1. Үндсэн ангилал
            </p>
            <span className="text-[10px] font-semibold text-slate-400">
              {roots.length} ангилал
            </span>
          </div>
          <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
            {roots.map((category) => (
              <CategoryOption
                key={category.id}
                category={category}
                selected={level === 1 && parentId === category.id}
                opened={level === 2 && selectedRootId === category.id}
                onClick={() => selectRoot(category.id)}
              />
            ))}
          </div>
        </section>

        {level === 2 && (
          <section className="border-t border-slate-200 p-3 md:border-t-0">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                2. Дэд ангилал
              </p>
              {selectedRootId && (
                <span className="max-w-40 truncate text-[10px] font-semibold text-blue-600">
                  {roots.find((item) => item.id === selectedRootId)?.name}
                </span>
              )}
            </div>
            {!selectedRootId ? (
              <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-xs font-semibold text-slate-400">
                Эхлээд үндсэн ангилал сонгоно уу
              </div>
            ) : children.length === 0 ? (
              <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 text-center text-xs font-semibold text-amber-700">
                Энэ үндсэн ангилалд дэд ангилал алга
              </div>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {children.map((category) => (
                  <CategoryOption
                    key={category.id}
                    category={category}
                    selected={parentId === category.id}
                    onClick={() => onChange(category.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
