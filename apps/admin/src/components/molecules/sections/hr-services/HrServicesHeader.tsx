"use client";

import { Check, Loader2, Plus, Save, Users } from "lucide-react";

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">
              HR content
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Хүний нөөцийн dropdown контент
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Гол гарчиг үүсгээд, тухайн гарчигт харьяалагдах файл, дэлгэрэнгүй
              мэдээлэл болон шаардлагатай маягтыг давхар холбоно.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onAddHeading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
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
