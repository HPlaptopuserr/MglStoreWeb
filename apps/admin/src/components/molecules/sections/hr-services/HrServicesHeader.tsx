"use client";

import { Check, FileText, Loader2, Plus, Save, Users } from "lucide-react";

type HrServicesHeaderProps = {
  onAddHeading: () => void;
  onSave: () => Promise<boolean | void> | boolean | void;
  saving?: boolean;
  saved?: boolean;
};

export function HrServicesHeader({
  onAddHeading,
  onSave,
  saving,
  saved,
}: HrServicesHeaderProps) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
              HR services content
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              HR үйлчилгээний контент
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Гол гарчиг, материал, маягт болон дэлгэрэнгүй тайлбар нь web дээрх
              HR үйлчилгээний хэсэгт харагдана.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
              <FileText className="h-3.5 w-3.5" />
              HR үйлчилгээний материал admin-аас удирдана
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onAddHeading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100"
          >
            <Plus className="h-4 w-4" />
            Гол гарчиг нэмэх
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition disabled:opacity-70 ${
              saved ? "bg-emerald-500" : "bg-slate-950 hover:bg-emerald-600"
            }`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Хадгалж байна" : saved ? "Хадгалагдсан" : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}
