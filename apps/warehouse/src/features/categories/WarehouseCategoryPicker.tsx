"use client";

import { useState } from "react";
import {
  ChevronRight,
  FolderPlus,
  Layers3,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { CategoryLevel } from "./category.types";
import {
  CATEGORY_LEVEL_LABELS,
  categoryPath,
} from "./category.utils";
import { useWarehouseCategories } from "./useWarehouseCategories";
import { WarehouseCategoryTree } from "./WarehouseCategoryTree";
import { CategoryParentNavigator } from "./CategoryParentNavigator";

type WarehouseCategoryPickerProps = {
  value: string;
  onChange: (categoryId: string) => void;
  label?: string;
  required?: boolean;
  allowCreate?: boolean;
};

export function WarehouseCategoryPicker({
  value,
  onChange,
  label = "Ангилал",
  required = false,
  allowCreate = true,
}: WarehouseCategoryPickerProps) {
  const { categories, loading, error, refresh, createCategory } =
    useWarehouseCategories();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState<CategoryLevel>(0);
  const [parentId, setParentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const selectedPath = value ? categoryPath(value, categories) : [];

  const selectLevel = (level: CategoryLevel) => {
    setNewLevel(level);
    setParentId("");
    setCreateError("");
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError("Ангиллын нэр оруулна уу");
      return;
    }
    if (newLevel > 0 && !parentId) {
      setCreateError("Эцэг ангилал сонгоно уу");
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      const created = await createCategory({
        name: newName,
        level: newLevel,
        parentId: newLevel === 0 ? null : parentId,
      });
      onChange(created.id);
      setNewName("");
      setParentId("");
      setNewLevel(0);
      setShowCreate(false);
      setSearch("");
    } catch (caught: unknown) {
      setCreateError(
        caught instanceof Error ? caught.message : "Ангилал үүсгэсэнгүй",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {allowCreate && (
          <button
            type="button"
            onClick={() => setShowCreate((current) => !current)}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {showCreate ? <X className="h-3.5 w-3.5" /> : <FolderPlus className="h-3.5 w-3.5" />}
            {showCreate ? "Хаах" : "Ангилал нэмэх"}
          </button>
        )}
      </div>

      {selectedPath.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
          <Layers3 className="mr-1 h-4 w-4" aria-hidden="true" />
          {selectedPath.map((category, index) => (
            <span key={category.id} className="inline-flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3 text-blue-400" />}
              {category.name}
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-auto rounded-md p-1 text-blue-500 hover:bg-blue-100 hover:text-blue-700"
            aria-label="Ангилал цуцлах"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {showCreate && (
        <div className="space-y-3 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-bold text-slate-900">Шинэ ангилал</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Үндсэн, дэд эсвэл гурав дахь түвшний sub ангилал үүсгэнэ.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Ангиллын түвшин">
            {([0, 1, 2] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => selectLevel(level)}
                className={`rounded-xl border px-2 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  newLevel === level
                    ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                {level === 0 ? "Үндсэн" : level === 1 ? "Дэд" : "Sub"}
              </button>
            ))}
          </div>
          {newLevel > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">
                Шинэ ангилал нэмэх байрлалаа шат дараалан сонгоно уу
              </p>
              <CategoryParentNavigator
                categories={categories}
                level={newLevel}
                parentId={parentId}
                onChange={setParentId}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {CATEGORY_LEVEL_LABELS[newLevel]} нэр
            </label>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Жишээ: Ухаалаг утас"
              maxLength={120}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {createError && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {createError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Болих
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newName.trim() || (newLevel > 0 && !parentId)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Үүсгээд сонгох
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Нэр эсвэл ангиллын замаар хайх..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Хайлтыг цэвэрлэх"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-inner">
        {loading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Ангилал ачааллаж байна
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-sm font-semibold text-rose-600">{error}</p>
            <button type="button" onClick={() => void refresh()} className="mt-2 text-xs font-bold text-blue-600 hover:underline">
              Дахин ачаалах
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">Ангилал олдсонгүй</div>
        ) : (
          <WarehouseCategoryTree
            categories={categories}
            value={value}
            search={search}
            onChange={onChange}
          />
        )}
      </div>
    </div>
  );
}
